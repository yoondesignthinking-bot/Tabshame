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

// Keyboard shortcut → open the tab finder page. Manifest declares
// Cmd+Shift+F (Mac) / Ctrl+Shift+F (other). Re-uses an existing finder
// tab if one is already open to avoid stacking duplicates.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-tab-finder") return;
  const finderUrl = chrome.runtime.getURL("tabfinder/tabfinder.html");
  try {
    const existing = await new Promise((r) =>
      chrome.tabs.query({ url: finderUrl }, (t) => r(t || []))
    );
    if (existing.length > 0) {
      const t = existing[0];
      chrome.tabs.update(t.id, { active: true });
      chrome.windows.update(t.windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: finderUrl });
    }
  } catch (e) {
    console.warn("[TabShame] open-tab-finder failed:", e);
  }
});


// Apply the same skip rules used by the live tab-event listeners. Without
// this, the new-tab override page, the report page, chrome://newtab, etc.
// would get tracked as tabs — and their chrome-extension://EXT_ID/...
// hostname (32 lowercase chars) ends up dominating the Top Haunt tile.
function isTrackableUrl(url) {
  if (!url) return false;
  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:")
  ) return false;
  return true;
}

function isTrackableTab(tab) {
  if (!tab) return false;
  return isTrackableUrl(tab.url || tab.pendingUrl || "");
}

// Tracking parameters that almost always vary per click but don't change
// the underlying destination page. We strip these before comparing URLs
// for duplicate detection so "linkedin.com/in/alice opened from search"
// and "…opened from feed" count as the same tab.
const TRACKING_PARAMS = new Set([
  // Universal analytics
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id", "utm_name",
  "fbclid", "gclid", "msclkid", "yclid", "dclid", "wbraid", "gbraid",
  "_ga", "_gl", "mc_cid", "mc_eid", "mc_tc", "_hsenc", "_hsmi",
  "ref", "ref_src", "ref_url", "referrer",
  // LinkedIn
  "lipi", "trk", "trkInfo", "refId", "midToken", "midSig", "originalSubdomain",
  // YouTube share/recommend tracking
  "feature", "si", "pp", "ab_channel",
  // Twitter/X share params
  "s", "t", "cxt", "twclid",
  // GitHub source-context params
  "tab", "source",
  // Generic share IDs
  "share_id", "shareId", "share", "sharer"
]);

/**
 * Normalize a URL for duplicate-detection purposes. Strips known tracking
 * params and the fragment; sorts remaining params for stable comparison.
 * Returns the original string if URL parsing fails (e.g. chrome:// pages
 * that don't parse cleanly in older engines).
 */
function normalizeUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    // Drop tracking params
    const keep = [];
    for (const [k, v] of u.searchParams.entries()) {
      if (!TRACKING_PARAMS.has(k)) keep.push([k, v]);
    }
    // Sort remaining params alphabetically so "?a=1&b=2" and "?b=2&a=1"
    // hash to the same key.
    keep.sort((a, b) => a[0].localeCompare(b[0]));
    const sorted = new URLSearchParams();
    for (const [k, v] of keep) sorted.append(k, v);
    u.search = sorted.toString();
    // Drop the fragment — same page even if anchored differently
    u.hash = "";
    // Trim a trailing slash from the path for stem comparison
    // (e.g. "/foo" and "/foo/" treated equal).
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch (_e) {
    return url;
  }
}

async function importExistingTabs() {
  const tabs = (await queryAllTabs()).filter(isTrackableTab);
  const now = Date.now();
  const records = tabs.map((t) => normalizeTab(t, now, "imported"));
  await T.storage.upsertManyTabs(records);
}

