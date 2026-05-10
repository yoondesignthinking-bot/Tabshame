/*
 * background.js — TabShame service worker
 *
 * Lifecycle responsibilities:
 *   - On install: import currently-open tabs as openedAt = "imported" sentinel
 *   - On startup: prune stale records, refresh from current tab list
 *   - On tabs.onCreated / onUpdated / onRemoved: keep storage in sync
 *   - On alarms: build weekly + monthly reports, fire notifications
 *   - On notification click: open report.html
 *   - On message from popup/report: serve current diagnosis
 *
 * Service workers can be killed at any time; never hold state in module
 * scope — always read from chrome.storage.
 */

importScripts(
  "lib/storage.js",
  "lib/domain-rules.js",
  "lib/archetype-engine.js",
  "lib/shame-engine.js"
);

const T = globalThis.TabShame;

const ALARMS = {
  WEEKLY: "tabshame_weekly",
  MONTHLY: "tabshame_monthly",
  // Debounced re-check for the duplicate-gate transition. Re-arming this
  // alarm by name overwrites the previous schedule, so a burst of tab
  // activity collapses to a single delayed diagnosis run.
  TRANSITION_CHECK: "tabshame_transition_check"
};

// Debounce for the transition-check alarm. 0.1 minutes (6 seconds) gives
// fast feedback during testing in unpacked / dev builds. Chrome MV3
// production silently floors any value below 0.5 minutes (30 seconds), so
// when published to the Web Store the effective minimum is 30s. Either way
// the user-visible behaviour is: notification fires within 6–30s of opening
// the 5th persona-relevant tab, depending on build mode.
const TRANSITION_DEBOUNCE_MIN = 0.1;

// ─── install + startup ───────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
  await T.storage.setInstalledAtIfMissing();
  await importExistingTabs();
  await scheduleAlarms();

  if (details.reason === "install") {
    // Initialize the transition baseline to casual_hoarder. Without this,
    // the welcome page's first diagnosis writes lastArchetypeId silently
    // (because notifyArchetypeTransition returns early when last is null),
    // and any subsequent identical diagnosis would be a no-op transition.
    // Forcing the baseline guarantees the first time the user crosses any
    // persona's threshold, the notification fires.
    await T.storage.setLastArchetypeId("casual_hoarder");

    // Friendly welcome — opens the report once so the first diagnosis is visible.
    chrome.tabs.create({ url: chrome.runtime.getURL("report/report.html?welcome=1") });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await reconcileWithOpenTabs();
  await scheduleAlarms();
});

async function importExistingTabs() {
  const tabs = await queryAllTabs();
  const now = Date.now();
  const records = tabs.map((t) => normalizeTab(t, now, "imported"));
  await T.storage.upsertManyTabs(records);
}

async function reconcileWithOpenTabs() {
  const tabs = await queryAllTabs();
  const ids = tabs.map((t) => t.id);
  await T.storage.pruneToOpenTabIds(ids);

  // Add any tabs that aren't in storage yet.
  const stored = await T.storage.getAllTabs();
  const now = Date.now();
  const missing = tabs.filter((t) => !stored[String(t.id)]);
  if (missing.length) {
    const records = missing.map((t) => normalizeTab(t, now, "live"));
    await T.storage.upsertManyTabs(records);
  }
}

function queryAllTabs() {
  return new Promise((resolve) => {
    // Don't pass `currentWindow` — we want all windows.
    chrome.tabs.query({}, (tabs) => resolve(tabs || []));
  });
}

function normalizeTab(tab, now, source) {
  return {
    id: tab.id,
    url: tab.url || tab.pendingUrl || "",
    hostname: T.archetypeEngine.hostnameOf(tab.url || tab.pendingUrl || ""),
    title: tab.title || "",
    openedAt: now,
    lastActiveAt: now,
    source: source || "live",
    incognito: Boolean(tab.incognito)
  };
}

