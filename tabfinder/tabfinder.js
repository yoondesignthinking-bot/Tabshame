/*
 * tabfinder.js — full-bleed tab finder.
 *
 * Loads every open tab via chrome.tabs.query, groups by domain, renders
 * a clickable grid. Search filters in real time across title/URL/domain.
 * Keyboard nav: ↑↓ to move, Enter to switch, Esc to close, Cmd-Backspace
 * to close the focused tab. No external dependencies, no network.
 */

(function () {
  // ─── DOM refs ──────────────────────────────────────────────────────
  const els = {
    search:      document.getElementById("searchInput"),
    searchClear: document.getElementById("searchClear"),
    chips:       document.getElementById("filterChips"),
    results:     document.getElementById("results"),
    empty:       document.getElementById("emptyState"),
    stats:       document.getElementById("topbarStats"),
  };

  // ─── State ─────────────────────────────────────────────────────────
  // `allTabs`  — full set from chrome.tabs.query, normalized.
  // `filter`   — { query, domain } — current filter state.
  // `focused`  — index into the currently-displayed flat list.
  let allTabs = [];
  let displayed = []; // flat list in display order, matches focusable tiles
  let filter = { query: "", domain: null };
  let focusedIdx = 0;
  let myTabId = null;   // this tabfinder tab itself — exclude from list

  // ─── Helpers ───────────────────────────────────────────────────────
  function hostnameOf(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, "");
    } catch (_e) {
      return "";
    }
  }

  /** Trackable in TabShame's sense — exclude Chrome internals. */
  function isTrackableUrl(url) {
    if (!url) return false;
    if (url.startsWith("chrome://"))           return false;
    if (url.startsWith("edge://"))             return false;
    if (url.startsWith("about:"))              return false;
    // chrome-extension:// — keep visible so the user can see TabShame's
    // own pages (popup users may want to navigate to settings/report).
    return true;
  }

  /** Returns the focused tile element if there is one. */
  function focusedTile() {
    return els.results.querySelector(".tab-tile.is-focused");
  }

  /** Escape any HTML in a string for safe innerHTML use. */
  function escHtml(s) {
    return (s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Highlight the first occurrence of `query` in `text` (case-insensitive). */
  function highlight(text, query) {
    if (!query) return escHtml(text);
    const lc = text.toLowerCase();
    const idx = lc.indexOf(query.toLowerCase());
    if (idx < 0) return escHtml(text);
    const before = text.slice(0, idx);
    const hit    = text.slice(idx, idx + query.length);
    const after  = text.slice(idx + query.length);
    return escHtml(before) + '<span class="match-hit">' + escHtml(hit) + '</span>' + escHtml(after);
  }

  /** Tab matches the current query? Returns ranked score (higher = better). */
  function matchScore(tab, query) {
    if (!query) return 1;
    const q = query.toLowerCase();
    const title = (tab.title || "").toLowerCase();
    const url   = (tab.url   || "").toLowerCase();
    const host  = tab.hostname || "";
    if (title.startsWith(q))             return 100;
    if (host.startsWith(q))              return 90;
    if (title.includes(" " + q))         return 80;
    if (title.includes(q))               return 70;
    if (host.includes(q))                return 60;
    if (url.includes(q))                 return 40;
    return 0;
  }

  // ─── Load tabs from Chrome ─────────────────────────────────────────
  function loadTabs() {
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        const list = (tabs || [])
          .filter((t) => t.id !== myTabId)
          .filter((t) => isTrackableUrl(t.url || t.pendingUrl || ""))
          .map((t) => ({
            id: t.id,
            windowId: t.windowId,
            url: t.url || t.pendingUrl || "",
            title: t.title || "(no title)",
            favIconUrl: t.favIconUrl || "",
            active: !!t.active,
            pinned: !!t.pinned,
            hostname: hostnameOf(t.url || t.pendingUrl || ""),
          }));
        resolve(list);
      });
    });
  }

  // ─── Render ────────────────────────────────────────────────────────
  function render() {
    const q = filter.query.trim();
    const domainFilter = filter.domain;

    // Filter + rank
    let matches = allTabs
      .map((tab) => ({ tab, score: matchScore(tab, q) }))
      .filter((x) => x.score > 0)
      .filter((x) => !domainFilter || x.tab.hostname === domainFilter);

    // Sort: highest score, then alphabetical by hostname, then title
    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const h = (a.tab.hostname || "").localeCompare(b.tab.hostname || "");
      if (h !== 0) return h;
      return (a.tab.title || "").localeCompare(b.tab.title || "");
    });

    // When NOT searching, group by domain for visual clustering.
    // When searching, drop the grouping and render a flat ranked list.
    const isSearching = q.length > 0;

    els.results.innerHTML = "";
    displayed = [];

    if (matches.length === 0) {
      els.empty.hidden = false;
      els.stats.textContent = q ? `0 tabs match "${q}"` : "0 tabs";
      return;
    }
    els.empty.hidden = true;

    const total = matches.length;
    const totalAll = allTabs.length;
    els.stats.textContent = (q || domainFilter)
      ? `${total} of ${totalAll} tab${totalAll === 1 ? "" : "s"}`
      : `${totalAll} tab${totalAll === 1 ? "" : "s"} open`;

    if (isSearching) {
      const grid = document.createElement("div");
      grid.className = "tab-grid";
      for (const { tab } of matches) {
        grid.appendChild(buildTile(tab, q));
        displayed.push(tab);
      }
      els.results.appendChild(grid);
    } else {
      // Group by domain. Group order: most-tabs first.
      const groups = new Map();
      for (const { tab } of matches) {
        const key = tab.hostname || "(no host)";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(tab);
      }
      const ordered = [...groups.entries()].sort((a, b) => {
        if (b[1].length !== a[1].length) return b[1].length - a[1].length;
        return a[0].localeCompare(b[0]);
      });
      for (const [host, tabs] of ordered) {
        const group = document.createElement("section");
        group.className = "domain-group";
        const header = document.createElement("div");
        header.className = "domain-group-header";
        header.innerHTML =
          '<span class="domain-group-name">' + escHtml(host) + '</span>' +
          '<span class="domain-group-count">' + tabs.length + ' tab' + (tabs.length === 1 ? '' : 's') + '</span>';
        group.appendChild(header);
        const grid = document.createElement("div");
        grid.className = "tab-grid";
        for (const tab of tabs) {
          grid.appendChild(buildTile(tab, ""));
          displayed.push(tab);
        }
        group.appendChild(grid);
        els.results.appendChild(group);
      }
    }

    // Move focus to first tile (or preserve current focused if still in list)
    focusedIdx = Math.min(focusedIdx, displayed.length - 1);
    if (focusedIdx < 0) focusedIdx = 0;
    updateFocus();
  }

  function buildTile(tab, query) {
    const tile = document.createElement("button");
    tile.className = "tab-tile";
    tile.type = "button";
    tile.dataset.tabId = String(tab.id);
    tile.dataset.windowId = String(tab.windowId);

    // Favicon (use Chrome's own favIconUrl; fall back to initial letter)
    const fav = document.createElement("span");
    fav.className = "tab-tile-fav";
    if (tab.favIconUrl && /^(https?:|data:|chrome:|chrome-extension:)/.test(tab.favIconUrl)) {
      const img = document.createElement("img");
      img.src = tab.favIconUrl;
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", () => {
        fav.removeChild(img);
        fav.textContent = initialFor(tab.hostname || tab.title);
      });
      fav.appendChild(img);
    } else {
      fav.textContent = initialFor(tab.hostname || tab.title);
    }
    tile.appendChild(fav);

    const body = document.createElement("div");
    body.className = "tab-tile-body";
    const title = document.createElement("div");
    title.className = "tab-tile-title";
    title.innerHTML = highlight(tab.title || "(no title)", query);
    body.appendChild(title);
    const meta = document.createElement("div");
    meta.className = "tab-tile-meta";
    const host = document.createElement("span");
    host.className = "tab-tile-meta-host";
    host.innerHTML = highlight(tab.hostname || tab.url, query);
    meta.appendChild(host);
    if (tab.pinned) {
      const b = document.createElement("span");
      b.className = "tab-tile-badge is-pinned";
      b.textContent = "PINNED";
      meta.appendChild(b);
    }
    if (tab.active) {
      const b = document.createElement("span");
      b.className = "tab-tile-badge is-active";
      b.textContent = "ACTIVE";
      meta.appendChild(b);
    }
    body.appendChild(meta);
    tile.appendChild(body);

    // Close button (X)
    const close = document.createElement("button");
    close.type = "button";
    close.className = "tab-tile-close";
    close.title = "Close this tab";
    close.textContent = "×";
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });
    tile.appendChild(close);

    tile.addEventListener("click", () => switchToTab(tab));
    return tile;
  }

  function initialFor(s) {
    const t = (s || "").trim().replace(/^the\s+/i, "");
    return t ? t[0].toUpperCase() : "?";
  }

  // ─── Focus management ──────────────────────────────────────────────
  function updateFocus() {
    const tiles = els.results.querySelectorAll(".tab-tile");
    tiles.forEach((t, i) => t.classList.toggle("is-focused", i === focusedIdx));
    const focused = tiles[focusedIdx];
    if (focused) {
      const rect = focused.getBoundingClientRect();
      if (rect.top < 80 || rect.bottom > window.innerHeight - 80) {
        focused.scrollIntoView({ block: "center", behavior: "auto" });
      }
    }
  }

  function moveFocus(delta) {
    if (displayed.length === 0) return;
    focusedIdx = (focusedIdx + delta + displayed.length) % displayed.length;
    updateFocus();
  }

  // ─── Actions ───────────────────────────────────────────────────────
  async function switchToTab(tab) {
    if (!tab) return;
    try {
      await new Promise((r) => chrome.tabs.update(tab.id, { active: true }, () => r()));
      await new Promise((r) => chrome.windows.update(tab.windowId, { focused: true }, () => r()));
    } catch (_e) {}
    // Close the finder tab itself so the user lands on their target.
    if (myTabId != null) {
      try { chrome.tabs.remove(myTabId); } catch (_e) {}
    }
  }

  async function closeTab(tabId) {
    try {
      await new Promise((r) => chrome.tabs.remove(tabId, () => r()));
    } catch (_e) {}
    allTabs = allTabs.filter((t) => t.id !== tabId);
    render();
  }

  // ─── Filter chips (top domains) ────────────────────────────────────
  function renderChips() {
    const counts = new Map();
    for (const t of allTabs) {
      const k = t.hostname || "(no host)";
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const top = [...counts.entries()]
      .filter(([, c]) => c >= 2) // only suggest domains with 2+ tabs
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    els.chips.innerHTML = "";
    if (top.length === 0) return;

    const allChip = makeChip("All", null, allTabs.length);
    if (filter.domain === null) allChip.classList.add("is-active");
    allChip.addEventListener("click", () => {
      filter.domain = null;
      renderChips();
      render();
    });
    els.chips.appendChild(allChip);

    for (const [host, count] of top) {
      const chip = makeChip(host, host, count);
      if (filter.domain === host) chip.classList.add("is-active");
      chip.addEventListener("click", () => {
        filter.domain = filter.domain === host ? null : host;
        renderChips();
        render();
      });
      els.chips.appendChild(chip);
    }
  }
  function makeChip(label, host, count) {
    const c = document.createElement("button");
    c.type = "button";
    c.className = "filter-chip";
    c.innerHTML = escHtml(label) + '<span class="filter-chip-count">' + count + '</span>';
    return c;
  }

  // ─── Wiring ────────────────────────────────────────────────────────
  function wire() {
    els.search.addEventListener("input", () => {
      filter.query = els.search.value;
      els.searchClear.hidden = !filter.query;
      focusedIdx = 0;
      render();
    });
    els.searchClear.addEventListener("click", () => {
      els.search.value = "";
      filter.query = "";
      els.searchClear.hidden = true;
      els.search.focus();
      render();
    });

    document.addEventListener("keydown", (e) => {
      // Esc → close the finder tab.
      if (e.key === "Escape") {
        if (filter.query) {
          // Esc first clears the query, second closes the finder.
          els.search.value = "";
          filter.query = "";
          els.searchClear.hidden = true;
          render();
        } else {
          if (myTabId != null) chrome.tabs.remove(myTabId);
        }
        return;
      }
      // Cmd/Ctrl + Backspace → close the currently-focused tab.
      if ((e.metaKey || e.ctrlKey) && (e.key === "Backspace" || e.key === "Delete")) {
        e.preventDefault();
        const t = displayed[focusedIdx];
        if (t) closeTab(t.id);
        return;
      }
      // Enter → switch to focused tab.
      if (e.key === "Enter") {
        e.preventDefault();
        const t = displayed[focusedIdx];
        if (t) switchToTab(t);
        return;
      }
      // Arrow keys / Tab for nav.
      if (e.key === "ArrowDown") { e.preventDefault(); moveFocus(+1); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); moveFocus(-1); return; }
      if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); moveFocus(+1); return; }
      if (e.key === "Tab" && e.shiftKey)  { e.preventDefault(); moveFocus(-1); return; }
    });

    // Tab events — refresh the list if a background change happens.
    const refreshLazy = debounce(async () => {
      allTabs = await loadTabs();
      renderChips();
      render();
    }, 250);
    chrome.tabs.onUpdated.addListener(refreshLazy);
    chrome.tabs.onRemoved.addListener(refreshLazy);
    chrome.tabs.onCreated.addListener(refreshLazy);
  }

  function debounce(fn, ms) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ─── Init ──────────────────────────────────────────────────────────
  async function init() {
    // Identify our own tab so we can exclude it from the list and close it
    // on switch / Esc.
    try {
      const me = await new Promise((r) => chrome.tabs.getCurrent((t) => r(t)));
      myTabId = me ? me.id : null;
    } catch (_e) {}

    allTabs = await loadTabs();
    renderChips();
    render();
    els.search.focus();
    wire();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
