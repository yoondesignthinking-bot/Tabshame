/*
 * report.js
 *
 * Full Wrapped report page.
 *
 * Flow:
 *   1. Ask the service worker for a fresh report.
 *   2. Animate the score from 0 → final.
 *   3. Render archetype reveal, stat tiles, top-domains list.
 *   4. Render two card previews (Twitter + Instagram) onto in-page canvases.
 *   5. Wire up the download buttons to call card-renderer for full-res PNGs.
 */

(function () {
  const T = globalThis.TabShame;

  const els = {
    dateLabel: document.getElementById("dateLabel"),
    bigCount: document.getElementById("bigCount"),
    bigTabsLabel: document.getElementById("bigTabsLabel"),
    bigScoreBand: document.getElementById("bigScoreBand"),
    heroRoast: document.getElementById("heroRoast"),
    revealEmoji: document.getElementById("revealEmoji"),
    revealName: document.getElementById("revealName"),
    revealDesc: document.getElementById("revealDesc"),
    tileDupes: document.getElementById("tileDupes"),
    tileHaunt: document.getElementById("tileHaunt"),
    tileHauntCount: document.getElementById("tileHauntCount"),
    domainList: document.getElementById("domainList"),
    previewTwitter: document.getElementById("previewTwitter"),
    previewInstagram: document.getElementById("previewInstagram"),
    previewStory: document.getElementById("previewStory"),
    closeDupesReport: document.getElementById("closeDupesReport"),
    closeDupesReportSub: document.getElementById("closeDupesReportSub")
  };

  let currentReport = null;

  async function init() {
    els.dateLabel.textContent = formatDate(new Date()).toUpperCase();

    let report;
    try {
      report = await getReport();
    } catch (e) {
      els.bigScoreBand.textContent =
        "Couldn't reach the service worker. Reload the extension at chrome://extensions and try again.";
      return;
    }
    currentReport = report;

    renderHero(report);
    renderReveal(report);
    renderTiles(report);
    renderDomains(report);
    renderPreviews(report);
    wireDownloads();
    wireCleanup();
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

  function getReport() {
    return sendMessage({ type: "GET_REPORT" }).then((r) => r.report);
  }

  // ─── render ───────────────────────────────────────────────────────────
  function renderHero(report) {
    const tabCount = report.stats.tabCount;
    els.bigTabsLabel.textContent = tabCount === 1 ? "TAB OPEN" : "TABS OPEN";
    els.bigScoreBand.textContent = report.band.label;
    els.heroRoast.textContent = `"${report.roast}"`;
    animateCount(els.bigCount, 0, tabCount, 1400);
  }

  function renderReveal(report) {
    els.revealEmoji.textContent = report.archetype.emoji;
    els.revealName.textContent = report.archetype.name;
    els.revealDesc.textContent = report.archetype.description;
  }

  function renderTiles(report) {
    els.tileDupes.textContent = String(report.stats.duplicateCount);
    const top = (report.stats.topDomains || [])[0];
    if (top) {
      els.tileHaunt.textContent = top.domain;
      els.tileHauntCount.textContent = `${top.count} TAB${top.count === 1 ? "" : "S"}`;
    } else {
      els.tileHaunt.textContent = "—";
      els.tileHauntCount.textContent = "no haunts yet";
    }
  }

  function renderDomains(report) {
    const top = report.stats.topDomains || [];
    els.domainList.innerHTML = "";
    if (top.length === 0) {
      const li = document.createElement("li");
      li.innerHTML = '<span class="domain-name">no haunts yet</span><span class="domain-count">0</span>';
      els.domainList.appendChild(li);
      return;
    }
    for (const d of top) {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.className = "domain-name";
      name.textContent = d.domain;
      const meta = document.createElement("span");
      meta.className = "domain-meta";
      const count = document.createElement("span");
      count.className = "domain-count";
      count.textContent = `${d.count} TAB${d.count === 1 ? "" : "S"}`;
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "domain-close";
      closeBtn.setAttribute(
        "aria-label",
        `Close all ${d.count} tab${d.count === 1 ? "" : "s"} from ${d.domain}`
      );
      closeBtn.title = `Close all ${d.count} tab${d.count === 1 ? "" : "s"} from ${d.domain}`;
      closeBtn.textContent = "×";
      closeBtn.addEventListener("click", () => closeDomainTabs(d.domain, closeBtn, count));
      meta.appendChild(count);
      meta.appendChild(closeBtn);
      li.appendChild(name);
      li.appendChild(meta);
      els.domainList.appendChild(li);
    }
  }

  // Closes all open tabs from one haunt. Optimistically swaps the row into
  // a "Closing…" state, fires the message, then re-fetches the report and
  // re-renders so the row either disappears (haunt empty) or shows the new
  // smaller count. Pinned tabs are preserved on the background side.
  async function closeDomainTabs(domain, btn, countEl) {
    if (!domain) return;
    const originalCount = countEl.textContent;
    btn.disabled = true;
    btn.textContent = "…";
    countEl.textContent = "closing";
    try {
      const res = await sendMessage({ type: "CLOSE_ALL_FROM_DOMAIN", domain });
      const closed = (res && res.closed) || 0;
      const fresh = await getReport();
      currentReport = fresh;
      renderHero(fresh);
      renderTiles(fresh);
      renderDomains(fresh);
      await renderPreviews(fresh);
      updateCleanupState();
      // Brief flash so the user sees something landed even if the row
      // disappears from the list immediately.
      if (closed === 0) {
        countEl.textContent = "nothing to close";
        setTimeout(() => (countEl.textContent = originalCount), 1400);
      }
    } catch (e) {
      btn.disabled = false;
      btn.textContent = "×";
      countEl.textContent = "failed";
      setTimeout(() => (countEl.textContent = originalCount), 1600);
    }
  }

  // The previews on-page are at scaled-down dimensions. We render to a
  // full-size offscreen canvas via the renderer, then drawImage into the
  // visible canvas to keep crispness without re-implementing the layout.
  async function renderPreviews(report) {
    await drawPreview(els.previewTwitter, report, "twitter");
    await drawPreview(els.previewInstagram, report, "instagram");
    await drawPreview(els.previewStory, report, "story");
  }

  async function drawPreview(canvas, report, format) {
    const blob = await T.cardRenderer.renderCard(report, format);
    const bitmap = await blobToImage(blob);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }

  function blobToImage(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  function wireDownloads() {
    document.querySelectorAll(".btn[data-format]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!currentReport) return;
        const format = btn.getAttribute("data-format");
        const original = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Rendering…";
        try {
          await T.cardRenderer.downloadCard(currentReport, format);
        } finally {
          btn.disabled = false;
          btn.textContent = original;
        }
      });
    });
  }

  function wireCleanup() {
    updateCleanupState();
    els.closeDupesReport.addEventListener("click", async () => {
      if (!currentReport || currentReport.stats.duplicateCount === 0) return;
      els.closeDupesReport.disabled = true;
      const originalSub = els.closeDupesReportSub.textContent;
      els.closeDupesReportSub.textContent = "Closing…";
      try {
        const res = await sendMessage({ type: "CLOSE_DUPLICATES" });
        const closed = (res && res.closed) || 0;
        els.closeDupesReportSub.textContent = `Closed ${closed} extra${closed === 1 ? "" : "s"} ✓`;
        const fresh = await getReport();
        currentReport = fresh;
        renderHero(fresh);
        renderTiles(fresh);
        renderDomains(fresh);
        await renderPreviews(fresh);
        setTimeout(() => {
          els.closeDupesReportSub.textContent = originalSub;
          updateCleanupState();
        }, 1600);
      } catch (e) {
        els.closeDupesReportSub.textContent = "Couldn't close (try again)";
        setTimeout(() => {
          els.closeDupesReportSub.textContent = originalSub;
          updateCleanupState();
        }, 1800);
      }
    });
  }

  function updateCleanupState() {
    if (!currentReport) return;
    const hasDupes = currentReport.stats.duplicateCount > 0;
    els.closeDupesReport.disabled = !hasDupes;
    els.closeDupesReport.title = hasDupes
      ? `Close ${currentReport.stats.duplicateCount} same-site tab(s) — keeps one per site`
      : "Nothing to close — every open tab is from a different site";
  }

  // ─── helpers ──────────────────────────────────────────────────────────
  function animateCount(el, from, to, durationMs) {
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / durationMs);
      // Ease-out cubic for that satisfying settle.
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(from + (to - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function formatDate(d) {
    return d.toLocaleString(undefined, { month: "long", year: "numeric" });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
