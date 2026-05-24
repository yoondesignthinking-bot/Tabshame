/*
 * popup.js
 *
 * Wires the toolbar popup to the engines. Asks the service worker for a
 * fresh report (which reconciles tabs first), renders, hooks up actions.
 */

(function () {
  const T = globalThis.TabShame;

  const els = {
    body: document.querySelector("body"),
    card: document.querySelector(".card"),
    unlockBanner: document.getElementById("unlockBanner"),
    unlockEmoji: document.getElementById("unlockEmoji"),
    unlockName: document.getElementById("unlockName"),
    tabCount: document.getElementById("tabCount"),
    tabsLabel: document.getElementById("tabsLabel"),
    scoreBand: document.getElementById("scoreBand"),
    scoreStrong: document.getElementById("scoreStrong"),
    scoreFormula: document.getElementById("scoreFormula"),
    archetypeName: document.getElementById("archetypeName"),
    archetypeEmoji: document.getElementById("archetypeEmoji"),
    archetypeDesc: document.getElementById("archetypeDesc"),
    tileDupes: document.getElementById("tileDupes"),
    tileHaunt: document.getElementById("tileHaunt"),
    tileHauntCount: document.getElementById("tileHauntCount"),
    roast: document.getElementById("roast"),
    dateLabel: document.getElementById("dateLabel"),
    openReport: document.getElementById("openReport"),
    downloadCard: document.getElementById("downloadCard"),
    closeDupes: document.getElementById("closeDupes"),
    closeDupesLabel: document.getElementById("closeDupesLabel"),
    upgrade: document.getElementById("upgrade"),
    autoGroupToggle: document.getElementById("autoGroupToggle"),
    newTabModeSelect: document.getElementById("newTabModeSelect")
  };

  let currentReport = null;

  async function init() {
    els.dateLabel.textContent = formatDate(new Date()).toUpperCase();

    try {
      const report = await getReport();
      currentReport = report;
      render(report);
      // Banner check is non-blocking — popup paints first, banner appears
      // a frame later. Guarantees the popup is responsive even if storage
      // is slow.
      checkUnlockBanner();
    } catch (e) {
      renderError(e);
    } finally {
      els.card.removeAttribute("aria-busy");
    }

    els.openReport.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("report/report.html") });
      window.close();
    });

    els.downloadCard.addEventListener("click", async () => {
      if (!currentReport) return;
      els.downloadCard.disabled = true;
      els.downloadCard.textContent = "Rendering…";
      try {
        await T.cardRenderer.downloadCard(currentReport, "twitter");
      } finally {
        els.downloadCard.disabled = false;
        els.downloadCard.textContent = "Generate share card";
      }
    });

    // Close Duplicates — free tier per audit. Asks the worker to close all
    // but one tab from each group of identical URLs, then re-fetches the report.
    els.closeDupes.addEventListener("click", async () => {
      if (!currentReport || currentReport.stats.duplicateCount === 0) return;
      els.closeDupes.disabled = true;
      const original = els.closeDupesLabel.textContent;
      els.closeDupesLabel.textContent = "Closing…";
      try {
        const res = await sendMessage({ type: "CLOSE_DUPLICATES" });
        const closed = (res && res.closed) || 0;
        els.closeDupesLabel.textContent = `Closed ${closed} dup${closed === 1 ? "" : "s"} ✓`;
        // Refresh the report so the popup reflects the new tab state.
        const fresh = await getReport();
        currentReport = fresh;
        render(fresh);
        setTimeout(() => {
          els.closeDupesLabel.textContent = original;
          updateActionStates();
        }, 1400);
      } catch (e) {
        els.closeDupesLabel.textContent = "Couldn't close (try again)";
        setTimeout(() => {
          els.closeDupesLabel.textContent = original;
          updateActionStates();
        }, 1800);
      }
    });

    // Premium upgrade button is intentionally inert in v1 — see PREMIUM HOOKS.
    els.upgrade.addEventListener("click", (e) => e.preventDefault());

    // Auto-group toggle — reflect stored setting and persist changes.
    initAutoGroupToggle();
    initNewTabModeSelect();
    initShortcutsPermButtons();
  }

  async function initAutoGroupToggle() {
    if (!els.autoGroupToggle) return;
    try {
      const settings = await T.storage.getSettings();
      els.autoGroupToggle.checked = settings.autoGroupPersonaTabs !== false;
    } catch (_e) {
      els.autoGroupToggle.checked = true; // default on if storage unreadable
    }
    els.autoGroupToggle.addEventListener("change", async () => {
      try {
        await T.storage.updateSettings({
          autoGroupPersonaTabs: els.autoGroupToggle.checked
        });
        // If the user just enabled it and they're on a specific persona,
        // re-run the diagnosis so the group gets created immediately.
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
          // Remove the kind-specific permission; keep `favicon` if the
          // other kind still uses it.
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

    // Stay in sync if the user grants/revokes from another surface.
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

  // Pull the pending transition. The worker returns it only on the FIRST
  // read after the transition fired; subsequent reads return null. So if
  // we receive a transition object, it's safe to render the banner.
  async function checkUnlockBanner() {
    let res;
    try {
      res = await sendMessage({ type: "GET_AND_CLEAR_PENDING_TRANSITION" });
    } catch (_e) {
      return;
    }
    const t = res && res.transition;
    if (!t) return;
    els.unlockEmoji.textContent = t.toEmoji || "🎉";
    els.unlockName.textContent = t.toName || "A specific archetype";
    els.unlockBanner.hidden = false;
  }

  function updateActionStates() {
    if (!currentReport) return;
    const hasDupes = currentReport.stats.duplicateCount > 0;
    els.closeDupes.disabled = !hasDupes;
    els.closeDupes.title = hasDupes
      ? `Close ${currentReport.stats.duplicateCount} duplicate tab(s)`
      : "Nothing to close — no duplicates detected";
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
    els.tabsLabel.textContent = tabCount === 1 ? "TAB OPEN" : "TABS OPEN";
    els.scoreBand.textContent = report.band.label;
    els.scoreStrong.textContent = `SHAME SCORE ${report.score}`;
    els.scoreFormula.textContent = report.breakdown.formula;
    els.archetypeName.textContent = report.archetype.name;
    els.archetypeEmoji.textContent = report.archetype.emoji;
    els.archetypeDesc.textContent = report.archetype.description;
    els.tileDupes.textContent = String(report.stats.duplicateCount);

    const top = (report.stats.topDomains || [])[0];
    if (top) {
      els.tileHaunt.textContent = top.domain;
      els.tileHauntCount.textContent = `${top.count} TAB${top.count === 1 ? "" : "S"}`;
    } else {
      els.tileHaunt.textContent = "—";
      els.tileHauntCount.textContent = "no haunts yet";
    }

    els.roast.textContent = `"${report.roast}"`;
    updateActionStates();
  }

  function renderError(e) {
    els.tabCount.textContent = "—";
    els.tabsLabel.textContent = "TABS OPEN";
    els.scoreBand.textContent = "Couldn't read tabs.";
    els.scoreStrong.textContent = "SHAME SCORE —";
    els.scoreFormula.textContent = "";
    els.archetypeName.textContent = "Diagnosis unavailable";
    els.archetypeDesc.textContent =
      "TabShame couldn't reach the service worker. Try reloading the extension at chrome://extensions.";
    els.roast.textContent = `"${String(e && e.message ? e.message : e)}"`;
  }

  function formatDate(d) {
    return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
