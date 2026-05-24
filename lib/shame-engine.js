/*
 * shame-engine.js
 *
 * Two responsibilities:
 *   1. Compute the Shame Score (0-100) from a tab snapshot.
 *   2. Hydrate roast templates with real numbers from the diagnosis.
 *
 * Pure functions — no chrome.* access. Easy to reason about.
 */

(function () {
  const ROOT = (globalThis.TabShame = globalThis.TabShame || {});

  const SCORE_BANDS = [
    { min: 0, max: 29, label: "Suspiciously low. Are you... okay?" },
    { min: 30, max: 49, label: "Impressively mediocre chaos." },
    { min: 50, max: 69, label: "Solid hoarder energy." },
    { min: 70, max: 89, label: "Top 10% globally. Concerning." },
    { min: 90, max: 100, label: "Top 1%. Your laptop fan wrote a song about you." }
  ];

  function computeScore(stats) {
    return computeScoreBreakdown(stats).total;
  }

  // Returns { total, parts: [{label, value, contribution}, ...], formula }.
  // The parts let the UI render a legible breakdown line so the score isn't
  // a black-box number. Audit: users couldn't tell why they scored 66 vs 34.
  function computeScoreBreakdown(stats) {
    const tabCount = stats.tabCount || 0;
    const oldestTabDays = stats.oldestAgeDays || 0;
    const duplicateCount = stats.duplicateCount || 0;
    const tabsOverOneWeek = stats.tabsOverOneWeek || 0;

    const parts = [
      { key: "tabs", label: "tabs", value: tabCount, weight: 0.5 },
      { key: "weekOld", label: "week-old", value: tabsOverOneWeek, weight: 2 },
      { key: "dupes", label: "duplicates", value: duplicateCount, weight: 3 },
      { key: "oldestDays", label: "days oldest", value: oldestTabDays, weight: 1.5 }
    ].map((p) => ({ ...p, contribution: p.value * p.weight }));

    const raw = parts.reduce((sum, p) => sum + p.contribution, 0);
    const total = Math.max(0, Math.min(100, Math.round(raw)));

    // Formula string only includes parts that actually contributed. Skips
    // zero-value pieces so the line stays readable on a small popup.
    const phrases = parts
      .filter((p) => p.value > 0 && p.contribution > 0)
      .map((p) => `${p.value} ${p.label}`);
    const formula = phrases.length ? `${phrases.join(" + ")} = ${total}` : `0 = 0`;

    return { total, parts, formula };
  }

  function bandFor(score) {
    return SCORE_BANDS.find((b) => score >= b.min && score <= b.max) || SCORE_BANDS[0];
  }

  function tabsOverOneWeek(tabs, now = Date.now()) {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return tabs.filter((t) => now - (t.openedAt || now) > sevenDays).length;
  }

  // ─── template hydration ───────────────────────────────────────────────
  // Replaces ${name} placeholders with values from `vars`. Missing names
  // resolve to a soft fallback rather than printing literal "${...}" — that
  // would feel broken to the user.
  function hydrate(template, vars) {
    return template.replace(/\$\{(\w+)\}/g, (_, key) => {
      const v = vars[key];
      if (v === undefined || v === null) return "a few";
      return String(v);
    });
  }

  // Picks one roast template per call. Deterministic-but-rotating pick based
  // on the day-of-year so the popup doesn't feel jittery if you reopen it,
  // but the weekly/monthly reports rotate.
  function pickRoast(diagnosis, opts = {}) {
    const templates = diagnosis.roastTemplates || [];
    if (templates.length === 0) return "";
    const seed = opts.seed != null ? opts.seed : daySeed();
    const idx = seed % templates.length;
    return hydrate(templates[idx], diagnosis.vars || {});
  }

  function pickAllRoasts(diagnosis) {
    return (diagnosis.roastTemplates || []).map((t) => hydrate(t, diagnosis.vars || {}));
  }

  function daySeed() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  }

  // ─── full report assembly ─────────────────────────────────────────────
  // Takes a diagnosis + raw tab list, returns the data the popup, weekly,
  // and monthly views all consume. One source of truth.
  function buildReport(diagnosis, tabs, opts = {}) {
    const now = opts.now || Date.now();
    const overWeek = tabsOverOneWeek(tabs, now);
    const stats = {
      ...diagnosis.stats,
      tabsOverOneWeek: overWeek
    };
    const breakdown = computeScoreBreakdown(stats);
    const score = breakdown.total;
    const band = bandFor(score);

    return {
      generatedAt: now,
      score,
      breakdown,
      band,
      archetype: {
        id: diagnosis.archetypeId,
        name: diagnosis.name,
        emoji: diagnosis.emoji,
        category: diagnosis.category,
        description: diagnosis.description
      },
      stats,
      roast: pickRoast(diagnosis, opts),
      allRoasts: pickAllRoasts(diagnosis)
    };
  }

  ROOT.shameEngine = {
    computeScore,
    computeScoreBreakdown,
    bandFor,
    tabsOverOneWeek,
    hydrate,
    pickRoast,
    pickAllRoasts,
    buildReport,
    SCORE_BANDS
  };
})();
