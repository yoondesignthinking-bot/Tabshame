/*
 * TabShame website — interactivity layer.
 *
 * Five small machines, all vanilla:
 *   1. Reveal-on-scroll          (Intersection Observer)
 *   2. Sticky topbar visibility  (Intersection Observer on the hero)
 *   3. Numbers chapter           (tab count + caption morph based on scroll
 *                                 progress through the pinned chapter)
 *   4. Browser simulator chapter (tabs pop in, persona pill appears, then
 *                                 the diagnosis reveal — driven by scroll
 *                                 progress)
 *   5. Reduced motion check      (degrades the simulator + counters
 *                                 gracefully if the user prefers no motion)
 *
 * No frameworks, no dependencies. ~150 lines.
 */

(function () {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // ─── 1. Reveal-on-scroll ─────────────────────────────────────────────
  // Each .reveal element fades+translates in when it crosses the viewport
  // threshold. data-delay (ms) staggers neighboring elements.
  function initReveals() {
    const items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const delay = parseInt(entry.target.dataset.delay || "0", 10);
          if (delay > 0) {
            setTimeout(() => entry.target.classList.add("is-visible"), delay);
          } else {
            entry.target.classList.add("is-visible");
          }
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    items.forEach((el) => io.observe(el));
  }

  // ─── 2. Sticky topbar appears after the hero leaves the viewport ─────
  function initTopbar() {
    const topbar = document.getElementById("topbar");
    const hero = document.getElementById("hero");
    if (!topbar || !hero) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        // Hero out of view → show topbar. Hero in view → hide topbar.
        topbar.classList.toggle("is-visible", !entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    io.observe(hero);
  }

  // ─── 3. Numbers chapter (pinned) ─────────────────────────────────────
  // While the user scrolls through chapter-numbers, the big number climbs
  // from 12 → 412 and the caption swaps through 4 lines. Driven by the
  // scroll progress of the chapter element.
  function initNumbersChapter() {
    const chapter = document.querySelector(".chapter-numbers");
    const bigEl   = document.getElementById("numbersBig");
    const capEl   = document.getElementById("numbersCaption");
    if (!chapter || !bigEl || !capEl) return;

    const STAGES = [
      { count:  12, caption: "You have tabs.",                stage: 0 },
      { count:  47, caption: "A lot of tabs.",                stage: 1 },
      { count: 127, caption: "Too many tabs.",                stage: 2 },
      { count: 412, caption: "And nobody told you what they mean.", stage: 3 }
    ];

    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = chapter.getBoundingClientRect();
        // Progress 0→1 as the chapter scrolls through the viewport.
        const total = rect.height - window.innerHeight;
        const progress = Math.max(0, Math.min(1, -rect.top / total));
        const idx = Math.min(
          STAGES.length - 1,
          Math.floor(progress * STAGES.length)
        );
        const stage = STAGES[idx];
        if (bigEl.textContent !== String(stage.count)) {
          bigEl.textContent = String(stage.count);
          capEl.style.opacity = "0";
          setTimeout(() => {
            capEl.textContent = stage.caption;
            capEl.style.opacity = "1";
          }, 180);
        }
        chapter.dataset.stage = String(stage.stage);
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ─── 4. Browser simulator chapter (pinned) ───────────────────────────
  // Scroll progress drives:
  //   0.00 → 0.55  add tabs one at a time
  //   0.55 → 0.70  persona pill flies in
  //   0.70 → 1.00  diagnosis reveal block appears in the browser body
  function initDiagnosisChapter() {
    const chapter   = document.querySelector(".chapter-diagnosis");
    const tabsEl    = document.getElementById("browserTabs");
    const pillEl    = document.getElementById("browserPill");
    const urlEl     = document.getElementById("browserUrl");
    const revealEl  = document.getElementById("diagnosisReveal");
    const headline  = document.getElementById("diagnosisHeadline");
    if (!chapter || !tabsEl) return;

    // Faux LinkedIn-profile tab titles. Each gets popped into the strip in
    // order as the user scrolls.
    const TABS = [
      "Alex Chen · Sr. Recruiter",
      "Priya Singh · Talent Partner",
      "James Park · Hiring Manager",
      "Sofia Ruiz · Head of Eng",
      "Lin Wei · Founding Eng",
      "Daniel Kim · Engineering Lead",
      "Maya Patel · Head of People"
    ];
    const MAX_TABS = TABS.length;

    let currentTabs = 0;
    let pillShown = false;
    let revealShown = false;
    let frame = 0;

    function setTabCount(target) {
      target = Math.max(0, Math.min(MAX_TABS, target));
      while (currentTabs < target) {
        const idx = currentTabs;
        const tab = document.createElement("div");
        tab.className = "browser-tab";
        tab.innerHTML =
          '<span class="browser-tab-fav"></span>' +
          '<span class="browser-tab-title">' + TABS[idx] + '</span>';
        tabsEl.appendChild(tab);
        currentTabs += 1;
      }
      while (currentTabs > target) {
        const last = tabsEl.querySelector(".browser-tab:last-child");
        if (!last) break;
        last.remove();
        currentTabs -= 1;
      }
      if (urlEl) {
        urlEl.textContent =
          currentTabs > 0
            ? `linkedin.com/in/${TABS[currentTabs - 1].split(" ")[0].toLowerCase()}`
            : "linkedin.com/in/…";
      }
    }

    function setPill(visible) {
      if (visible === pillShown) return;
      pillEl.hidden = !visible;
      pillShown = visible;
    }

    function setReveal(visible) {
      if (visible === revealShown) return;
      revealEl.hidden = !visible;
      revealShown = visible;
    }

    function setHeadline(text) {
      if (headline.textContent.trim() === text) return;
      headline.style.opacity = "0";
      setTimeout(() => {
        headline.innerHTML = text;
        headline.style.opacity = "1";
      }, 180);
    }

    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = chapter.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const progress = Math.max(0, Math.min(1, -rect.top / total));

        if (progress < 0.55) {
          // Tabs phase — 0..MAX over progress 0..0.55
          const target = Math.round((progress / 0.55) * MAX_TABS);
          setTabCount(target);
          setPill(false);
          setReveal(false);
          if (target < 3) {
            setHeadline("Open 5 tabs of the same flavor…");
          } else if (target < 5) {
            setHeadline("…and the tab strip starts looking like a confession…");
          } else {
            setHeadline("…and we drop a label on it.");
          }
        } else if (progress < 0.7) {
          // Pill phase
          setTabCount(MAX_TABS);
          setPill(true);
          setReveal(false);
          setHeadline("…and we drop a label on it.");
        } else {
          // Reveal phase
          setTabCount(MAX_TABS);
          setPill(true);
          setReveal(true);
          setHeadline("Then a roast. Then a share card. Then a screenshot.");
        }
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ─── 5. Init ─────────────────────────────────────────────────────────
  function init() {
    initReveals();
    initTopbar();
    if (!prefersReducedMotion) {
      initNumbersChapter();
      initDiagnosisChapter();
    } else {
      // Reduced motion: jump straight to the end-state of each pinned
      // chapter so the user still sees the payoff.
      const big = document.getElementById("numbersBig");
      const cap = document.getElementById("numbersCaption");
      if (big && cap) {
        big.textContent = "412";
        cap.textContent = "And nobody told you what they mean.";
      }
      const tabsEl = document.getElementById("browserTabs");
      const pill   = document.getElementById("browserPill");
      const reveal = document.getElementById("diagnosisReveal");
      if (tabsEl) {
        ["Alex Chen", "Priya Singh", "James Park", "Sofia Ruiz", "Lin Wei"].forEach((n) => {
          const t = document.createElement("div");
          t.className = "browser-tab";
          t.innerHTML = '<span class="browser-tab-fav"></span><span class="browser-tab-title">' + n + '</span>';
          tabsEl.appendChild(t);
        });
      }
      if (pill) pill.hidden = false;
      if (reveal) reveal.hidden = false;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
