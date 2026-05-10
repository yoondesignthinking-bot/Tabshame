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
    upgrade: document.getElementById("upgrade")
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