// ─── tab lifecycle ───────────────────────────────────────────────────────
chrome.tabs.onCreated.addListener(async (tab) => {
  if (await shouldSkipTab(tab)) return;
  await T.storage.upsertTab(normalizeTab(tab, Date.now(), "live"));
  // Run the diagnosis inline. chrome.alarms below 30s isn't reliable in MV3,
  // and waiting that long for a "you've crossed the threshold" notification
  // makes the feature feel broken. The diagnose function is microsecond-fast;
  // there's no reason to defer it.
  runTransitionCheckThrottled();
  scheduleTransitionCheck(); // Belt-and-braces backup (fires within ~30s).
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (await shouldSkipTab(tab)) return;
  // Only update on URL or title change to avoid heavy writes on every status tick.
  if (!changeInfo.url && !changeInfo.title) return;

  const stored = await T.storage.getAllTabs();
  const existing = stored[String(tabId)];
  const now = Date.now();
  const record = {
    ...(existing || {}),
    id: tabId,
    url: tab.url || (existing && existing.url) || "",
    hostname: T.archetypeEngine.hostnameOf(tab.url || (existing && existing.url) || ""),
    title: tab.title || (existing && existing.title) || "",
    openedAt: (existing && existing.openedAt) || now,
    lastActiveAt: now,
    source: (existing && existing.source) || "live",
    incognito: Boolean(tab.incognito)
  };
  await T.storage.upsertTab(record);
  runTransitionCheckThrottled();
  scheduleTransitionCheck();
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const stored = await T.storage.getAllTabs();
  const existing = stored[String(tabId)];
  if (!existing) return;
  existing.lastActiveAt = Date.now();
  await T.storage.upsertTab(existing);
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await T.storage.removeTab(tabId);
  await T.storage.bumpClosedStats();
  // We don't fire a transition notif on demotion (specific → casual_hoarder),
  // but we still want lastArchetypeId in storage to track the new state so
  // a subsequent re-promotion fires correctly.
  runTransitionCheckThrottled();
  scheduleTransitionCheck();
});

async function shouldSkipTab(tab) {
  if (!tab) return true;
  if (tab.incognito) {
    const settings = await T.storage.getSettings();
    if (!settings.trackIncognito) return true;
  }
  // Skip Chrome internal pages — no useful signal and they spam storage.
  const url = tab.url || tab.pendingUrl || "";
  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url === ""
  ) {
    return true;
  }
  return false;
}

// ─── alarms (weekly + monthly reports) ───────────────────────────────────
async function scheduleAlarms() {
  const settings = await T.storage.getSettings();
  await scheduleWeekly(settings.weeklyAlarmHour ?? 9);
  await scheduleMonthly(settings.monthlyAlarmHour ?? 9);
}

async function scheduleWeekly(hour) {
  const next = nextMondayAtHour(hour);
  chrome.alarms.create(ALARMS.WEEKLY, {
    when: next.getTime(),
    periodInMinutes: 60 * 24 * 7
  });
}

async function scheduleMonthly(hour) {
  // chrome.alarms can't do "first of month" natively — re-arm after each fire.
  const next = nextFirstOfMonthAtHour(hour);
  chrome.alarms.create(ALARMS.MONTHLY, { when: next.getTime() });
}

function nextMondayAtHour(hour) {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const daysUntilMon = (1 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMon);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function nextFirstOfMonthAtHour(hour) {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARMS.WEEKLY) {
    await fireReportNotification("weekly");
  } else if (alarm.name === ALARMS.MONTHLY) {
    await fireReportNotification("monthly");
    // Re-arm — chrome.alarms doesn't know about calendar months.
    const settings = await T.storage.getSettings();
    await scheduleMonthly(settings.monthlyAlarmHour ?? 9);
  } else if (alarm.name === ALARMS.TRANSITION_CHECK) {
    // buildLiveReport runs the diagnosis and internally calls
    // notifyArchetypeTransition, which compares with the last stored
    // archetypeId and fires the casual_hoarder → specific notif if needed.
    try {
      await buildLiveReport();
    } catch (e) {
      console.warn("[TabShame] transition check failed:", e);
    }
  }
});

