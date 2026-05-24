/*
 * newtab.js
 *
 * Drives the override new-tab page. Reads the user's mode preference,
 * sets the body class accordingly, then asks the service worker for a
 * fresh diagnosis and hydrates either the full showcase or the corner chip.
 *
 * Performance: the page renders the skeleton instantly from the cached
 * settings + last-known archetype in storage (no message round-trip needed
 * for the first paint). Only the roast / score numbers wait on the
 * service-worker reply. Felt latency stays under ~50ms even with a cold
 * worker.
 */

(function () {
  const T = globalThis.TabShame;

  const els = {
    body: document.body,
    dateLabel: document.getElementById("dateLabel"),
    archetypeEmoji: document.getElementById("archetypeEmoji"),
    archetypeName: document.getElementById("archetypeName"),
    tabCount: document.getElementById("tabCount"),
    scoreValue: document.getElementById("scoreValue"),
    roastLine: document.getElementById("roastLine"),
    downloadCard: document.getElementById("downloadCard"),
    closeDupes: document.getElementById("closeDupes"),
    closeDupesLabel: document.getElementById("closeDupesLabel"),
    openReport: document.getElementById("openReport"),
    switchToLite: document.getElementById("switchToLite"),
    // Lite mode
    chipEmoji: document.getElementById("chipEmoji"),
    chipName: document.getElementById("chipName"),
    chipCount: document.getElementById("chipCount"),
    chipButton: document.getElementById("chipButton"),
    switchToFull: document.getElementById("switchToFull")
  };

  let currentReport = null;
  // Cached during init so we can re-derive the effective mode when the user
  // flips full/lite inline without re-fetching the report.
  let storedNewTabMode = "full";

  async function init() {
    els.dateLabel.textContent = formatDate(new Date()).toUpperCase();

    // 1. Read stored preference + last archetype together, so the very first
    //    paint reflects the user's actual state. Two storage hits in parallel.
    let lastArchetypeId = null;
    try {
      const [settings, lastId] = await Promise.all([
        T.storage.getSettings(),
        T.storage.getLastArchetypeId()
      ]);
      storedNewTabMode = settings.newTabMode === "lite" ? "lite" : "full";
      lastArchetypeId = lastId || null;
    } catch (_e) {
      storedNewTabMode = "full";
    }

    // 2. Effective mode: casual_hoarder (or unknown / fresh install) forces
    //    the near-blank mode regardless of the user's full/lite preference.
    //    This honors the rule: only override the new tab once the user has
    //    been tagged with a specific persona.
    applyEffectiveMode(lastArchetypeId);

    // 3. Render any cached state from storage so the page paints something
    //    coherent immediately — even before the diagnosis request completes.
    primeFromCache(lastArchetypeId).catch(() => {});

    // 4. Ask the worker for a fresh report. This is what actually triggers
    //    the persona tab-group, snapshot, transition notification, etc.
    try {
      const report = await getReport();
      currentReport = report;
      // Re-apply mode now that we know the live archetype — handles the
      // (rare) case where the cached lastArchetypeId is stale.
      applyEffectiveMode(report.archetype && report.archetype.id);
      // Casual mode renders nothing tied to the report — skip render().
      if (!isCasualArchetype(report.archetype && report.archetype.id)) {
        render(report);
      }
    } catch (e) {
      renderError(e);
    } finally {
      els.body.removeAttribute("aria-busy");
    }

    wireActions();

    // Shortcuts are independent of the diagnosis path — kick off in parallel
    // so they don't gate the persona render. Failures are non-fatal; an
    // empty grid is preferable to a broken page.
    hydrateShortcuts().catch((e) => {
      console.warn("[TabShame] shortcuts failed:", e);
    });
  }

  function isCasualArchetype(archetypeId) {
    // Treat both "no archetype yet" and the literal Casual Hoarder fallback
    // as casual. We deliberately do NOT include tab_maximalist here — the
    // user has crossed an extreme threshold and earned a (catch-all) tag,
    // so the showcase still feels deserved.
    return !archetypeId || archetypeId === "casual_hoarder";
  }

  function applyEffectiveMode(archetypeId) {
    const mode = isCasualArchetype(archetypeId) ? "casual" : storedNewTabMode;
    setBodyMode(mode);
  }

  function setBodyMode(mode) {
    els.body.classList.remove("mode-full", "mode-lite", "mode-casual");
    if (mode === "lite") els.body.classList.add("mode-lite");
    else if (mode === "casual") els.body.classList.add("mode-casual");
    else els.body.classList.add("mode-full");
  }

  // Paint skeleton from cached storage — uses the last-known archetype and
  // tab count so the user sees something coherent instantly. Never blocks
  // on the worker. If storage is empty (fresh install), the placeholders
  // already on the page stay until the real report arrives.
  //
  // Skipped entirely for casual archetypes — there's nothing to paint in
  // mode-casual besides the static brand tick.
  async function primeFromCache(lastArchetypeId) {
    if (isCasualArchetype(lastArchetypeId)) return;

    const tabsMap = await T.storage.getAllTabs();
    const archetypes = T.ARCHETYPES || [];
    const archetype = archetypes.find((a) => a.archetypeId === lastArchetypeId);
    if (!archetype) return;

    const cachedTabCount = Object.keys(tabsMap || {}).length;

    // Don't overwrite if the live report has already painted (race vs. fast
    // worker reply). Check aria-busy as a proxy.
    if (els.body.getAttribute("aria-busy") !== "true") return;

    els.archetypeEmoji.textContent = archetype.emoji;
    els.archetypeName.textContent = archetype.name;
    els.tabCount.textContent = String(cachedTabCount);
    els.chipEmoji.textContent = archetype.emoji;
    els.chipName.textContent = archetype.name;
    els.chipCount.textContent = String(cachedTabCount);
  }

  function render(report) {
    currentReport = report;
    const archetype = report.archetype;

    els.archetypeEmoji.textContent = archetype.emoji;
    els.archetypeName.textContent = archetype.name;
    els.tabCount.textContent = String(report.stats.tabCount);
    els.scoreValue.textContent = String(report.score);
    els.roastLine.textContent = `"${report.roast}"`;

    els.chipEmoji.textContent = archetype.emoji;
    els.chipName.textContent = archetype.name;
    els.chipCount.textContent = String(report.stats.tabCount);

    updateActionStates();
  }

  function updateActionStates() {
    if (!currentReport) return;
    const hasDupes = currentReport.stats.duplicateCount > 0;
    els.closeDupes.disabled = !hasDupes;
    els.closeDupes.title = hasDupes
      ? `Close ${currentReport.stats.duplicateCount} duplicate tab(s)`
      : "No duplicates to close";
  }

  function renderError(e) {
    els.archetypeName.textContent = "Diagnosis unavailable";
    els.archetypeEmoji.textContent = "🐌";
    els.tabCount.textContent = "—";
    els.scoreValue.textContent = "—";
    els.roastLine.textContent = `"${String(e && e.message ? e.message : e)}"`;
  }

  function wireActions() {
    els.openReport.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("report/report.html") });
    });

    els.downloadCard.addEventListener("click", async () => {
      if (!currentReport) return;
      const original = els.downloadCard.textContent;
      els.downloadCard.disabled = true;
      els.downloadCard.textContent = "Rendering…";
      try {
        await T.cardRenderer.downloadCard(currentReport, "twitter");
      } finally {
        els.downloadCard.disabled = false;
        els.downloadCard.textContent = original;
      }
    });

    els.closeDupes.addEventListener("click", async () => {
      if (!currentReport || currentReport.stats.duplicateCount === 0) return;
      const original = els.closeDupesLabel.textContent;
      els.closeDupes.disabled = true;
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

    // Mode swaps — persist and re-apply without reload (instant feedback).
    // Only meaningful when a specific persona is active; the inline links
    // aren't rendered in mode-casual so we don't guard further here.
    els.switchToLite.addEventListener("click", async () => {
      storedNewTabMode = "lite";
      await T.storage.updateSettings({ newTabMode: "lite" });
      setBodyMode("lite");
    });

    els.switchToFull.addEventListener("click", async () => {
      storedNewTabMode = "full";
      await T.storage.updateSettings({ newTabMode: "full" });
      setBodyMode("full");
    });

    // Tapping the chip body opens the full report (so lite mode still has a
    // way to get to the persona card).
    els.chipButton.addEventListener("click", (e) => {
      // Don't conflict with the "switch to full" link inside the chip area.
      if (e.target === els.switchToFull) return;
      chrome.tabs.create({ url: chrome.runtime.getURL("report/report.html") });
    });
  }

  // ─── shortcuts (Recent + Bookmark Bar) ───────────────────────────────
  // Strictly opt-in, two independent pipelines:
  //
  //   kind "recent"    → chrome.topSites + chrome.bookmarks/_favicon for icons
  //                      perms: { topSites, favicon }
  //   kind "bookmarks" → chrome.bookmarks + /_favicon for icons
  //                      perms: { bookmarks, favicon }
  //
  // All three permissions live under `optional_permissions` in the manifest.
  // On install they are NOT granted; the page never auto-queries any of
  // them. The user has to click "Add Recent" or "Add Bookmarks" to trigger
  // chrome.permissions.request(), which surfaces Chrome's own dialog.
  //
  // No dismiss / "seen" flag — the CTA is persistent until the user
  // clicks Add. That's the friction by design. The canonical "is this on
  // right now?" check is chrome.permissions.contains() — revocation at
  // chrome://extensions is honored immediately, and the CTA reappears.
  //
  // Privacy distinction (the reason these live behind separate opt-ins):
  //   • The tab-tracking + persona diagnosis use NONE of this data.
  //     `chrome.tabs` powers the archetype engine; topSites/bookmarks are
  //     only ever read inside hydrateShortcuts() and only ever written
  //     into DOM tiles on this page.
  //   • Share cards (PNG) are rendered from the diagnosis output, which
  //     never touches topSites/bookmarks.
  //   • Nothing is transmitted off-device.

  // Two limits per kind: collapsed (what you see on first load) and
  // expanded (after clicking "show more"). Collapsed=5 keeps the new-tab
  // page compact; expanded=16 is generous without overwhelming.
  const SHORTCUT_LIMITS = { recent: 5, bookmarks: 5 };
  const SHORTCUT_EXPANDED_LIMITS = { recent: 16, bookmarks: 16 };

  // Per-kind expansion state. Page-lifetime only — opening a new tab
  // resets to collapsed, which feels right (the page is meant to be
  // fast/scannable, not a full bookmarks browser).
  const expandedKinds = new Set();

  // Permissions a given kind requires. `favicon` is shared infrastructure
  // — needed to render the local favicon URLs for either set of tiles.
  const PERMS_FOR_KIND = {
    recent: { permissions: ["topSites", "favicon"] },
    bookmarks: { permissions: ["bookmarks", "favicon"] }
  };

  // The other kind in the pair — used to decide whether `favicon` is still
  // needed when a single kind is removed.
  const OTHER_KIND = { recent: "bookmarks", bookmarks: "recent" };

  async function hydrateShortcuts() {
    await Promise.all([
      hydrateKind("recent"),
      hydrateKind("bookmarks")
    ]);

    // Wire CTA / remove buttons once — they target by data-attribute so the
    // same handler routes both kinds.
    if (!wireShortcutsButtons.attached) {
      wireShortcutsButtons();
      wireShortcutsButtons.attached = true;
    }

    // Re-render on external permission changes (chrome://extensions, popup,
    // other tabs). hydrateKind reads chrome.permissions.contains directly
    // so the UI tracks reality regardless of which surface caused the
    // change.
    if (chrome.permissions && !hydrateShortcuts.listenerAttached) {
      chrome.permissions.onAdded.addListener(() => hydrateShortcuts());
      chrome.permissions.onRemoved.addListener(() => hydrateShortcuts());
      hydrateShortcuts.listenerAttached = true;
    }
  }

  async function hydrateKind(kind) {
    // Source of truth is purely the permission state. No dismiss/seen
    // flag: if the user hasn't opted in, the CTA stays visible on every
    // new tab. The friction IS the design — only an explicit "Add" click
    // (or revoke) changes state.
    const granted = await permissionsContains(PERMS_FOR_KIND[kind]);
    if (granted) {
      await renderKind(kind);
      hideCtaFor(kind);
    } else {
      hideGridFor(kind);
      showCtaFor(kind);
    }
  }

  async function renderKind(kind) {
    const items = await fetchItemsFor(kind).catch(() => []);
    const expanded = expandedKinds.has(kind);
    const cap = expanded
      ? (SHORTCUT_EXPANDED_LIMITS[kind] || items.length)
      : (SHORTCUT_LIMITS[kind] || items.length);
    const limited = items.slice(0, cap);
    const hasMore = items.length > cap;

    document.querySelectorAll(`[data-shortcuts="${kind}"]`).forEach((root) => {
      const grid = root.querySelector(`[data-shortcuts-grid="${kind}"]`);
      if (!grid) return;
      grid.innerHTML = "";
      for (const item of limited) grid.appendChild(buildTile(item));
      // Hide entirely if the source had nothing (e.g. empty bookmark bar).
      root.hidden = items.length === 0;

      // Show / hide the "show more" row. Hidden when expanded OR when
      // there's nothing left to expand to.
      const moreRow = root.querySelector(`[data-shortcuts-more-row="${kind}"]`);
      if (moreRow) moreRow.hidden = !hasMore;
    });
  }

  async function fetchItemsFor(kind) {
    if (kind === "recent") {
      if (!chrome.topSites) return [];
      return fetchTopSites();
    }
    if (kind === "bookmarks") {
      if (!chrome.bookmarks) return [];
      return fetchBookmarkBar();
    }
    return [];
  }

  function showCtaFor(kind) {
    document
      .querySelectorAll(`[data-shortcuts-cta="${kind}"]`)
      .forEach((el) => { el.hidden = false; });
  }

  function hideCtaFor(kind) {
    document
      .querySelectorAll(`[data-shortcuts-cta="${kind}"]`)
      .forEach((el) => { el.hidden = true; });
  }

  function hideGridFor(kind) {
    document
      .querySelectorAll(`[data-shortcuts="${kind}"]`)
      .forEach((el) => { el.hidden = true; });
  }

  function wireShortcutsButtons() {
    document.querySelectorAll("[data-shortcuts-add]").forEach((btn) => {
      btn.addEventListener("click", () => onAdd(btn.dataset.shortcutsAdd));
    });
    document.querySelectorAll("[data-shortcuts-remove]").forEach((btn) => {
      btn.addEventListener("click", () => onRemove(btn.dataset.shortcutsRemove));
    });
    document.querySelectorAll("[data-shortcuts-more]").forEach((btn) => {
      btn.addEventListener("click", () => onShowMore(btn.dataset.shortcutsMore));
    });
  }

  async function onShowMore(kind) {
    if (!kind) return;
    expandedKinds.add(kind);
    await renderKind(kind);
  }

  async function onAdd(kind) {
    if (!kind || !PERMS_FOR_KIND[kind]) return;
    try {
      await new Promise((resolve, reject) => {
        chrome.permissions.request(PERMS_FOR_KIND[kind], (g) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(Boolean(g));
        });
      });
    } catch (e) {
      console.warn(`[TabShame] permission request failed (${kind}):`, e);
    }
    // hydrateKind reads the live permission state — granted → grid, denied
    // (or dialog cancelled) → CTA stays. No persistent dismiss state to
    // manage; the user can re-click Add any time.
    await hydrateKind(kind);
  }

  async function onRemove(kind) {
    if (!kind || !PERMS_FOR_KIND[kind]) return;

    // Remove the kind-specific permission first.
    const primaryPerm = PERMS_FOR_KIND[kind].permissions
      .filter((p) => p !== "favicon");
    try {
      await new Promise((resolve, reject) => {
        chrome.permissions.remove({ permissions: primaryPerm }, (ok) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(ok);
        });
      });
    } catch (e) {
      console.warn(`[TabShame] permission remove failed (${kind}):`, e);
    }

    // If the OTHER kind is no longer holding `favicon`, drop it too so
    // the granted-permissions list at chrome://extensions stays honest.
    try {
      const otherGranted = await permissionsContains(PERMS_FOR_KIND[OTHER_KIND[kind]]);
      if (!otherGranted) {
        await new Promise((resolve, reject) => {
          chrome.permissions.remove({ permissions: ["favicon"] }, (ok) => {
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve(ok);
          });
        });
      }
    } catch (_e) { /* non-fatal */ }

    hideGridFor(kind);
    // After revoke, hydrateKind shows the CTA again (no seen flag to mute it).
    await hydrateKind(kind);
  }

  function permissionsContains(perms) {
    return new Promise((resolve) => {
      try {
        chrome.permissions.contains(perms, (ok) => resolve(Boolean(ok)));
      } catch (_e) {
        resolve(false);
      }
    });
  }

  function buildTile({ title, url }) {
    const a = document.createElement("a");
    a.className = "shortcut-tile";
    a.href = url;
    a.title = `${title || url}\n${url}`;
    // Open in the same tab — matches Chrome NTP behavior.
    // (No target=_blank; user can middle-click for new tab themselves.)

    const fav = document.createElement("span");
    fav.className = "shortcut-favicon";
    const img = document.createElement("img");
    img.src = faviconUrl(url);
    img.alt = "";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    // If Chrome's favicon cache miss, fall back to a serif initial letter.
    img.addEventListener("error", () => {
      fav.removeChild(img);
      fav.textContent = initialFor(title || url);
    });
    fav.appendChild(img);

    const label = document.createElement("span");
    label.className = "shortcut-title";
    label.textContent = displayTitle(title, url);

    a.appendChild(fav);
    a.appendChild(label);
    return a;
  }

  // Builds the chrome-extension://EXT_ID/_favicon/?pageUrl=...&size=N URL
  // that reads from Chrome's local favicon cache. No external network call.
  function faviconUrl(pageUrl) {
    const u = new URL(chrome.runtime.getURL("/_favicon/"));
    u.searchParams.set("pageUrl", pageUrl);
    u.searchParams.set("size", "32");
    return u.toString();
  }

  function displayTitle(title, url) {
    if (title && title.trim()) return title.trim();
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (_e) {
      return url;
    }
  }

  function initialFor(s) {
    const trimmed = (s || "").trim();
    if (!trimmed) return "?";
    // Skip leading "The " for personality (matches the tab-group naming).
    const cleaned = trimmed.replace(/^the\s+/i, "");
    return cleaned[0].toUpperCase();
  }

  function fetchTopSites() {
    return new Promise((resolve, reject) => {
      try {
        chrome.topSites.get((sites) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          // Dedupe by hostname — chrome.topSites sometimes returns several
          // pages from the same host (e.g. 3 separate google.com URLs),
          // which crowds the grid with near-duplicates. First occurrence
          // wins; favicons + titles are the most-visited entry's.
          const seen = new Set();
          const out = [];
          for (const site of sites || []) {
            const host = T.archetypeEngine.hostnameOf(site.url) || site.url;
            if (seen.has(host)) continue;
            seen.add(host);
            out.push(site);
          }
          resolve(out);
        });
      } catch (e) { reject(e); }
    });
  }

  // Walks chrome.bookmarks.getTree to find the bookmark bar (id "1"),
  // then BFS-collects URL items inside it — top-level URLs first, then
  // walks into folders. Many users keep folders (not direct URLs) on
  // their bar, so without the folder-walk this returned an empty array
  // and the grid silently stayed hidden after the user granted permission.
  //
  // If the bar produces nothing, falls back to "Other Bookmarks" (id "2"),
  // and finally to anything in the tree — so there's always something to
  // show as long as the user has at least one bookmark anywhere.
  async function fetchBookmarkBar() {
    const tree = await new Promise((resolve, reject) => {
      try {
        chrome.bookmarks.getTree((t) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(t || []);
        });
      } catch (e) { reject(e); }
    });
    if (!tree.length) return [];
    const root = tree[0];
    const children = root.children || [];
    const max = SHORTCUT_LIMITS.bookmarks;

    const tryNode = (node) =>
      node ? collectBookmarkUrls(node, max) : [];

    // 1. Bookmark Bar (id "1")
    let items = tryNode(children.find((c) => c.id === "1"));
    if (items.length > 0) return items;

    // 2. Other Bookmarks (id "2")
    items = tryNode(children.find((c) => c.id === "2"));
    if (items.length > 0) return items;

    // 3. Any other top-level node (forks, mobile bookmarks, etc.)
    for (const c of children) {
      items = tryNode(c);
      if (items.length > 0) return items;
    }
    return [];
  }

  // BFS walk that collects URL items first from a node's direct children,
  // then queues child folders so deeper bookmarks fill in any remaining
  // slots. Capped at `max` items.
  function collectBookmarkUrls(node, max) {
    const items = [];
    const queue = [node];
    while (queue.length && items.length < max) {
      const current = queue.shift();
      for (const child of current.children || []) {
        if (items.length >= max) break;
        if (child.url) {
          items.push({ title: child.title, url: child.url });
        } else {
          queue.push(child); // folder — walked next, breadth-first
        }
      }
    }
    return items;
  }

  // ─── messaging ────────────────────────────────────────────────────────
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
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "GET_REPORT" }, (response) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        if (!response || !response.ok) return reject(new Error(response && response.error));
        resolve(response.report);
      });
    });
  }

  function formatDate(d) {
    return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