async function reconcileWithOpenTabs() {
  const allOpen = await queryAllTabs();

  // Open AND trackable. Skipping anything chrome:// / chrome-extension://.
  const trackable = allOpen.filter(isTrackableTab);
  const trackableIds = trackable.map((t) => t.id);

  // Prune storage to only trackable open tabs — this also evicts any junk
  // records already in storage from older builds that didn't filter
  // properly (e.g. our own new-tab page leaking in as a tab).
  await T.storage.pruneToOpenTabIds(trackableIds);

  // Add any newly-seen trackable tabs that aren't in storage yet.
  const stored = await T.storage.getAllTabs();
  const now = Date.now();
  const missing = trackable.filter((t) => !stored[String(t.id)]);
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

  // Three distinct change kinds, each with different UI loudness:
  //   "earn"   casual → specific   → loud: OS notif + "!" badge + popup banner
  //   "shift"  specific → specific → quiet: popup banner only (no OS notif)
  //   "demote" specific → casual   → silent: clear badge, reset title
  //   (no change / first_run)      → only tooltip refresh, no banner
  // The "shift" case is new — it handles the "more tabs wins" override
  // moving the user between specific personas without first dropping to
  // casual. Without this case, opening more YouTube tabs while staying a
  // LinkedIn Lurker would silently change the popup but leave the
  // toolbar tooltip stale.

  // (a) ALWAYS keep the toolbar tooltip in sync — cheap, no UX cost.
  try {
    if (current === "casual_hoarder") {
      chrome.action.setTitle({ title: "TabShame" });
    } else {
      chrome.action.setTitle({
        title: `TabShame · You're ${report.archetype.name} ${report.archetype.emoji}`
      });
    }
  } catch (_e) { /* non-fatal */ }

  // (c) Demote case — clear the "!" badge so the toolbar reflects that
  // the user is no longer "in" a specific persona. (Demotions are silent.)
  if (current === "casual_hoarder" && last && last !== "casual_hoarder") {
    clearTransitionBadge();
    return { fired: false, reason: "to_casual", last, current };
  }

  // First diagnosis ever, or no actual change.
  if (last === undefined || last === null) {
    return { fired: false, reason: "first_run", last, current };
  }
  if (current === last) {
    return { fired: false, reason: "no_change", last, current };
  }
  if (current === "casual_hoarder") {
    return { fired: false, reason: "to_casual", last, current };
  }

  // From here, we have either "earn" (casual → specific) or "shift" (specific → specific).
  const kind = last === "casual_hoarder" ? "earn" : "shift";

  // Record the transition event so the popup can render an in-app banner.
  // Same shape for both kinds; popup picks copy based on `from`.
  await T.storage.set({
    pendingTransition: {
      from: last,
      to: current,
      toName: report.archetype.name,
      toEmoji: report.archetype.emoji,
      kind,
      at: Date.now(),
      seen: false
    }
  });

  if (kind === "earn") {
    // Loud first-time alert: badge + OS notification.
    try {
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#e63946" });
      chrome.action.setBadgeTextColor({ color: "#ffffff" });
    } catch (e) {
      console.warn("[TabShame] badge update failed:", e);
    }
    try {
      chrome.notifications.create(`tabshame_transition_${Date.now()}`, {
        type: "basic",
        iconUrl: "assets/icon-128.png",
        title: "TabShame · You've earned your archetype",
        message: `${report.archetype.emoji}  You're ${report.archetype.name}. Tap to see your card.`,
        priority: 2,
        requireInteraction: true
      });
    } catch (e) {
      console.warn("[TabShame] notification create failed:", e);
    }
  } else {
    // Quiet specific → specific shift. No OS notification (would be spam
    // as users tip between personas). Update badge to a subtle dot so the
    // toolbar nudges the user to glance at the popup.
    try {
      chrome.action.setBadgeText({ text: "•" });
      chrome.action.setBadgeBackgroundColor({ color: "#1a1612" });
      chrome.action.setBadgeTextColor({ color: "#ff8966" });
    } catch (e) {
      console.warn("[TabShame] badge update failed:", e);
    }
  }

  return { fired: true, kind, last, current };
}

function clearTransitionBadge() {
  try {
    chrome.action.setBadgeText({ text: "" });
    chrome.action.setTitle({ title: "TabShame" });
  } catch (e) {
    // Non-fatal.
  }
}