function scheduleTransitionCheck() {
  // Re-arming overwrites the existing alarm with the same name, so a burst
  // of tab events results in a single deferred check. Catch errors because
  // chrome.alarms can throw if the service worker is mid-shutdown.
  try {
    chrome.alarms.create(ALARMS.TRANSITION_CHECK, {
      delayInMinutes: TRANSITION_DEBOUNCE_MIN
    });
  } catch (e) {
    // Non-fatal — the next tab event will reschedule, or buildLiveReport
    // on next popup open will run the check anyway.
  }
}

// Inline throttled diagnosis runner. The throttle is ~1.5 seconds, which
// debounces a session-restore burst (50 tabs in 200ms) without making the
// user wait for a notification when they manually open 5 tabs.
//
// Module-level state. Service workers can be killed and restarted, in which
// case `inlineCheckLastRunAt` resets to 0 — that's fine; the next event
// runs the check immediately.
let inlineCheckLastRunAt = 0;
let inlineCheckPending = false;
const INLINE_CHECK_THROTTLE_MS = 1500;

function runTransitionCheckThrottled() {
  const now = Date.now();
  const sinceLast = now - inlineCheckLastRunAt;
  if (sinceLast >= INLINE_CHECK_THROTTLE_MS) {
    inlineCheckLastRunAt = now;
    runTransitionCheckNow();
  } else if (!inlineCheckPending) {
    // Burst of events within the throttle window — schedule one trailing
    // run so the final state is checked.
    inlineCheckPending = true;
    setTimeout(() => {
      inlineCheckPending = false;
      inlineCheckLastRunAt = Date.now();
      runTransitionCheckNow();
    }, INLINE_CHECK_THROTTLE_MS - sinceLast);
  }
}

async function runTransitionCheckNow() {
  try {
    await buildLiveReport();
  } catch (e) {
    console.warn("[TabShame] inline transition check failed:", e);
  }
}

// Compares the freshly-diagnosed archetype against the stored last one and,
// on a casual_hoarder → specific transition, fires a Chrome notification
// AND records the transition so the popup can show an in-app banner the
// next time it opens. Always updates the stored id (so subsequent diagnoses
// are correctly compared) and always returns the decision details for
// debugging visibility in DevTools.
async function notifyArchetypeTransition(report) {
  const current = report.archetype.id;
  const last = await T.storage.getLastArchetypeId();
  await T.storage.setLastArchetypeId(current);

  let reason = null;
  if (last === undefined || last === null) reason = "first_run";
  else if (current === last) reason = "no_change";
  else if (last !== "casual_hoarder") reason = "not_from_casual";
  else if (current === "casual_hoarder") reason = "to_casual";

  // Clear the badge if the user has dropped back to casual_hoarder.
  // (Notification still suppressed — demotion shouldn't pop a notif — but
  // the toolbar should reflect that they're no longer "in" a persona.)
  if (current === "casual_hoarder" && last !== "casual_hoarder") {
    clearTransitionBadge();
  }

  if (reason) {
    console.log(`[TabShame] transition skipped (${reason}):`, { last, current });
    return { fired: false, reason, last, current };
  }

  console.log(`[TabShame] transition fired: ${last} → ${current}`);

  // Record the transition event so the popup can render an in-app banner
  // (more reliable than OS notifications, which can be silenced by the OS).
  // The popup clears `seen` when it shows the banner.
  await T.storage.set({
    pendingTransition: {
      from: last,
      to: current,
      toName: report.archetype.name,
      toEmoji: report.archetype.emoji,
      at: Date.now(),
      seen: false
    }
  });

  // Toolbar badge — visible regardless of OS notification permission. The
  // badge is the most reliable signal. Cleared when the popup opens.
  try {
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#e63946" });
    chrome.action.setBadgeTextColor({ color: "#ffffff" });
    chrome.action.setTitle({
      title: `TabShame · You're ${report.archetype.name} ${report.archetype.emoji}`
    });
  } catch (e) {
    console.warn("[TabShame] badge update failed:", e);
  }

  try {
    chrome.notifications.create(`tabshame_transition_${Date.now()}`, {
      type: "basic",
      // Relative path works for the extension's own pages; getURL is also
      // valid but some Chrome builds reject chrome-extension:// URLs in
      // notifications. Plain relative path is the most compatible form.
      iconUrl: "assets/icon-128.png",
      title: "TabShame · You've earned your archetype",
      message: `${report.archetype.emoji}  You're ${report.archetype.name}. Tap to see your card.`,
      priority: 2,
      requireInteraction: true
    });
  } catch (e) {
    console.warn("[TabShame] notification create failed:", e);
  }

  return { fired: true, last, current };
}

