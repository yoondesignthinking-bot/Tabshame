/*
 * storage.js
 *
 * Thin wrapper around chrome.storage.local with promise-friendly API.
 *
 * Schema (chrome.storage.local):
 *   tabs:        { [tabId: string]: TabRecord }   — currently-open tracked tabs
 *   closedStats: { count, lastClosedAt }          — closed-tab analytics, summary only
 *   settings:    { trackIncognito, weeklyAlarmHour, monthlyAlarmHour }
 *   isPremium:   boolean                          — Premium hook, always false in v1
 *   featureFlags:{ [flagName]: boolean }          — Premium feature gating (unused in v1)
 *
 * TabRecord:
 *   { id, url, hostname, title, openedAt, lastActiveAt, source }
 *   source = "imported" | "live"  (imported = was open at install time)
 */

(function () {
  const ROOT = (globalThis.TabShame = globalThis.TabShame || {});

  const KEYS = {
    TABS: "tabs",
    CLOSED_STATS: "closedStats",
    SETTINGS: "settings",
    IS_PREMIUM: "isPremium",
    FEATURE_FLAGS: "featureFlags",
    INSTALLED_AT: "installedAt",
    SESSION_HISTORY: "sessionHistory",
    SAVED_SESSIONS: "savedSessions",
    LAST_ARCHETYPE_ID: "lastArchetypeId",
    // Tracks the Chrome tab-group IDs TabShame has created, keyed by
    // archetypeId then windowId. Shape: { [archetypeId]: { [windowId]: groupId } }.
    // Lets us rename/recolor an existing group on a re-diagnosis instead of
    // spawning a new one every transition.
    PERSONA_GROUPS: "personaGroups"
  };

  // Capped at 60 days so the storage footprint stays small. Even 60 entries
  // of {ts, tabCount, score, archetypeId} weighs in well under 10KB.
  const SESSION_HISTORY_MAX = 60;

  const DEFAULT_SETTINGS = {
    trackIncognito: false,
    weeklyAlarmHour: 9,
    monthlyAlarmHour: 9,
    // When true, the moment a user crosses a persona's 5-tab threshold,
    // background.js auto-groups the triggering tabs in Chrome's tab-strip
    // with the persona name + emoji + an accent color. Designed to make
    // the diagnosis visible without the user ever opening the popup.
    autoGroupPersonaTabs: true,
    // How the override new-tab page renders.
    //   "full" — persona showcase: greeting, tab count, roast, CTAs
    //   "lite" — mostly blank page with a small persona chip top-right
    // The manifest unconditionally overrides chrome://newtab; this setting
    // only controls the contents of that page. Chrome shows its own
    // "keep / revert" banner the first time the override takes effect,
    // which is the user's true opt-out.
    newTabMode: "full",
  };

  const DEFAULT_FEATURE_FLAGS = {
    // Reserved for v1.1. All Premium gates read from this object via
    // featureFlags[name]. v1 ships everything ungated; flags evaluated
    // through isFeatureEnabled() always return false because isPremium
    // is forced false until license validation lands.
    advancedRoasts: false,
    historicalReports: false,    // 4-week trend / sparkline (collected, not displayed)
    customCardThemes: false,     // seasonal / Wrapped variants for share cards
    smartCleanupByAge: false,    // close tabs older than N days
    smartCleanupByDomain: false, // close all tabs from a single domain
    sessionSaveBeforeClose: false // archive a session snapshot pre-cleanup
  };

  function get(key) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(key, (items) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(items[key]);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  function set(obj) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set(obj, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  function remove(key) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.remove(key, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // ─── tab records ───────────────────────────────────────────────────────
  async function getAllTabs() {
    return (await get(KEYS.TABS)) || {};
  }

  async function getTabsArray() {
    const tabs = await getAllTabs();
    return Object.values(tabs);
  }

  async function upsertTab(record) {
    const tabs = await getAllTabs();
    tabs[String(record.id)] = record;
    await set({ [KEYS.TABS]: tabs });
  }

  async function upsertManyTabs(records) {
    const tabs = await getAllTabs();
    for (const r of records) tabs[String(r.id)] = r;
    await set({ [KEYS.TABS]: tabs });
  }

  async function removeTab(tabId) {
    const tabs = await getAllTabs();
    delete tabs[String(tabId)];
    await set({ [KEYS.TABS]: tabs });
  }

  async function pruneToOpenTabIds(openTabIds) {
    // Sweep stale records — anything in storage that isn't currently open.
    // Useful after a browser restart when chrome.tabs.onRemoved didn't fire.
    const open = new Set(openTabIds.map(String));
    const tabs = await getAllTabs();
    let changed = false;
    for (const id of Object.keys(tabs)) {
      if (!open.has(id)) {
        delete tabs[id];
        changed = true;
      }
    }
    if (changed) await set({ [KEYS.TABS]: tabs });
  }

  // ─── closed-tab analytics (count only — no URLs stored) ────────────────
  async function bumpClosedStats() {
    const stats = (await get(KEYS.CLOSED_STATS)) || { count: 0, lastClosedAt: 0 };
    stats.count += 1;
    stats.lastClosedAt = Date.now();
    await set({ [KEYS.CLOSED_STATS]: stats });
  }

  async function getClosedStats() {
    return (await get(KEYS.CLOSED_STATS)) || { count: 0, lastClosedAt: 0 };
  }

  // ─── settings ─────────────────────────────────────────────────────────
  async function getSettings() {
    const s = (await get(KEYS.SETTINGS)) || {};
    return { ...DEFAULT_SETTINGS, ...s };
  }

  async function updateSettings(patch) {
    const current = await getSettings();
    await set({ [KEYS.SETTINGS]: { ...current, ...patch } });
  }

  // ─── Premium hooks (inert in v1) ──────────────────────────────────────
  async function isPremium() {
    const v = await get(KEYS.IS_PREMIUM);
    return v === true;
  }

  async function getFeatureFlags() {
    const flags = (await get(KEYS.FEATURE_FLAGS)) || {};
    return { ...DEFAULT_FEATURE_FLAGS, ...flags };
  }

  async function isFeatureEnabled(name) {
    if (await isPremium()) {
      const flags = await getFeatureFlags();
      return Boolean(flags[name]);
    }
    return false;
  }

  // ─── install bookkeeping ──────────────────────────────────────────────
  async function getInstalledAt() {
    return (await get(KEYS.INSTALLED_AT)) || 0;
  }

  async function setInstalledAtIfMissing() {
    const existing = await getInstalledAt();
    if (!existing) await set({ [KEYS.INSTALLED_AT]: Date.now() });
  }

  // ─── session history (for future trend feature) ───────────────────────
  // We record one snapshot per local-day (YYYY-MM-DD). Repeated calls on
  // the same day overwrite that day's entry — no need for the user to
  // open the popup at a specific time. The Pro trend view will read this.
  async function recordSessionSnapshot(snapshot) {
    const list = (await get(KEYS.SESSION_HISTORY)) || [];
    const dateKey = ymd(new Date(snapshot.ts || Date.now()));
    const filtered = list.filter((s) => s.dateKey !== dateKey);
    filtered.push({
      dateKey,
      ts: snapshot.ts || Date.now(),
      tabCount: snapshot.tabCount || 0,
      score: snapshot.score || 0,
      archetypeId: snapshot.archetypeId || null,
      duplicateCount: snapshot.duplicateCount || 0
    });
    // Trim to most recent N days.
    filtered.sort((a, b) => a.ts - b.ts);
    while (filtered.length > SESSION_HISTORY_MAX) filtered.shift();
    await set({ [KEYS.SESSION_HISTORY]: filtered });
  }

  async function getSessionHistory() {
    return (await get(KEYS.SESSION_HISTORY)) || [];
  }

  function ymd(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // ─── saved sessions (for future Pro "save before closing" feature) ────
  // Stored locally only. Each entry is a list of {url, title, hostname}.
  async function saveSession(label, tabRecords) {
    const sessions = (await get(KEYS.SAVED_SESSIONS)) || [];
    sessions.push({
      id: `s_${Date.now()}`,
      label: label || `Session · ${new Date().toLocaleString()}`,
      savedAt: Date.now(),
      tabs: tabRecords.map((t) => ({ url: t.url, title: t.title, hostname: t.hostname }))
    });
    // Cap at 20 saved sessions.
    while (sessions.length > 20) sessions.shift();
    await set({ [KEYS.SAVED_SESSIONS]: sessions });
  }

  async function getSavedSessions() {
    return (await get(KEYS.SAVED_SESSIONS)) || [];
  }

  // ─── archetype transition tracking ────────────────────────────────────
  // Stores the most-recently-diagnosed archetypeId. background.js compares
  // this against each fresh diagnosis to detect the casual_hoarder →
  // specific transition that fires the "you've earned an archetype" notif.
  // Returns undefined on first run so the notification doesn't fire on
  // initial install.
  async function getLastArchetypeId() {
    return await get(KEYS.LAST_ARCHETYPE_ID);
  }

  async function setLastArchetypeId(archetypeId) {
    await set({ [KEYS.LAST_ARCHETYPE_ID]: archetypeId });
  }

  // ─── persona tab-group tracking ───────────────────────────────────────
  // Maps archetypeId → { [windowId]: groupId } so background.js can reuse
  // an existing Chrome tab group across re-diagnoses instead of spawning
  // a new one each time. Pruning happens lazily on read — if the stored
  // groupId no longer exists in Chrome, the caller handles the error.
  async function getPersonaGroups() {
    return (await get(KEYS.PERSONA_GROUPS)) || {};
  }

  async function setPersonaGroupId(archetypeId, windowId, groupId) {
    const groups = await getPersonaGroups();
    const entry = groups[archetypeId] || {};
    entry[String(windowId)] = groupId;
    groups[archetypeId] = entry;
    await set({ [KEYS.PERSONA_GROUPS]: groups });
  }

  async function clearPersonaGroupId(archetypeId, windowId) {
    const groups = await getPersonaGroups();
    if (!groups[archetypeId]) return;
    delete groups[archetypeId][String(windowId)];
    if (Object.keys(groups[archetypeId]).length === 0) delete groups[archetypeId];
    await set({ [KEYS.PERSONA_GROUPS]: groups });
  }

  async function clearAllPersonaGroups() {
    await set({ [KEYS.PERSONA_GROUPS]: {} });
  }

  ROOT.storage = {
    KEYS,
    get,
    set,
    remove,
    getAllTabs,
    getTabsArray,
    upsertTab,
    upsertManyTabs,
    removeTab,
    pruneToOpenTabIds,
    bumpClosedStats,
    getClosedStats,
    getSettings,
    updateSettings,
    isPremium,
    getFeatureFlags,
    isFeatureEnabled,
    getInstalledAt,
    setInstalledAtIfMissing,
    recordSessionSnapshot,
    getSessionHistory,
    saveSession,
    getSavedSessions,
    getLastArchetypeId,
    setLastArchetypeId,
    getPersonaGroups,
    setPersonaGroupId,
    clearPersonaGroupId,
    clearAllPersonaGroups
  };
})();
