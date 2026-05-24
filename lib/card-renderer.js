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
 *   2. Shame score + 1-line breakdown sits as a secondary layer below.
 *   3. Archetype name is the emotional payoff.
 *   4. Two tiles only: DUPLICATES + TOP HAUNT. Oldest-age cut.
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `tabshame-${format}-${Date.now()}.png`;
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
  //   header eyebrow · TAB COUNT (hero) · score line · archetype · tiles · roast · footer
  //
  // Tab count is in the shame-red color (was the score's color). It carries
  // the identity. The score sits beneath as a smaller "SHAME SCORE 68 ·
  // formula" line, so anyone looking can see why the score is what it is.
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

    // Score line + breakdown — secondary, italic so it reads as commentary.
    setFont(ctx, 16, "italic", 400);
    ctx.fillStyle = COLORS.inkSoft;
    ctx.fillText(`Shame Score ${report.score}  ·  ${report.breakdown.formula}`, cx, 405);

    // Archetype
    setFont(ctx, 28, "serif", 700);
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(`${report.archetype.emoji}  ${report.archetype.name}`, cx, 448);

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
    ctx.fillText("TABSHAME.APP", pad, fmt.height - 28);
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

    // Score line + breakdown
    setFont(ctx, 22, "italic", 400);
    ctx.fillStyle = COLORS.inkSoft;
    wrapText(ctx, `Shame Score ${report.score}  ·  ${report.breakdown.formula}`, cx, 705, fmt.width - pad * 2, 28, 2);

    // Archetype
    setFont(ctx, 46, "serif", 700);
    ctx.fillStyle = COLORS.ink;
    wrapText(ctx, `${report.archetype.emoji}  ${report.archetype.name}`, cx, 800, fmt.width - pad * 2, 56, 2);

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
    ctx.fillText("TABSHAME.APP", pad, fmt.height - 50);
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

    // Score + breakdown
    setFont(ctx, 26, "italic", 400);
    ctx.fillStyle = COLORS.inkSoft;
    wrapText(ctx, `Shame Score ${report.score}  ·  ${report.breakdown.formula}`, cx, 990, fmt.width - pad * 2, 34, 2);

    // Archetype
    setFont(ctx, 56, "serif", 700);
    ctx.fillStyle = COLORS.ink;
    wrapText(ctx, `${report.archetype.emoji}  ${report.archetype.name}`, cx, 1130, fmt.width - pad * 2, 64, 2);

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
    ctx.fillText("TABSHAME.APP", pad, fmt.height - 70);
    ctx.textAlign = "right";
    ctx.fillText("ALL DATA STAYS LOCAL", fmt.width - pad, fmt.height - 70);
  }

  // Two tiles only (per audit — oldest age cut). Tile 1 is the duplicate
  // count (number). Tile 2 is the "top haunt" (the most-tabbed domain) —
  // text-based, so the renderer treats it differently to keep typography
  // legible at multiple sizes.
  function makeStatTiles(report) {
    const top = (report.stats.topDomains || [])[0];
    const haunt = top
      ? { primary: truncateDomain(top.domain, 16), secondary: `${top.count} TABS` }
      : { primary: "—", secondary: "NO HAUNTS YET" };

    return [
      { kind: "number", label: "DUPLICATES", value: String(report.stats.duplicateCount) },
      { kind: "haunt", label: "TOP HAUNT", value: haunt.primary, sub: haunt.secondary }
    ];
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

  ROOT.cardRenderer = { renderCard, downloadCard, FORMATS };
})();