function clearTransitionBadge() {
  try {
    chrome.action.setBadgeText({ text: "" });
    chrome.action.setTitle({ title: "TabShame" });
  } catch (e) {
    // Non-fatal.
  }
}

async function fireReportNotification(kind) {
  const message =
    kind === "monthly"
      ? "Your TabShame Wrapped is ready. We've prepared a card."
      : "Your weekly shame is ready 👀";

  chrome.notifications.create(`tabshame_${kind}_${Date.now()}`, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("assets/icon-128.png"),
    title: kind === "monthly" ? "TabShame Wrapped" : "TabShame Weekly",
    message,
    priority: 1
  });
}

chrome.notifications.onClicked.addListener((notificationId) => {
  let url;
  if (notificationId.includes("transition")) {
    url = chrome.runtime.getURL("report/report.html?kind=transition");
  } else {
    const kind = notificationId.includes("monthly") ? "monthly" : "weekly";
    url = chrome.runtime.getURL(`report/report.html?kind=${kind}`);
  }
  chrome.tabs.create({ url });
  chrome.notifications.clear(notificationId);
});

// ─── messaging — popup/report ask the worker for a fresh diagnosis ──────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "GET_REPORT") {
    buildLiveReport()
      .then((report) => sendResponse({ ok: true, report }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // keep the channel open for async response
  }
  if (msg && msg.type === "RECONCILE") {
    reconcileWithOpenTabs()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  if (msg && msg.type === "TRIGGER_REPORT_NOTIFICATION") {
    // Test hook — lets the popup manually trigger an alarm for QA.
    fireReportNotification(msg.kind || "weekly").then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg && msg.type === "CLOSE_DUPLICATES") {
    closeDuplicateTabs()
      .then((closed) => sendResponse({ ok: true, closed }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  if (msg && msg.type === "CLOSE_BY_DOMAIN") {
    cleanupGated("smartCleanupByDomain", () => closeTabsByDomain(msg.domain))
      .then((res) => sendResponse({ ok: true, ...res }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  if (msg && msg.type === "CLOSE_OLDER_THAN") {
    cleanupGated("smartCleanupByAge", () => closeTabsOlderThan(msg.days))
      .then((res) => sendResponse({ ok: true, ...res }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  if (msg && msg.type === "SAVE_SESSION_BEFORE_CLEANUP") {
    cleanupGated("sessionSaveBeforeClose", () => saveCurrentSession(msg.label))
      .then((res) => sendResponse({ ok: true, ...res }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  if (msg && msg.type === "GET_AND_CLEAR_PENDING_TRANSITION") {
    // Popup reads this on load. Returns the transition object only on the
    // FIRST read after the transition fired; subsequent reads return null.
    // Also clears the toolbar badge — the user is now looking at the popup,
    // so the indicator has done its job.
    (async () => {
      clearTransitionBadge();
      const pending = await T.storage.get("pendingTransition");
      if (!pending || pending.seen) {
        sendResponse({ ok: true, transition: null });
        return;
      }
      const snapshot = { ...pending, seen: false };
      await T.storage.set({ pendingTransition: { ...pending, seen: true } });
      sendResponse({ ok: true, transition: snapshot });
    })();
    return true;
  }
  if (msg && msg.type === "DEBUG_RUN_TRANSITION_CHECK") {
    // Debug hook — bypasses the alarm so you can verify the path from
    // the service-worker DevTools console. Run:
    //   chrome.runtime.sendMessage({ type: "DEBUG_RUN_TRANSITION_CHECK" }, console.log);
    buildLiveReport()
      .then((report) => sendResponse({ ok: true, archetypeId: report.archetype.id }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  return false;
});

// ─── cleanup actions ─────────────────────────────────────────────────────
// Free: close exact-URL duplicates. Keeps the most recently active tab from
// each duplicate group. Returns the number of tabs actually closed.
async function closeDuplicateTabs() {
  await reconcileWithOpenTabs();
  const tabs = await T.storage.getTabsArray();
  const groups = new Map();
  for (const t of tabs) {
    if (!t.url) continue;
    if (!groups.has(t.url)) groups.set(t.url, []);
    groups.get(t.url).push(t);
  }

  const idsToClose = [];
  for (const [, group] of groups) {
    if (group.length < 2) continue;
    // Keep the most recently active. Close the rest.
    group.sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0));
    for (let i = 1; i < group.length; i++) idsToClose.push(group[i].id);
  }

  if (idsToClose.length === 0) return 0;

  await new Promise((resolve) => {
    chrome.tabs.remove(idsToClose, () => {
      // Even if some IDs fail (tab already closed), the callback fires.
      resolve();
    });
  });

  // chrome.tabs.onRemoved will sweep storage; reconcile to be safe.
  await reconcileWithOpenTabs();
  return idsToClose.length;
}

// Pro hooks (always blocked in v1 because isPremium = false). Implemented
// fully so that flipping isPremium is the only thing needed to unlock.
async function cleanupGated(featureFlagName, action) {
  const enabled = await T.storage.isFeatureEnabled(featureFlagName);
  if (!enabled) {
    return { gated: true, message: "This is a TabShame Pro feature." };
  }
  return await action();
}

async function closeTabsByDomain(domain) {
  if (!domain) throw new Error("domain required");
  const tabs = await T.storage.getTabsArray();
  const target = String(domain).replace(/^www\./, "");
  const idsToClose = tabs
    .filter((t) => {
      const h = (t.hostname || "").replace(/^www\./, "");
      return h === target || h.endsWith("." + target);
    })
    .map((t) => t.id);
  if (idsToClose.length === 0) return { closed: 0 };
  await new Promise((resolve) => chrome.tabs.remove(idsToClose, () => resolve()));
  await reconcileWithOpenTabs();
  return { closed: idsToClose.length };
}

async function closeTabsOlderThan(days) {
  if (!days || days < 1) throw new Error("days must be >= 1");
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const tabs = await T.storage.getTabsArray();
  const idsToClose = tabs
    .filter((t) => (t.openedAt || Date.now()) < cutoff)
    .map((t) => t.id);
  if (idsToClose.length === 0) return { closed: 0 };
  await new Promise((resolve) => chrome.tabs.remove(idsToClose, () => resolve()));
  await reconcileWithOpenTabs();
  return { closed: idsToClose.length };
}

async function saveCurrentSession(label) {
  const tabs = await T.storage.getTabsArray();
  await T.storage.saveSession(label, tabs);
  return { saved: tabs.length };
}

async function buildLiveReport() {
  // Always reconcile first so we don't show stale tabs after a restart.
  await reconcileWithOpenTabs();
  const tabs = await T.storage.getTabsArray();
  const diagnosis = T.archetypeEngine.diagnose(tabs);
  const report = T.shameEngine.buildReport(diagnosis, tabs);

  // Record one snapshot per local-day. This data is collected unconditionally
  // (it's the user's own data, never transmitted) so when the Pro trend view
  // ships, returning users have history immediately. recordSessionSnapshot
  // de-dupes per day, so writing on every popup open is safe.
  T.storage
    .recordSessionSnapshot({
      ts: Date.now(),
      tabCount: report.stats.tabCount,
      score: report.score,
      archetypeId: report.archetype.id,
      duplicateCount: report.stats.duplicateCount
    })
    .catch((e) => console.warn("[TabShame] snapshot failed:", e));

  // Premium hook (inert in v1) — historical reports / sparkline would attach
  // the last 4 weeks of history to the report payload here.
  if (await T.storage.isFeatureEnabled("historicalReports")) {
    report.history = await T.storage.getSessionHistory();
  }

  // Detect casual_hoarder → specific transition and fire a notification.
  // Don't await on the popup's critical path — let it run in the background
  // so popup load isn't blocked by the storage write.
  notifyArchetypeTransition(report).catch((e) =>
    console.warn("[TabShame] transition notify failed:", e)
  );

  return report;
}
