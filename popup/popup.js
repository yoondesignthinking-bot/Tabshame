/*
 * popup.js
 *
 * Wires the toolbar popup to the engines. Asks the service worker for a
 * fresh report (which reconciles tabs first), renders, hooks up actions.
 *
 * Two views are mounted in the same DOM:
 *   - data-view="main"      — diagnosis hero + extras block + 2 actions
 *   - data-view="settings"  — auto-group toggle, close-persona-groups,
 *                              new-tab mode, recent/bookmark permissions
 * Switching is in-popup (no nav). Settings is reached via the gear icon
 * in the main view's header.
 */

(function () {
  const T = globalThis.TabShame;

  const els = {
    body: document.querySelector("body"),
    card: document.querySelector(".card"),
    // main view
    mainView: document.querySelector('[data-view="main"]'),
    settingsView: document.querySelector('[data-view="settings"]'),
    openSettings: document.getElementById("openSettings"),
    closeSettings: document.getElementById("closeSettings"),
    tabCount: document.getElementById("tabCount"),
    tabsLabel: document.getElementById("tabsLabel"),
    scoreBand: document.getElementById("scoreBand"),
    archetypeName: document.getElementById("archetypeName"),
    archetypeEmoji: document.getElementById("archetypeEmoji"),
    archetypeDesc: document.getElementById("archetypeDesc"),
    tileDupes: document.getElementById("tileDupes"),
    tileHaunt: document.getElementById("tileHaunt"),
    tileHauntCount: document.getElementById("tileHauntCount"),
    roast: document.getElementById("roast"),
    openReport: document.getElementById("openReport"),
    closeDupes: document.getElementById("closeDupes"),
    closeDupesLabel: document.getElementById("closeDupesLabel"),
    openTabFinder: document.getElementById("openTabFinder"),
    // settings view
    autoGroupToggle: document.getElementById("autoGroupToggle"),
    newTabModeSelect: document.getElementById("newTabModeSelect"),
    closePersonaGroups: document.getElementById("closePersonaGroups"),
    closeGroupsSub: document.getElementById("closeGroupsSub")
  };

  let currentReport = null;

  async function init() {
    try {
      const report = await getReport();
      currentReport = report;
      render(report);
      // Still drain the pending-transition record on every popup open so
      // the worker's "seen" bookkeeping stays accurate. The transition
      // banner UI was removed in Jun 2026, but the in-app diagnosis
      // change is still surfaced via the freshly-rendered persona.
      drainPendingTransition();
    } catch (e) {
      renderError(e);
    } finally {
      els.card.removeAttribute("aria-busy");
    }

    els.openReport.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("report/report.html") });
      window.close();
    });

    // Find-a-tab opens in a new tab — closes the popup so the user
    // doesn't see a tiny floating popup behind the new finder.
    els.openTabFinder.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("tabfinder/tabfinder.html") });
      window.close();
    });

    // Close extras — ask the worker to collapse same-site tabs to one
    // per hostname (pinned tabs preserved). Refreshes the popup state
    // so the merged extras block reflects the new counts.
    els.closeDupes.addEventListener("click", async () => {
      if (!currentReport || currentReport.stats.duplicateCount === 0) return;
      els.closeDupes.disabled = true;
      const original = els.closeDupesLabel.textContent;
      els.closeDupesLabel.textContent = "Closing…";
      try {
        const res = await sendMessage({ type: "CLOSE_DUPLICATES" });
        const closed = (res && res.closed) || 0;
        els.closeDupesLabel.textContent = `Closed ${closed} ✓`;
        const fresh = await getReport();
        currentReport = fresh;
        render(fresh);
        setTimeout(() => {
          els.closeDupesLabel.textContent = original;
          updateActionStates();
        }, 1400);
      } catch (_e) {
        els.closeDupesLabel.textContent = "Try again";
        setTimeout(() => {
          els.closeDupesLabel.textContent = original;
          updateActionStates();
        }, 1800);
      }
    });

    // View switching — settings is a sibling section inside the same card.
    els.openSettings.addEventListener("click", () => showView("settings"));
    els.closeSettings.addEventListener("click", () => showView("main"));

    initAutoGroupToggle();
    initNewTabModeSelect();
    initShortcutsPermButtons();
    initClosePersonaGroups();
  }

  function showView(name) {
    els.mainView.hidden = name !== "main";
    els.settingsView.hidden = name !== "settings";
  }

  async function initAutoGroupToggle() {
    if (!els.autoGroupToggle) return;
    try {
      const settings = await T.storage.getSettings();
      els.autoGroupToggle.checked = settings.autoGroupPersonaTabs !== false;
    } catch (_e) {
      els.autoGroupToggle.checked = true;
    }
    els.autoGroupToggle.addEventListener("change", async () => {
      try {
        await T.storage.updateSettings({
          autoGroupPersonaTabs: els.autoGroupToggle.checked
        });
        if (els.autoGroupToggle.checked) {
          await getReport().catch(() => {});
        }
      } catch (e) {
        console.warn("[TabShame] failed to persist autoGroup setting:", e);
      }
    });
  }

  async function initNewTabModeSelect() {
    if (!els.newTabModeSelect) return;
    try {
      const settings = await T.storage.getSettings();
      els.newTabModeSelect.value = settings.newTabMode === "lite" ? "lite" : "full";
    } catch (_e) {
      els.newTabModeSelect.value = "full";
    }
    els.newTabModeSelect.addEventListener("change", async () => {
      try {
        await T.storage.updateSettings({ newTabMode: els.newTabModeSelect.value });
      } catch (e) {
        console.warn("[TabShame] failed to persist newTabMode setting:", e);
      }
    });
  }

  // "Close persona groups" — closes every tab inside every tracked
  // persona group. Useful as a single bulk action after a focus session.
  function initClosePersonaGroups() {
    if (!els.closePersonaGroups) return;
    els.closePersonaGroups.addEventListener("click", async () => {
      els.closePersonaGroups.disabled = true;
      const originalSub = els.closeGroupsSub.textContent;
      els.closeGroupsSub.textContent = "Closing…";
      try {
        const res = await sendMessage({ type: "CLOSE_PERSONA_GROUPS" });
        const closed = (res && res.closed) || 0;
        const groupCount = (res && res.groupCount) || 0;
        if (closed === 0) {
          els.closeGroupsSub.textContent = "No persona groups to close.";
        } else {
          els.closeGroupsSub.textContent =
            `Closed ${closed} tab${closed === 1 ? "" : "s"} across ${groupCount} group${groupCount === 1 ? "" : "s"} ✓`;
        }
      } catch (_e) {
        els.closeGroupsSub.textContent = "Couldn't close — try again.";
      } finally {
        setTimeout(() => {
          els.closeGroupsSub.textContent = originalSub;
          els.closePersonaGroups.disabled = false;
        }, 2000);
      }
    });
  }

  // New-tab shortcuts run on two independent optional permission sets so
  // users can opt into Recent without committing to Bookmarks (or vice
  // versa). Each row's button reflects live grant state via
  // chrome.permissions.contains() and routes clicks through .request /
  // .remove. The data behind these permissions is used only to render
  // the new-tab tiles — never for the persona diagnosis or share cards.
  const PERMS_FOR_KIND = {
    recent: { permissions: ["topSites", "favicon"] },
    bookmarks: { permissions: ["bookmarks", "favicon"] }
  };
  const OTHER_KIND = { recent: "bookmarks", bookmarks: "recent" };

  async function initShortcutsPermButtons() {
    const buttons = document.querySelectorAll("[data-perm-btn]");
    if (!buttons.length) return;

    async function refresh(kind) {
      const btn = document.querySelector(`[data-perm-btn="${kind}"]`);
      const label = document.querySelector(`[data-perm-btn-label="${kind}"]`);
      if (!btn || !label) return;
      const granted = await permContains(PERMS_FOR_KIND[kind]);
      if (granted) {
        label.textContent = "Remove";
        btn.dataset.state = "remove";
        btn.title = `Remove ${kind === "recent" ? "Recent" : "Bookmark"} tiles + revoke permission`;
      } else {
        label.textContent = "Add";
        btn.dataset.state = "add";
        btn.title = `Add ${kind === "recent" ? "Recent sites" : "Bookmark Bar"} tiles to the new-tab page`;
      }
    }

    async function refreshAll() {
      await Promise.all([refresh("recent"), refresh("bookmarks")]);
    }

    await refreshAll();

    buttons.forEach((btn) => {
      const kind = btn.dataset.permBtn;
      btn.addEventListener("click", () => onClick(kind, btn));
    });

    async function onClick(kind, btn) {
      const isAdding = btn.dataset.state !== "remove";
      try {
        if (isAdding) {
          await new Promise((resolve, reject) => {
            chrome.permissions.request(PERMS_FOR_KIND[kind], (ok) => {
              if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
              else resolve(ok);
            });
          });
        } else {
          const primaryPerm = PERMS_FOR_KIND[kind].permissions
            .filter((p) => p !== "favicon");
          await new Promise((resolve, reject) => {
            chrome.permissions.remove({ permissions: primaryPerm }, (ok) => {
              if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
              else resolve(ok);
            });
          });
          const otherGranted = await permContains(PERMS_FOR_KIND[OTHER_KIND[kind]]);
          if (!otherGranted) {
            await new Promise((resolve, reject) => {
              chrome.permissions.remove({ permissions: ["favicon"] }, (ok) => {
                if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                else resolve(ok);
              });
            });
          }
        }
      } catch (e) {
        console.warn(`[TabShame] perm change failed (${kind}):`, e);
      }
      await refresh(kind);
    }

    try {
      chrome.permissions.onAdded.addListener(refreshAll);
      chrome.permissions.onRemoved.addListener(refreshAll);
    } catch (_e) { /* non-fatal */ }
  }

  function permContains(perms) {
    return new Promise((resolve) => {
      try {
        chrome.permissions.contains(perms, (ok) => resolve(Boolean(ok)));
      } catch (_e) { resolve(false); }
    });
  }

  function sendMessage(msg) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        if (!response || !response.ok) return reject(new Error(response && response.error));
        resolve(response);
      });
    });
  }

  async function drainPendingTransition() {
    try {
      await sendMessage({ type: "GET_AND_CLEAR_PENDING_TRANSITION" });
    } catch (_e) { /* non-fatal */ }
  }

  function updateActionStates() {
    if (!currentReport) return;
    const hasDupes = currentReport.stats.duplicateCount > 0;
    els.closeDupes.disabled = !hasDupes;
    els.closeDupes.title = hasDupes
      ? `Close ${currentReport.stats.duplicateCount} same-site tab(s) — keeps one per site`
      : "Nothing to close — every open tab is from a different site";
  }

  function getReport() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "GET_REPORT" }, (response) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        if (!response || !response.ok) return reject(new Error(response && response.error));
        resolve(response.report);
      });
    });
  }

  function render(report) {
    const tabCount = report.stats.tabCount;
    els.tabCount.textContent = String(tabCount);
    els.tabsLabel.textContent = tabCount === 1 ? "tab open" : "tabs open";
    // Band label sits as italic commentary — "feral", "ambitious", etc.
    els.scoreBand.textContent = report.band.label;
    els.archetypeName.textContent = report.archetype.name;
    els.archetypeEmoji.textContent = report.archetype.emoji;
    els.archetypeDesc.textContent = report.archetype.description;
    els.tileDupes.textContent = String(report.stats.duplicateCount);

    const top = (report.stats.topDomains || [])[0];
    if (top) {
      els.tileHaunt.textContent = top.domain;
      els.tileHauntCount.textContent = `${top.count} tab${top.count === 1 ? "" : "s"}`;
    } else {
      els.tileHaunt.textContent = "—";
      els.tileHauntCount.textContent = "no haunts yet";
    }

    els.roast.textContent = `"${report.roast}"`;
    updateActionStates();
  }

  function renderError(e) {
    els.tabCount.textContent = "—";
    els.tabsLabel.textContent = "tabs open";
    els.scoreBand.textContent = "couldn't read tabs";
    els.archetypeName.textContent = "Diagnosis unavailable";
    els.archetypeDesc.textContent =
      "TabShame couldn't reach the service worker. Try reloading the extension at chrome://extensions.";
    els.roast.textContent = `"${String(e && e.message ? e.message : e)}"`;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
