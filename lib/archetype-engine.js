/*
 * archetype-engine.js
 *
 * Diagnoses a single primary archetype from a snapshot of tracked tabs.
 *
 * Pipeline:
 *   tabs → normalized records → for each archetype, evaluate every rule
 *        → if all rules pass, archetype matches and exposes its variables
 *        → resolve ties by priority (higher wins)
 *        → fall back to Tab Maximalist (>=200 tabs) or Casual Hoarder
 *
 * The engine is pure — it takes a tab list and the archetype catalogue and
 * returns a diagnosis object. No storage access here. Easier to test.
 */

(function () {
  const ROOT = (globalThis.TabShame = globalThis.TabShame || {});

  // Universal trigger threshold: every primary detection rule in
  // domain-rules.js requires at least PERSONA_TRIGGER_MIN matching tabs of
  // the persona's domain category before that persona fires (e.g. 5 YouTube
  // tabs unlock The YouTube Rabbit-Holer, 5 LinkedIn tabs unlock The
  // LinkedIn Lurker). If no persona reaches its threshold, the engine falls
  // through to Casual Hoarder. background.js watches for the
  // casual_hoarder → specific transition and fires a notification when a
  // user crosses any persona's threshold for the first time.
  //
  // This constant is documentary — the actual mins live in each rule. Kept
  // here so a future audit can grep the codebase for "persona trigger" and
  // find the canonical source.
  const PERSONA_TRIGGER_MIN = 5;

  // ─── normalization ─────────────────────────────────────────────────────
  function hostnameOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (_e) {
      return "";
    }
  }

  function pathOf(url) {
    try {
      return new URL(url).pathname;
    } catch (_e) {
      return "";
    }
  }

  function isLocalhost(url) {
    try {
      const u = new URL(url);
      return u.hostname === "localhost" || u.hostname === "127.0.0.1";
    } catch (_e) {
      return false;
    }
  }

  function localhostKey(url) {
    // Each unique port (or path under root) counts as a separate localhost shrine.
    try {
      const u = new URL(url);
      return `${u.hostname}:${u.port || "default"}${u.pathname}`;
    } catch (_e) {
      return url;
    }
  }

  function domainMatches(host, domainPattern) {
    // domainPattern can be "linkedin.com" (matches subdomains too) or
    // "google.com/flights" (matches host + url path prefix).
    if (domainPattern.includes("/")) {
      // Caller must use urlIncludes for path matching, but allow host-only too.
      const [d] = domainPattern.split("/");
      return host === d || host.endsWith("." + d);
    }
    return host === domainPattern || host.endsWith("." + domainPattern);
  }

  function urlContains(url, needle) {
    if (!needle) return true;
    return url.toLowerCase().includes(needle.toLowerCase());
  }

  // ─── rule evaluators ───────────────────────────────────────────────────
  // Each evaluator returns { matched: boolean, value: number } where value is
  // the number that gets exported as the rule's variable for templates.
  const evaluators = {
    domainCount(rule, ctx) {
      const matches = ctx.tabs.filter(
        (t) =>
          domainMatches(t.hostname, rule.domain) &&
          urlContains(t.url, rule.urlIncludes)
      );
      return { matched: matches.length >= rule.min, value: matches.length };
    },

    domainsAnyCount(rule, ctx) {
      const matches = ctx.tabs.filter(
        (t) =>
          rule.domains.some((d) => domainMatches(t.hostname, d)) &&
          urlContains(t.url, rule.urlIncludes)
      );
      return { matched: matches.length >= rule.min, value: matches.length };
    },

    domainsAllCount(rule, _ctx) {
      // domainGroups is an array of arrays. Each group must have at least
      // `min` tabs matching ANY domain in the group. matched = all groups pass.
      let matchedGroups = 0;
      let total = 0;
      for (const group of rule.domainGroups) {
        const groupTabs = _ctx.tabs.filter((t) =>
          group.some((d) => domainMatches(t.hostname, d))
        );
        if (groupTabs.length >= rule.min) matchedGroups += 1;
        total += groupTabs.length;
      }
      return {
        matched: matchedGroups === rule.domainGroups.length,
        value: total
      };
    },

    duplicateUrl(rule, ctx) {
      // Same EXACT url appearing N+ times. Optionally scoped to a domain.
      const counts = new Map();
      for (const t of ctx.tabs) {
        if (rule.scopeDomain && !domainMatches(t.hostname, rule.scopeDomain)) {
          continue;
        }
        counts.set(t.url, (counts.get(t.url) || 0) + 1);
      }
      let max = 0;
      for (const [, c] of counts) if (c > max) max = c;
      return { matched: max >= rule.min, value: max };
    },

    duplicateHostnameWithVariations(rule, ctx) {
      // 6+ tabs whose hostname matches one of `domains` AND whose URLs are
      // distinct but share a path stem (proxy for "same product different SKU").
      const matches = ctx.tabs.filter((t) =>
        rule.domains.some((d) => domainMatches(t.hostname, d))
      );
      const urls = new Set(matches.map((t) => t.url));
      // Distinct URLs >= min, AND total matches >= min (so 6+ different SKUs).
      return {
        matched: urls.size >= rule.min && matches.length >= rule.min,
        value: matches.length
      };
    },

    localhostCount(rule, ctx) {
      const localhostTabs = ctx.tabs.filter((t) => isLocalhost(t.url));
      const distinct = new Set(localhostTabs.map((t) => localhostKey(t.url)));
      return { matched: distinct.size >= rule.min, value: distinct.size };
    },

    titleContains(rule, ctx) {
      const matches = ctx.tabs.filter(
        (t) =>
          domainMatches(t.hostname, rule.domain) &&
          (t.title || "").toLowerCase().includes(rule.needle.toLowerCase())
      );
      return { matched: matches.length >= rule.min, value: matches.length };
    },

    oldestAgeDays(rule, ctx) {
      return {
        matched: ctx.oldestAgeDays >= rule.min,
        value: Math.floor(ctx.oldestAgeDays)
      };
    },

    tabCount(rule, ctx) {
      return { matched: ctx.tabs.length >= rule.min, value: ctx.tabs.length };
    },

    timeOfDayHours(rule, ctx) {
      const [start, end] = rule.between;
      const h = ctx.now.getHours();
      const inRange = start <= end ? h >= start && h < end : h >= start || h < end;
      return { matched: inRange, value: inRange ? 1 : 0 };
    }
  };

  // ─── diagnose() — main entry point ─────────────────────────────────────
  function diagnose(tabRecords, opts = {}) {
    const now = opts.now || new Date();
    const tabs = (tabRecords || []).map((t) => ({
      id: t.id,
      url: t.url || "",
      hostname: t.hostname || hostnameOf(t.url || ""),
      title: t.title || "",
      openedAt: t.openedAt || now.getTime(),
      lastActiveAt: t.lastActiveAt || t.openedAt || now.getTime()
    }));

    const oldestOpenedAt = tabs.reduce(
      (min, t) => (t.openedAt < min ? t.openedAt : min),
      now.getTime()
    );
    const oldestAgeDays = (now.getTime() - oldestOpenedAt) / (1000 * 60 * 60 * 24);

    const ctx = { tabs, now, oldestAgeDays };
    const archetypes = ROOT.ARCHETYPES || [];
    const fallback =
      archetypes.find((a) => a.archetypeId === "casual_hoarder") ||
      archetypes[archetypes.length - 1];

    const candidates = [];
    for (const archetype of archetypes) {
      // The catch-all only fires as a literal fallback when no specific
      // persona's trigger threshold is met. Skip it during evaluation.
      if (archetype.archetypeId === "casual_hoarder") continue;

      const ruleResults = [];
      let allMatched = true;

      for (const rule of archetype.rules) {
        const evaluator = evaluators[rule.type];
        if (!evaluator) {
          console.warn(`[TabShame] Unknown rule type: ${rule.type}`);
          allMatched = false;
          break;
        }
        const result = evaluator(rule, ctx);
        ruleResults.push({ rule, result });
        if (!result.matched) {
          allMatched = false;
          break;
        }
      }

      if (allMatched) {
        const vars = computeVars(ruleResults, ctx);
        candidates.push({ archetype, vars });
      }
    }

    // Highest priority wins. Stable sort — first declaration wins ties.
    candidates.sort((a, b) => (b.archetype.priority || 0) - (a.archetype.priority || 0));
    const chosen = candidates[0] || {
      archetype: fallback,
      vars: { tabCount: tabs.length }
    };

    return {
      archetypeId: chosen.archetype.archetypeId,
      name: chosen.archetype.name,
      emoji: chosen.archetype.emoji,
      category: chosen.archetype.category,
      description: chosen.archetype.description,
      vars: chosen.vars,
      roastTemplates: chosen.archetype.roastTemplates,
      stats: {
        tabCount: tabs.length,
        oldestAgeDays: Math.floor(oldestAgeDays),
        topDomains: topDomains(tabs, 5),
        duplicateCount: duplicateCount(tabs)
      }
    };
  }

  // ─── helpers ───────────────────────────────────────────────────────────
  function computeVars(ruleResults, ctx) {
    const vars = { tabCount: ctx.tabs.length };
    for (const { rule, result } of ruleResults) {
      if (rule.var) vars[rule.var] = result.value;
    }
    return vars;
  }

  function topDomains(tabs, n) {
    const counts = new Map();
    for (const t of tabs) {
      const h = t.hostname || hostnameOf(t.url);
      if (!h) continue;
      counts.set(h, (counts.get(h) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([domain, count]) => ({ domain, count }));
  }

  function duplicateCount(tabs) {
    const seen = new Map();
    let dupes = 0;
    for (const t of tabs) {
      const c = (seen.get(t.url) || 0) + 1;
      seen.set(t.url, c);
      if (c >= 2) dupes += 1;
    }
    return dupes;
  }

  // ─── matchingTabIds — pure helper for "which tabs triggered this persona?" ─
  // Used by background.js to know which tabs to group together when a
  // persona is detected. Returns an array of tab IDs that satisfy the
  // archetype's primary detection signals.
  //
  // We deliberately skip pure qualifier rules (timeOfDayHours, oldestAgeDays,
  // tabCount) because they aren't tab-identifying — they just gate whether
  // the persona fires. For mixed rules (titleContains qualifies a domain),
  // we use the domain to widen the selection so the resulting tab group
  // contains the user's whole Figma/Booking/etc. collection, not just the
  // tabs matching the literal title needle.
  //
  // For casual_hoarder and tab_maximalist we return [] — grouping the
  // catch-alls would scoop up every tab in the browser, which isn't useful.
  function matchingTabIds(archetype, tabRecords) {
    if (!archetype || !tabRecords || !tabRecords.length) return [];
    if (archetype.archetypeId === "casual_hoarder") return [];
    if (archetype.archetypeId === "tab_maximalist") return [];

    const ids = new Set();
    for (const rule of archetype.rules || []) {
      if (rule.type === "domainCount") {
        tabRecords.forEach((t) => {
          if (
            domainMatches(t.hostname || hostnameOf(t.url), rule.domain) &&
            urlContains(t.url, rule.urlIncludes)
          ) ids.add(t.id);
        });
      } else if (rule.type === "domainsAnyCount") {
        tabRecords.forEach((t) => {
          const h = t.hostname || hostnameOf(t.url);
          if (
            rule.domains.some((d) => domainMatches(h, d)) &&
            urlContains(t.url, rule.urlIncludes)
          ) ids.add(t.id);
        });
      } else if (rule.type === "domainsAllCount") {
        for (const group of rule.domainGroups || []) {
          tabRecords.forEach((t) => {
            const h = t.hostname || hostnameOf(t.url);
            if (group.some((d) => domainMatches(h, d))) ids.add(t.id);
          });
        }
      } else if (rule.type === "duplicateUrl") {
        // Collect tabs whose URL appears >= rule.min times (within scope).
        const counts = new Map();
        tabRecords.forEach((t) => {
          if (rule.scopeDomain &&
              !domainMatches(t.hostname || hostnameOf(t.url), rule.scopeDomain)) return;
          counts.set(t.url, (counts.get(t.url) || 0) + 1);
        });
        tabRecords.forEach((t) => {
          if (rule.scopeDomain &&
              !domainMatches(t.hostname || hostnameOf(t.url), rule.scopeDomain)) return;
          if ((counts.get(t.url) || 0) >= rule.min) ids.add(t.id);
        });
      } else if (rule.type === "duplicateHostnameWithVariations") {
        tabRecords.forEach((t) => {
          const h = t.hostname || hostnameOf(t.url);
          if (rule.domains.some((d) => domainMatches(h, d))) ids.add(t.id);
        });
      } else if (rule.type === "localhostCount") {
        tabRecords.forEach((t) => { if (isLocalhost(t.url)) ids.add(t.id); });
      } else if (rule.type === "titleContains") {
        // Widen to the rule's domain so the group is useful, not just the
        // one tab whose title contains "FINAL".
        tabRecords.forEach((t) => {
          if (domainMatches(t.hostname || hostnameOf(t.url), rule.domain)) ids.add(t.id);
        });
      }
      // Skip: oldestAgeDays, tabCount, timeOfDayHours (pure qualifiers).
    }
    return [...ids];
  }

  ROOT.archetypeEngine = { diagnose, hostnameOf, matchingTabIds, PERSONA_TRIGGER_MIN };
})();
