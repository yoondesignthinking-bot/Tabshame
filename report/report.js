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
    shareToX: document.getElementById("shareToX"),
    shareToInstagram: document.getElementById("shareToInstagram"),
    shareDirectNote: document.getElementById("shareDirectNote")
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
    wireDirectShare();
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

  // Direct share — the two big CTAs above the per-format download grid.
  //
  // X (Twitter): opens a compose-intent URL in a new tab pre-filled with
  // the diagnosis text. X's intent API does NOT support attaching
  // images, so we trigger a download of the X-sized card first (the
  // user can attach it manually in the compose tab).
  //
  // Instagram: there is no compose intent on the web at all — Instagram
  // is a mobile-app-first surface. The realistic flow is "download the
  // Stories card → user shares from Photos". We download the 1080×1920
  // story card and flash a short note in the share-direct-note line.
  function wireDirectShare() {
    if (els.shareToX) {
      els.shareToX.addEventListener("click", async () => {
        if (!currentReport) return;
        const original = els.shareToX.querySelector("span").textContent;
        els.shareToX.disabled = true;
        els.shareToX.querySelector("span").textContent = "Preparing…";
        try {
          await T.cardRenderer.downloadCard(currentReport, "twitter");
          const url = buildXComposeUrl(currentReport);
          chrome.tabs.create({ url });
          els.shareToX.querySelector("span").textContent = "Opened ✓";
        } catch (_e) {
          els.shareToX.querySelector("span").textContent = "Try again";
        } finally {
          setTimeout(() => {
            els.shareToX.disabled = false;
            els.shareToX.querySelector("span").textContent = original;
          }, 1600);
        }
      });
    }

    if (els.shareToInstagram) {
      els.shareToInstagram.addEventListener("click", async () => {
        if (!currentReport) return;
        const labelEl = els.shareToInstagram.querySelector("span");
        const original = labelEl.textContent;
        els.shareToInstagram.disabled = true;
        labelEl.textContent = "Rendering…";
        try {
          await T.cardRenderer.downloadCard(currentReport, "story");
          labelEl.textContent = "Saved ✓ paste in Stories";
        } catch (_e) {
          labelEl.textContent = "Try again";
        } finally {
          setTimeout(() => {
            els.shareToInstagram.disabled = false;
            labelEl.textContent = original;
          }, 2200);
        }
      });
    }
  }

  // Build the X compose-intent URL. We keep this short and unannotated
  // — X strips long URLs aggressively and we're not attaching an image
  // (no intent API for that), so a concise text payload reads best.
  function buildXComposeUrl(report) {
    const arch = report.archetype.name;
    const tabs = report.stats.tabCount;
    const text =
      `${tabs} tabs open. TabShame just diagnosed me as ${arch} ${report.archetype.emoji}` +
      `\n\nGet your own: tabshame.app`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
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