// ─── persona tab grouping ───────────────────────────────────────────────
// Uses chrome.tabGroups to bundle the tabs that triggered the user's persona
// into a single titled, colored group at the top of their tab strip. The
// whole point is post-install awareness — the diagnosis becomes visible in
// the browser chrome itself, without the user ever opening the popup.
//
// Idempotent: re-running with the same persona reuses the existing group
// (renames/recolors + adds any new ungrouped matching tabs). Re-running
// with a different persona leaves the old group alone (the user may have
// kept it deliberately) and creates a new one for the new persona.
//
// Non-disruptive: tabs already in a user-made group are left alone. We only
// touch ungrouped tabs and groups we created ourselves.
const CATEGORY_TO_GROUP_COLOR = {
  dev: "blue",
  design: "purple",
  work: "cyan",
  creative: "pink",
  shopping: "orange",
  travel: "cyan",
  study: "yellow",
  finance: "green",
  hobby: "orange",
  lifestyle: "pink",
  modern: "purple",
  elite: "red"
};

function colorForCategory(category) {
  return CATEGORY_TO_GROUP_COLOR[category] || "grey";
}

// Small promise wrappers for chrome.tabGroups (callback-only in MV3).
function tabGroupsGet(groupId) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabGroups.get(groupId, (g) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(g);
      });
    } catch (e) { reject(e); }
  });
}

function tabGroupsUpdate(groupId, props) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabGroups.update(groupId, props, (g) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(g);
      });
    } catch (e) { reject(e); }
  });
}

function tabsGroup(options) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.group(options, (groupId) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(groupId);
      });
    } catch (e) { reject(e); }
  });
}

function tabsUngroup(tabIds) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.ungroup(tabIds, () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve();
      });
    } catch (e) { reject(e); }
  });
}

function tabsQueryByGroupId(groupId) {
  return new Promise((resolve) => {
    try {
      chrome.tabs.query({ groupId: Number(groupId) }, (t) => resolve(t || []));
    } catch (_e) { resolve([]); }
  });
}

// Releases tracked persona groups that no longer reflect the current
// diagnosis. Two release conditions:
//   1. The group's archetypeId is NOT the current one (user changed
//      persona — old group is stale).
//   2. The group has fewer than 2 tabs left (a 1-tab group is just a
//      pill in the tab strip with no grouping value).
// "Release" = ungroup the member tabs (which removes the Chrome group
// when empty) AND clear the entry from storage so we don't try to
// re-attach to a dead groupId next time.
async function releaseStalePersonaGroups(currentArchetypeId) {
  const tracked = await T.storage.getPersonaGroups();
  for (const [archetypeId, byWindow] of Object.entries(tracked || {})) {
    const isOther = archetypeId !== currentArchetypeId;
    for (const [windowId, groupId] of Object.entries(byWindow || {})) {
      let tabsInGroup = [];
      try {
        tabsInGroup = await tabsQueryByGroupId(groupId);
      } catch (_e) {
        // Group might not exist anymore; fall through to storage cleanup.
      }
      const shouldRelease = isOther || tabsInGroup.length < 2;
      if (!shouldRelease) continue;

      if (tabsInGroup.length > 0) {
        try {
          await tabsUngroup(tabsInGroup.map((t) => t.id));
        } catch (e) {
          console.warn(
            `[TabShame] failed to ungroup ${archetypeId}/${windowId}:`, e
          );
        }
      }
      await T.storage.clearPersonaGroupId(archetypeId, windowId).catch(() => {});
    }
  }
}

