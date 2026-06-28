/*
 * card-renderer.js
 *
 * Canvas API card generation. Three formats:
 *   - twitter:   1200×675   (16:9, X/Twitter feed)
 *   - instagram: 1080×1350  (4:5, IG portrait feed)
 *   - story:     1080×1920  (9:16, IG / TikTok stories)
 *
 * Hero hierarchy (per audit, May 2026):
 *   1. Tab count is the dominant number — instantly legible identity.
 *   2. Archetype name is the emotional payoff.
 *   3. Two tiles only: DUPLICATES + TOP HAUNT. Oldest-age cut.
 *
 * Note: the shame score / score formula was removed from cards in the
 * Jun 2026 cleanup — surfaces a single dominant "8 TABS OPEN" with the
 * archetype as the payoff, rather than competing numbers.
 *
 * Test the tab count at thumbnail size (e.g. 200×112 for Twitter). If you
 * can't read it instantly, the layout regressed.
 *
 * Loaded via <script> tag in popup/report. Takes a fully-built report
 * object as input — no chrome.* access, no engine dependencies.
 */

(function () {
  const ROOT = (globalThis.TabShame = globalThis.TabShame || {});

  const FORMATS = {
    twitter: { width: 1200, height: 675, aspect: "16:9" },
    instagram: { width: 1080, height: 1350, aspect: "4:5" },
    story: { width: 1080, height: 1920, aspect: "9:16" }
  };

  const COLORS = {
    ink: "#1a1612",
    paper: "#f4ede0",
    peach: "#ff8966",
    lavender: "#b8a4ff",
    shame: "#e63946",
    inkSoft: "rgba(26, 22, 18, 0.55)"
  };

  // ─── public ───────────────────────────────────────────────────────────
  // Returns a Promise<Blob> (PNG). Caller can download or display.
  async function renderCard(report, format = "twitter") {
    const fmt = FORMATS[format];
    if (!fmt) throw new Error(`Unknown card format: ${format}`);

    const canvas = makeCanvas(fmt.width, fmt.height);
    const ctx = canvas.getContext("2d");

    paintBackground(ctx, fmt);
    if (format === "twitter") paintTwitterLayout(ctx, fmt, report);
    else if (format === "instagram") paintInstagramLayout(ctx, fmt, report);
    else if (format === "story") paintStoryLayout(ctx, fmt, report);

    return canvasToBlob(canvas);
  }

  async function downloadCard(report, format = "twitter", filename) {
    const blob = await renderCard(report, format);
    triggerDownload(blob, filename || `tabshame-${format}-${Date.now()}.png`);
  }

  // Renders all three card formats and triggers a download for each.
  // Each format gets its own click+download; Chrome shows a one-time
  // "site wants to download multiple files" consent dialog on the
  // first call, then proceeds. Renders sequentially so we don't peak
  // memory with three full-res canvases at once — and so a render
  // failure in the middle still lets the earlier ones land.
  //
  // Filenames share a single timestamp so the three files sort
  // together in Downloads. Optional onProgress({ done, total, format })
  // lets the calling surface update its button label.
  //
  // Returns { downloaded: ["twitter", ...], failed: ["story", ...] }.
  async function downloadAllCards(report, opts = {}) {
    const formats = Object.keys(FORMATS); // ["twitter", "instagram", "story"]
    const ts = Date.now();
    const downloaded = [];
    const failed = [];
    for (let i = 0; i < formats.length; i++) {
      const format = formats[i];
      try {
        const blob = await renderCard(report, format);
        triggerDownload(blob, `tabshame-${format}-${ts}.png`);
        downloaded.push(format);
        if (typeof opts.onProgress === "function") {
          opts.onProgress({ done: i + 1, total: formats.length, format });
        }
        // Small gap so Chrome doesn't coalesce the three rapid <a>.click()s
        // into one "blocked extra downloads" warning. 120ms is below
        // perceptible delay but above the threshold where Chrome groups them.
        if (i < formats.length - 1) await new Promise((r) => setTimeout(r, 120));
      } catch (e) {
        failed.push(format);
      }
    }
    return { downloaded, failed };
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ─── canvas helpers ───────────────────────────────────────────────────
  function makeCanvas(w, h) {
    // OffscreenCanvas works in service workers; <canvas> works elsewhere.
    // The card renderer is only ever called from popup/report, so we use
    // a DOM canvas. Service worker would need OffscreenCanvas + transfer.
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }

  function paintBackground(ctx, fmt) {
    // Soft peach → lavender diagonal gradient on paper base.
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, fmt.width, fmt.height);

    const grad = ctx.createLinearGradient(0, 0, fmt.width, fmt.height);
    grad.addColorStop(0, "rgba(255, 137, 102, 0.35)"); // peach
    grad.addColorStop(1, "rgba(184, 164, 255, 0.45)"); // lavender
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, fmt.width, fmt.height);

    // Subtle paper grain (a few faint dots) — gives the editorial feel.
    ctx.fillStyle = "rgba(26, 22, 18, 0.025)";
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * fmt.width;
      const y = Math.random() * fmt.height;
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── layouts ──────────────────────────────────────────────────────────
  // Y coords are explicit, non-overlapping bands. Reading order top→bottom:
  //   header eyebrow · TAB COUNT (hero) · archetype · tiles · roast · footer
  //
  // Tab count is in the shame-red color — it carries the identity. The
  // archetype line sits directly under it as the emotional payoff. No
  // score number competes for attention.
  function paintTwitterLayout(ctx, fmt, report) {
    const pad = 60;
    const cx = fmt.width / 2;
    const tabCount = String(report.stats.tabCount);
    const tabsLabel = report.stats.tabCount === 1 ? "TAB OPEN" : "TABS OPEN";

    // Header eyebrow
    ctx.textBaseline = "alphabetic";
    setFont(ctx, 18, "mono", 600);
    ctx.fillStyle = COLORS.inkSoft;
    ctx.textAlign = "left";
    ctx.fillText("TAB SHAME · WRAPPED", pad, 56);
    ctx.textAlign = "right";
    ctx.fillText(formatMonthYear(new Date(report.generatedAt)).toUpperCase(), fmt.width - pad, 56);

    // HERO: tab count. Font scales with digit count so 3-digit counts still
    // fit. middle baseline at y=215 → visual extent ~85 to ~345.
    const heroFont = tabCount.length >= 4 ? 200 : tabCount.length === 3 ? 240 : 260;
    setFont(ctx, heroFont, "serif", 900);
    ctx.fillStyle = COLORS.shame;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tabCount, cx, 215);

    ctx.textBaseline = "alphabetic";
    setFont(ctx, 18, "mono", 600);
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(tabsLabel, cx, 370);

    // Archetype — emotional payoff, sits directly under the tab count
    // now that the score line is gone.
    setFont(ctx, 32, "serif", 700);
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(`${report.archetype.emoji}  ${report.archetype.name}`, cx, 430);

    // Tiles — 2 tiles, bigger (height 92 vs prior 78).
    const stats = makeStatTiles(report);
    paintStatRow(ctx, stats, pad, 472, fmt.width - pad * 2, 92);

    // Roast
    setFont(ctx, 18, "italic", 400);
    ctx.fillStyle = COLORS.inkSoft;
    ctx.textAlign = "center";
    wrapText(ctx, `"${report.roast}"`, cx, 605, fmt.width - pad * 4, 22, 2);

    // Footer
    setFont(ctx, 14, "mono", 600);
    ctx.fillStyle = COLORS.inkSoft;
    ctx.textAlign = "left";
    ctx.fillText("FOLLOW @NYSGBUILDERBRO ON X", pad, fmt.height - 28);
    ctx.textAlign = "right";
    ctx.fillText("ALL DATA STAYS LOCAL", fmt.width - pad, fmt.height - 28);
  }

  function paintInstagramLayout(ctx, fmt, report) {
    const pad = 70;
    const cx = fmt.width / 2;
    const tabCount = String(report.stats.tabCount);
    const tabsLabel = report.stats.tabCount === 1 ? "TAB OPEN" : "TABS OPEN";

    ctx.textBaseline = "alphabetic";
    setFont(ctx, 22, "mono", 600);
    ctx.fillStyle = COLORS.inkSoft;
    ctx.textAlign = "left";
    ctx.fillText("TAB SHAME · WRAPPED", pad, 92);
    ctx.textAlign = "right";
    ctx.fillText(formatMonthYear(new Date(report.generatedAt)).toUpperCase(), fmt.width - pad, 92);

    // HERO tab count — middle baseline at y=420, font scales with digit count.
    const heroFont = tabCount.length >= 4 ? 320 : tabCount.length === 3 ? 380 : 420;
    setFont(ctx, heroFont, "serif", 900);
    ctx.fillStyle = COLORS.shame;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tabCount, cx, 420);

    ctx.textBaseline = "alphabetic";
    setFont(ctx, 26, "mono", 600);
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(tabsLabel, cx, 660);

    // Archetype — sits closer to the count now that the score line is gone.
    setFont(ctx, 52, "serif", 700);
    ctx.fillStyle = COLORS.ink;
    wrapText(ctx, `${report.archetype.emoji}  ${report.archetype.name}`, cx, 760, fmt.width - pad * 2, 60, 2);

    // Tiles (bigger, 2 tiles)
    const stats = makeStatTiles(report);
    paintStatRow(ctx, stats, pad, 880, fmt.width - pad * 2, 150);

    // Roast
    setFont(ctx, 24, "italic", 400);
    ctx.fillStyle = COLORS.inkSoft;
    ctx.textAlign = "center";
    wrapText(ctx, `"${report.roast}"`, cx, 1180, fmt.width - pad * 2, 32, 3);

    setFont(ctx, 18, "mono", 600);
    ctx.fillStyle = COLORS.inkSoft;
    ctx.textAlign = "left";
    ctx.fillText("FOLLOW @NYSGBUILDERBRO ON X", pad, fmt.height - 50);
    ctx.textAlign = "right";
    ctx.fillText("ALL DATA STAYS LOCAL", fmt.width - pad, fmt.height - 50);
  }

  // 9:16 story — taller canvas, more breathing room around an even larger hero.
  function paintStoryLayout(ctx, fmt, report) {
    const pad = 80;
    const cx = fmt.width / 2;
    const tabCount = String(report.stats.tabCount);
    const tabsLabel = report.stats.tabCount === 1 ? "TAB OPEN" : "TABS OPEN";

    ctx.textBaseline = "alphabetic";
    setFont(ctx, 24, "mono", 600);
    ctx.fillStyle = COLORS.inkSoft;
    ctx.textAlign = "left";
    ctx.fillText("TAB SHAME · WRAPPED", pad, 110);
    ctx.textAlign = "right";
    ctx.fillText(formatMonthYear(new Date(report.generatedAt)).toUpperCase(), fmt.width - pad, 110);

    // HERO tab count, room for a 480px font
    const heroFont = tabCount.length >= 4 ? 380 : tabCount.length === 3 ? 440 : 480;
    setFont(ctx, heroFont, "serif", 900);
    ctx.fillStyle = COLORS.shame;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tabCount, cx, 620);

    ctx.textBaseline = "alphabetic";
    setFont(ctx, 30, "mono", 600);
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(tabsLabel, cx, 920);

    // Archetype — sits closer to the count now that the score line is gone.
    setFont(ctx, 64, "serif", 700);
    ctx.fillStyle = COLORS.ink;
    wrapText(ctx, `${report.archetype.emoji}  ${report.archetype.name}`, cx, 1060, fmt.width - pad * 2, 72, 2);

    // Tiles
    const stats = makeStatTiles(report);
    paintStatRow(ctx, stats, pad, 1240, fmt.width - pad * 2, 180);

    // Roast — story has room for 4 lines if needed.
    setFont(ctx, 28, "italic", 400);
    ctx.fillStyle = COLORS.inkSoft;
    ctx.textAlign = "center";
    wrapText(ctx, `"${report.roast}"`, cx, 1620, fmt.width - pad * 2, 38, 4);

    setFont(ctx, 20, "mono", 600);
    ctx.fillStyle = COLORS.inkSoft;
    ctx.textAlign = "left";
    ctx.fillText("FOLLOW @NYSGBUILDERBRO ON X", pad, fmt.height - 70);
    ctx.textAlign = "right";
    ctx.fillText("ALL DATA STAYS LOCAL", fmt.width - pad, fmt.height - 70);
  }

  // Three highlighted numbers on every share card:
  //   1. EXTRA TABS (closeable duplicates across all open tabs)
  //   2. PERSONA TABS (count from the persona's primary rule — e.g. 8
  //      LinkedIn tabs for The LinkedIn Lurker, 12 study tabs for The
  //      11:47 PM Student). Falls back to top-haunt count for catch-all
  //      archetypes (Casual Hoarder / Tab Maximalist) that have no
  //      primary persona signal.
  //   3. TOP HAUNT — most-tabbed domain. Keeps the "personality + truth"
  //      tile from the May 2026 audit.
  // The big TAB COUNT in the hero (above the row) is the 4th number,
  // visually dominant.
  function makeStatTiles(report) {
    const top = (report.stats.topDomains || [])[0];
    const haunt = top
      ? { primary: truncateDomain(top.domain, 16), secondary: `${top.count} TABS` }
      : { primary: "—", secondary: "NO HAUNTS YET" };

    // Persona-specific count comes from background.js (the primary rule's
    // matched value). For LinkedIn Lurker that's the linkedin tab count;
    // for Job Hunt Marathon it's the linkedin tab count too (their
    // primary rule). Falls back to the top-haunt count.
    const personaCount =
      report.stats.personaTabCount != null
        ? report.stats.personaTabCount
        : (top ? top.count : 0);
    // Label hint: try a per-var lookup, else generic "PERSONA TABS".
    const varName = report.stats.personaTabVar || "";
    const personaLabel = labelForPersonaVar(varName) || "PERSONA TABS";

    return [
      { kind: "number", label: "EXTRA TABS", value: String(report.stats.duplicateCount) },
      { kind: "number", label: personaLabel, value: String(personaCount) },
      { kind: "haunt", label: "TOP HAUNT", value: haunt.primary, sub: haunt.secondary }
    ];
  }

  // Map the rule's `var` name to a short readable label. Best-effort —
  // unknown vars fall back to the generic "PERSONA TABS" label so the
  // tile always reads sensibly even for archetypes we haven't curated.
  const PERSONA_VAR_LABELS = {
    linkedinCount: "LINKEDIN",
    youtubeCount: "YOUTUBE",
    figmaCount: "FIGMA",
    prCount: "PR TABS",
    bookingCount: "BOOKING",
    productivityCount: "PRODUCTIVITY",
    inspirationCount: "INSPIRATION",
    glassdoorCount: "GLASSDOOR",
    studyTabs: "STUDY TABS",
    atsCount: "JOB SEARCH",
    comparisonCount: "SHOPPING",
    cartCount: "CART",
    flightCount: "FLIGHT",
    itineraryCount: "TRAVEL",
    medicalCount: "MEDICAL",
    parentCount: "PARENTING",
    propertyCount: "PROPERTY",
    mortgageCount: "MORTGAGE",
    yieldCount: "FINANCE",
    bagholderCount: "MARKETS",
    insuranceCount: "INSURANCE",
    aiChatCount: "AI CHAT",
    keyboardCount: "KEYBOARDS",
    weddingCount: "WEDDING",
    recipeCount: "RECIPES",
    readLaterCount: "READ LATER",
    phdCount: "RESEARCH",
    worldbuildCount: "WORLDBUILD",
    soDuplicates: "SO HITS",
    localhostCount: "LOCALHOST",
    figmaFinalCount: "FIGMA FINAL"
  };
  function labelForPersonaVar(varName) {
    return PERSONA_VAR_LABELS[varName] || null;
  }

  function truncateDomain(d, max) {
    if (!d) return "—";
    if (d.length <= max) return d;
    return d.slice(0, max - 1) + "…";
  }

  function paintStatRow(ctx, tiles, x, y, totalWidth, height) {
    const gap = 20;
    const tileW = (totalWidth - gap * (tiles.length - 1)) / tiles.length;

    tiles.forEach((tile, i) => {
      const tx = x + i * (tileW + gap);
      ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
      roundRect(ctx, tx, y, tileW, height, 14);
      ctx.fill();

      if (tile.kind === "haunt") {
        // Text-based tile: domain + small count line.
        // Auto-fit the domain to the tile width so long domains don't clip.
        const maxValueWidth = tileW - 32;
        let valueSize = height * 0.42;
        setFont(ctx, valueSize, "serif", 900);
        while (ctx.measureText(tile.value).width > maxValueWidth && valueSize > 14) {
          valueSize -= 2;
          setFont(ctx, valueSize, "serif", 900);
        }
        ctx.fillStyle = COLORS.ink;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tile.value, tx + tileW / 2, y + height * 0.4);

        // Sub-line ("12 TABS")
        setFont(ctx, height * 0.14, "mono", 600);
        ctx.fillStyle = COLORS.inkSoft;
        ctx.textBaseline = "alphabetic";
        ctx.fillText(tile.sub, tx + tileW / 2, y + height - height * 0.32);

        // Label
        setFont(ctx, height * 0.13, "mono", 600);
        ctx.fillStyle = COLORS.inkSoft;
        ctx.fillText(tile.label, tx + tileW / 2, y + height - 14);
      } else {
        // Number tile (DUPLICATES)
        setFont(ctx, height * 0.6, "serif", 900);
        ctx.fillStyle = COLORS.ink;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(tile.value, tx + tileW / 2, y + height * 0.42);

        setFont(ctx, height * 0.14, "mono", 600);
        ctx.fillStyle = COLORS.inkSoft;
        ctx.textBaseline = "alphabetic";
        ctx.fillText(tile.label, tx + tileW / 2, y + height - 14);
      }
    });

    // Reset for callers downstream.
    ctx.textBaseline = "alphabetic";
  }

  // ─── text helpers ─────────────────────────────────────────────────────
  function setFont(ctx, size, family, weight) {
    const stacks = {
      serif: '"Fraunces", "Instrument Serif", Georgia, serif',
      italic: '"Instrument Serif", "Fraunces", Georgia, serif',
      mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
      sans: 'system-ui, -apple-system, sans-serif'
    };
    const style = family === "italic" ? "italic" : "normal";
    ctx.font = `${style} ${weight} ${size}px ${stacks[family] || stacks.sans}`;
  }

  function wrapText(ctx, text, cx, y, maxWidth, lineHeight, maxLines) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    // Truncate to maxLines (if provided), with an ellipsis on the last line.
    let out = lines;
    if (maxLines && lines.length > maxLines) {
      out = lines.slice(0, maxLines);
      let last = out[maxLines - 1];
      const ellipsis = "…";
      while (last && ctx.measureText(last + ellipsis).width > maxWidth) {
        last = last.slice(0, -1).trimEnd();
      }
      out[maxLines - 1] = (last || "").trimEnd() + ellipsis;
    }

    const startY = y - ((out.length - 1) * lineHeight) / 2;
    out.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight));
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function formatMonthYear(d) {
    return d.toLocaleString(undefined, { month: "long", year: "numeric" });
  }

  ROOT.cardRenderer = { renderCard, downloadCard, downloadAllCards, FORMATS };
})();