async function applyPersonaTabGroup(report) {
  if (!report || !report.archetype) return;

  // Settings gate. Users can disable in the popup.
  const settings = await T.storage.getSettings();
  if (!settings.autoGroupPersonaTabs) return;

  const id = report.archetype.id;

  // ─── Cleanup phase ────────────────────────────────────────────────
  // Always run before (and instead of) any create. Releases:
  //   (a) tab groups for archetypes we've moved AWAY from (e.g. user
  //       was Job Hunt, now Casual — the Job Hunt group sits stale in
  //       the tab strip until we ungroup it),
  //   (b) tab groups for the CURRENT archetype that have shrunk below
  //       2 tabs (a 1-tab group is just visual noise — no grouping value).
  // Without this, the Chrome tab-strip pill keeps showing the old
  // persona forever and gets out of sync with the diagnosis.
  await releaseStalePersonaGroups(id);

  // Skip the create phase for catch-alls. Grouping casual_hoarder would
  // scoop every open tab; grouping tab_maximalist would scoop 200+.
  if (!id || id === "casual_hoarder" || id === "tab_maximalist") return;

  // Sanity: chrome.tabGroups should be available with the manifest perm.
  if (!chrome.tabGroups || !chrome.tabs.group) return;

  // Look up the canonical archetype object to read its rules — report.archetype
  // is a denormalized snapshot without `rules`.
  const archetypeObj = (T.ARCHETYPES || []).find((a) => a.archetypeId === id);
  if (!archetypeObj) return;

  // Re-derive matching tab IDs using the pure engine helper, fed from the
  // service worker's stored tab list.
  const storedTabs = await T.storage.getTabsArray();
  const matchedIds = T.archetypeEngine.matchingTabIds(archetypeObj, storedTabs);
  if (matchedIds.length === 0) return;

  // Cross-reference with live chrome.tabs to get current windowId/groupId.
  // The stored records don't carry windowId, and tabs may have moved.
  const liveTabs = await new Promise((r) =>
    chrome.tabs.query({}, (t) => r(t || []))
  );
  const liveById = new Map(liveTabs.map((t) => [t.id, t]));

  // Bucket matched, currently-open tabs by their windowId. chrome.tabs.group
  // requires all tabIds to live in the same window.
  const byWindow = new Map();
  for (const tabId of matchedIds) {
    const live = liveById.get(tabId);
    if (!live) continue;
    if (live.pinned) continue; // grouping pinned tabs is weird; skip.
    if (!byWindow.has(live.windowId)) byWindow.set(live.windowId, []);
    byWindow.get(live.windowId).push(live);
  }
  if (byWindow.size === 0) return;

  const tracked = await T.storage.getPersonaGroups();
  const mine = tracked[id] || {};
  // Chrome truncates tab-group titles fast in the strip — aim for ~12-14
  // visible chars. Each archetype declares an editorial shortName; if
  // missing, we fall back to the full name with the leading "The " stripped
  // ("The YouTube Rabbit-Holer" → "YouTube Rabbit-Holer"). The emoji counts
  // toward visible width, so picking a tight shortName matters.
  const shortLabel =
    archetypeObj.shortName ||
    (report.archetype.name || "").replace(/^The\s+/i, "") ||
    report.archetype.name;
  const title = `${report.archetype.emoji} ${shortLabel}`;
  const color = colorForCategory(report.archetype.category);

  // chrome.tabGroups.TAB_GROUP_ID_NONE is -1, meaning "ungrouped". We only
  // ever move ungrouped tabs (and tabs already in our own group). Tabs in
  // other groups are left alone — we won't disrupt manual organization.
  const UNGROUPED = -1;

  for (const [windowId, windowTabs] of byWindow.entries()) {
    const ourGroupId = mine[String(windowId)];

    // Validate our stored groupId still exists. The user might have
    // dismantled the group in Chrome's UI.
    let ourGroupExists = false;
    if (ourGroupId != null) {
      try {
        await tabGroupsGet(ourGroupId);
        ourGroupExists = true;
      } catch (_e) {
        ourGroupExists = false;
      }
    }

    const ungroupedToAdd = windowTabs
      .filter((t) => t.groupId === UNGROUPED)
      .map((t) => t.id);
    const alreadyInOurGroup = ourGroupExists &&
      windowTabs.some((t) => t.groupId === ourGroupId);

    try {
      if (ourGroupExists) {
        if (ungroupedToAdd.length > 0) {
          await tabsGroup({ tabIds: ungroupedToAdd, groupId: ourGroupId });
        }
        // Refresh the title/color in case the persona snapped to a different
        // archetype (e.g. LinkedIn Lurker → Recruiter Black Hole).
        if (ungroupedToAdd.length > 0 || alreadyInOurGroup) {
          await tabGroupsUpdate(ourGroupId, { title, color });
        }
      } else if (ungroupedToAdd.length > 0) {
        // Group must contain at least one tab on creation.
        const newGroupId = await tabsGroup({
          tabIds: ungroupedToAdd,
          createProperties: { windowId }
        });
        await tabGroupsUpdate(newGroupId, { title, color, collapsed: false });
        await T.storage.setPersonaGroupId(id, windowId, newGroupId);
      } else {
        // No ungrouped matches in this window, no existing group either.
        // Every matching tab is already in some OTHER (user-made) group —
        // intentionally do nothing rather than steal them.
      }
    } catch (e) {
      console.warn("[TabShame] persona group apply failed:", e);
      // If the failure was a stale stored groupId, clear it so the next
      // attempt creates fresh.
      if (ourGroupId != null && !ourGroupExists) {
        await T.storage.clearPersonaGroupId(id, windowId).catch(() => {});
      }
    }
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
  if (msg && msg.type === "CLOSE_ALL_FROM_DOMAIN") {
    // Ungated per-haunt close — fired by the × button next to each row
    // in the report's TOP HAUNTS list. Distinct from CLOSE_BY_DOMAIN
    // (Pro, tracked-subset only); this one operates on ALL open tabs.
    closeAllFromDomain(msg.domain)
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
    // the service-worker DevTools by sending the DEBUG_RUN_TRANSITION_CHECK
    // message to the runtime. No-op for normal users; reaching this
    // requires opening the SW DevTools and crafting the message manually.
    buildLiveReport()
      .then((report) => sendResponse({ ok: true, archetypeId: report.archetype.id }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  return false;
});

// ─── cleanup actions ─────────────────────────────────────────────────────
// Free: collapse same-site tabs down to one. Operates per HOSTNAME (not
// exact URL), so 5 LinkedIn tabs that go to 5 different profiles still
// count as duplicates of each other and the button keeps only one.
// This matches the user's mental model — "I have 5 LinkedIn tabs open"
// reads as a single haunt, regardless of whether each tab is on a
// different page within the site.
//
// Pinned-tab safety: a pinned tab represents an explicit user
// commitment, so we never close one. If a group has any pinned tabs,
// they ALL survive; we only close the unpinned tabs in that group. If
// a group has no pinned tabs, we keep the most relevant unpinned one
// (active beats inactive, then first-encountered) and close the rest.
//
// Returns the number of tabs actually closed.
async function closeDuplicateTabs() {
  const allTabs = await queryAllTabs();
  const groups = collectHostGroups(allTabs);

  const idsToClose = [];
  for (const [, group] of groups) {
    if (group.length < 2) continue;
    const pinned = group.filter((t) => t.pinned);
    const unpinned = group.filter((t) => !t.pinned);
    if (pinned.length > 0) {
      // Pinned tabs already represent "the kept one(s)". Close everything
      // unpinned in the group.
      for (const t of unpinned) idsToClose.push(t.id);
    } else {
      unpinned.sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return 0;
      });
      for (let i = 1; i < unpinned.length; i++) idsToClose.push(unpinned[i].id);
    }
  }

  if (idsToClose.length === 0) return 0;

  await new Promise((resolve) => {
    chrome.tabs.remove(idsToClose, () => {
      // Callback fires even when some IDs already closed — that's fine.
      resolve();
    });
  });

  // Bring our tracked subset back in sync with reality.
  await reconcileWithOpenTabs();
  return idsToClose.length;
}

// Build a hostname → tabs map used by both closeDuplicateTabs and the
// report's "duplicated sites" count. Two tabs end up in the same bucket
// iff they share a hostname after stripping `www.` (case-insensitive).
// Tabs without a parseable URL are skipped — there's nothing meaningful
// to group on.
function collectHostGroups(allTabs) {
  const groups = new Map();
  for (const t of allTabs) {
    const raw = t.url || t.pendingUrl || "";
    if (!raw) continue;
    const h = T.archetypeEngine
      .hostnameOf(raw)
      .replace(/^www\./, "")
      .toLowerCase();
    if (!h) continue;
    if (!groups.has(h)) groups.set(h, []);
    groups.get(h).push(t);
  }
  return groups;
}

// Same arithmetic as closeDuplicateTabs, but returns just a count of
// closeable tabs. Used to populate the "duplicated sites" / "extras"
// surface numbers so they match what the close button will actually do.
function countCloseableExtras(allTabs) {
  const groups = collectHostGroups(allTabs);
  let extras = 0;
  for (const [, group] of groups) {
    if (group.length < 2) continue;
    const pinnedCount = group.filter((t) => t.pinned).length;
    if (pinnedCount > 0) {
      extras += group.length - pinnedCount;
    } else {
      extras += group.length - 1;
    }
  }
  return extras;
}

// Per-haunt close (used by the report's TOP HAUNTS list × button).
// Operates on EVERY open Chrome tab — not the diagnosis-tracked subset —
// so it matches what the user sees in their tab strip. Matches `domain`
// exactly OR any subdomain of it (e.g. `youtube.com` also closes
// `m.youtube.com`). Pinned tabs are preserved so we don't nuke something
// the user explicitly committed to.
async function closeAllFromDomain(domain) {
  if (!domain) throw new Error("domain required");
  const target = String(domain).replace(/^www\./, "").toLowerCase();
  const allTabs = await queryAllTabs();
  const idsToClose = [];
  for (const t of allTabs) {
    if (t.pinned) continue;
    const raw = t.url || t.pendingUrl || "";
    const h = T.archetypeEngine.hostnameOf(raw).replace(/^www\./, "").toLowerCase();
    if (!h) continue;
    if (h === target || h.endsWith("." + target)) idsToClose.push(t.id);
  }
  if (idsToClose.length === 0) return 0;
  await new Promise((resolve) => chrome.tabs.remove(idsToClose, () => resolve()));
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

  // Make the reported tab count + duplicate count match what the user
  // actually SEES in their tab strip — not just the diagnosis-tracked
  // subset. Persona classification still runs on the tracked subset
  // (chrome://, chrome-extension://, incognito are excluded above), but
  // the surface numbers should match Chrome's reality so "5 open · 1
  // closeable" describes the user's actual visible state.
  try {
    const allOpen = await queryAllTabs();
    report.stats.tabCount = allOpen.length;          // ← Chrome's count
    report.stats.diagnosedTabCount = tabs.length;    // tracked subset
    report.stats.skippedCount = Math.max(0, allOpen.length - tabs.length);

    // "Duplicated sites" across ALL open tabs — counted by hostname so
    // 5 LinkedIn profiles on 5 different paths are treated as duplicates
    // of each other. This intentionally matches Close Extras' grouping
    // so the number the user sees ("4 closeable") matches what the
    // button will actually close. Pinned tabs survive that close, so
    // they don't get counted as closeable here either.
    report.stats.duplicateCount = countCloseableExtras(allOpen);

    // Re-compute the score + breakdown against the NEW stats so the
    // band label (e.g. "feral", "ambitious") tracks the actual visible
    // numbers. The score itself + formula are no longer rendered in
    // any UI as of Jun 2026 — but they're still written into the daily
    // snapshot (for the future Pro trend view) and they still drive
    // bandFor(score), so the math has to match.
    if (T.shameEngine && T.shameEngine.computeScoreBreakdown) {
      const bd = T.shameEngine.computeScoreBreakdown(report.stats);
      report.score = bd.total;
      report.breakdown = bd;
      report.band = T.shameEngine.bandFor(bd.total);
    }

    // Persona-specific count: how many tabs match the persona's primary
    // rule (e.g., 8 LinkedIn tabs for The LinkedIn Lurker). Read from
    // the diagnosis's vars — the var name varies per persona but the
    // FIRST var is always the primary rule's matched count. Falls back
    // to undefined for catch-all archetypes that have no primary count.
    const varEntries = Object.entries(diagnosis.vars || {});
    const primaryVar = varEntries.find(([k]) => k !== "tabCount");
    if (primaryVar) {
      report.stats.personaTabCount = primaryVar[1];
      report.stats.personaTabVar = primaryVar[0];
    }
  } catch (_e) {
    report.stats.skippedCount = 0;
    report.stats.diagnosedTabCount = report.stats.tabCount;
  }

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

  // Auto-group the persona's tabs in Chrome's tab strip. Idempotent — safe
  // to call on every diagnosis. Runs detached from the popup's critical path.
  applyPersonaTabGroup(report).catch((e) =>
    console.warn("[TabShame] persona group failed:", e)
  );

  return report;
}
