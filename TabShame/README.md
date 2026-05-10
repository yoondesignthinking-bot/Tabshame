# TabShame

> Diagnoses your tab-hoarding archetype and generates shareable shame cards.
> Warm, friendly teasing — never mean. All data stays on your device.

---

## Install (load as unpacked)

You don't need a Chrome Web Store listing to use TabShame — Chrome can
load any folder as an "unpacked" extension.

1. Open Chrome (or Edge / Brave / any Chromium browser).
2. Go to `chrome://extensions`.
3. Toggle **Developer mode** ON (top right).
4. Click **Load unpacked**.
5. Select this folder (the one containing `manifest.json`).
6. The TabShame icon will appear in your toolbar — click it.

To pick up code changes, hit the ↻ (reload) button on the TabShame card
at `chrome://extensions`. Chrome will restart the service worker.

---

## What it does

- Tracks every tab you have open (URL, title, when it was opened).
- Diagnoses you into one of **33 archetypes** — e.g. _The Booking.com
  Detective_, _The localhost Shrine_, _The 3am WebMD Patient_, _The
  Recruiter Black Hole_, _The Pre-Date Detective_, _The AI Chat Hoarder_
  — plus a _Casual Hoarder_ fallback for the cases where nothing more
  specific fits.
- Shows your **tab count** as the dominant identity number, with a
  **Shame Score** and a 1-line breakdown beneath it ("47 tabs + 12
  duplicates + 3 week-old tabs = 68") so the score is never a black box.
- Generates **share cards** as PNG in three formats:
  - X/Twitter feed (1200×675, 16:9)
  - Instagram portrait (1080×1350, 4:5)
  - Instagram / TikTok story (1080×1920, 9:16)
- One-click **Close Duplicates** (free) — keeps the most recently active
  tab from each group of identical URLs and closes the rest.
- Fires a **weekly report** every Monday morning and a **monthly
  Wrapped** on the 1st of each month.

---

## Privacy

> TabShame processes all data locally on your device.
> We never see, transmit, or store your browsing data.

- Zero network requests for analytics, tracking, or processing.
- No external API calls. No LLMs. No servers.
- No accounts, no logins, no email collection.
- Incognito tabs are **not** tracked unless you explicitly opt in.
- All data lives in `chrome.storage.local` and never leaves the device.
- The only thing that leaves your device is a share card you choose
  to download and post yourself.

To inspect what's stored: `chrome://extensions` → TabShame → "Service
worker" link → DevTools → Application → Storage → IndexedDB / Local Storage.

---

## File structure

```
manifest.json                — Manifest V3 declaration
background.js                — service worker: tab tracking, alarms, messaging
popup/                       — toolbar popup (current stats)
report/                      — full Wrapped report (opens in a new tab)
lib/
  archetype-engine.js        — diagnosis pipeline (priority resolution)
  shame-engine.js            — score formula, template hydration
  card-renderer.js           — Canvas-based PNG card generation
  storage.js                 — chrome.storage.local wrapper + Premium hooks
  domain-rules.js            — all 24 archetypes (data-driven)
assets/
  icon-16.png / 48 / 128     — toolbar icons (placeholder; regenerate via _make_icons.py)
  fonts/README.txt           — how to bundle Fraunces / Instrument Serif / JetBrains Mono
README.md                    — you are here
```

---

## Manual test scenarios

Chrome's `chrome.*` APIs can't be unit-tested in Node, so verification
is by manual checklist. Run through this after any change to background.js,
the engines, or the popup/report wiring.

### Smoke

- [ ] After **Load unpacked**, the TabShame icon appears in the toolbar.
- [ ] On first install a Wrapped report opens automatically (`?welcome=1`).
- [ ] Click the toolbar icon → popup shows current tab count + score
      within ~500ms.

### Diagnosis (open these tabs, then click the icon)

> **How the trigger works**: every persona requires **5 tabs of its own
> category** to fire (5 YouTube tabs → YouTube Rabbit-Holer, 5 LinkedIn
> tabs → LinkedIn Lurker, etc.). If no persona reaches 5, the diagnosis
> is Casual Hoarder. Crossing any persona's 5-tab threshold for the
> first time fires a one-shot Chrome notification.

- [ ] **Casual Hoarder (under threshold)** — open 4 LinkedIn profile
      tabs and a few unrelated tabs. Expect: archetype = "The Casual
      Hoarder". No notification fires.
- [ ] **Transition notification** — open the 5th LinkedIn tab.
      Within ~30 seconds a Chrome notification fires:
      _"TabShame · You've earned your archetype: 💼 You're The LinkedIn
      Lurker."_ The notification fires **once** per casual → specific
      transition, not on every diagnosis.
- [ ] **No notification on first install** — uninstall + reinstall
      the extension while you have 5+ tabs already matching some
      archetype. The first diagnosis lands on the specific archetype
      directly, and **no notification fires** because there's no prior
      state.
- [ ] **No notification on demotion** — close LinkedIn tabs back down
      to 4. Diagnosis returns to Casual Hoarder silently. No notification.

- [ ] **LinkedIn Lurker** — open 5 different `linkedin.com/in/...` tabs.
      Expect: archetype = "The LinkedIn Lurker".
- [ ] **localhost Shrine** — open 5 different `localhost:PORT` tabs
      (any ports, can be 404). Expect: "The localhost Shrine".
- [ ] **Booking Detective** — open 5 different `booking.com` tabs.
      Expect: "The Booking.com Detective".
- [ ] **Stack Overflow Necromancer** — open the same SO question URL
      5 times. Expect: "The Stack Overflow Necromancer".
- [ ] **Figma Multiverse** — open 5 different Figma file tabs, with at
      least one tab title containing the word "FINAL". Expect: "The
      Figma Multiverse".
- [ ] **3am WebMD Patient** — open 5 medical tabs (`webmd.com`,
      `mayoclinic.org`, `nih.gov`). _Set your system clock to 3am
      first_, or temporarily adjust the rule's `between: [1, 5]`
      to your current hour. Expect: "The 3am WebMD Patient".
- [ ] **Tab Maximalist** — open 250+ tabs across at least 2 windows.
      Expect: archetype = "The Tab Maximalist", score = 100.
- [ ] **Casual Hoarder** (catch-all) — open 5 unrelated tabs.
      Expect: "The Casual Hoarder".

#### Backlog Tier 1 archetypes (added May 2026)

- [ ] **3am New Parent** — open 5 tabs across `babycenter.com`,
      `whattoexpect.com`, `kellymom.com`, `healthychildren.org`,
      `parents.com`, _between 1am and 5am_. Expect: "The 3am New Parent".
      _To test outside that window, temporarily change the
      `timeOfDayHours` rule in `lib/domain-rules.js` to your current hour._
- [ ] **The 11:47 PM Student** — open 5 tabs across `chatgpt.com`,
      `quillbot.com`, `scholar.google.com`, `wikipedia.org`,
      `docs.google.com` between 10pm and 2am. Expect: "The 11:47 PM Student".
- [ ] **Recruiter Black Hole** — open 5 LinkedIn tabs + 1
      `greenhouse.io` (or `lever.co`, `calendly.com`). Expect:
      "The Recruiter Black Hole" (priority 9 beats LinkedIn Lurker
      at priority 6 for the tied 5-LinkedIn case; the ATS tab is
      what differentiates them).
- [ ] **Pre-Date Detective** — open 1 `whitepages.com` (or
      `beenverified.com`) + 2 of `linkedin.com`, `instagram.com`,
      `x.com`. Expect: "The Pre-Date Detective".
- [ ] **PhD Lit Review Avoider** — open 6 tabs across `jstor.org`,
      `scholar.google.com`, `arxiv.org`, `zotero.org`, `researchgate.net`.
      Expect: "The PhD Lit Review Avoider".
- [ ] **Wedding Spreadsheet** — open 5 tabs across `theknot.com`,
      `zola.com`, `weddingwire.com`, `brides.com`, `stylemepretty.com`.
      Expect: "The Wedding Spreadsheet".
- [ ] **Mech Keyboard Hoarder** — open 5 tabs across `drop.com`,
      `novelkeys.com`, `keychron.com`, `kbdfans.com`,
      `mechanicalkeyboards.com`. Expect: "The Mech Keyboard Hoarder".
- [ ] **Worldbuilder (Not Writing)** — open 1 `worldanvil.com` + 5
      `wikipedia.org` tabs (any subject). Expect: "The Worldbuilder
      (Not Writing)".
- [ ] **AI Chat Hoarder** — open 4 tabs across `chatgpt.com`,
      `claude.ai`, `gemini.google.com`, `perplexity.ai`. Expect:
      "The AI Chat Hoarder" (unless it's late night and you also have
      research tabs open — then Midnight Student wins).

### Score behaviour

- [ ] Close all tabs except `chrome://newtab`. Open the popup.
      Score should be 0–10 (count of new-tab pages excluded).
- [ ] Open 30 tabs. Score should rise above 15.
- [ ] Open 250 tabs. Score should hit 100.

### Persistence

- [ ] Open a few tabs, wait ~10 seconds, fully quit Chrome (Cmd+Q),
      reopen Chrome. Open the popup → tab list and oldest-tab age
      should still reflect the previous session (within the limits
      of which tabs Chrome restored).
- [ ] Open and close 10 tabs in a row. Open the popup → tab count
      should not include the closed ones.

### Incognito

- [ ] Open an incognito window with 5 tabs of `linkedin.com`.
      Open the popup in a normal window → archetype should NOT change
      to LinkedIn Lurker (incognito tabs are skipped).
- [ ] Verify in DevTools (`chrome://extensions` → TabShame → Service
      worker → Application → Storage) that the incognito tabs are
      absent from the `tabs` object.

### Aging

- [ ] Open a tab. Wait several days. The "OLDEST · DAYS" tile in the
      popup should show the elapsed days.
- [ ] To accelerate testing, open the service worker DevTools
      (chrome://extensions → "Service worker" link) and run:

      ```js
      chrome.storage.local.get('tabs', ({ tabs }) => {
        for (const k of Object.keys(tabs)) {
          tabs[k].openedAt = Date.now() - 10 * 24 * 60 * 60 * 1000;
        }
        chrome.storage.local.set({ tabs });
      });
      ```

      Then reopen the popup — oldest age should read ~10 days.

### Cards

- [ ] In the popup, click **Generate share card** → a PNG named
      `tabshame-twitter-<timestamp>.png` downloads.
- [ ] Open that PNG. Dimensions should be exactly **1200×675**. The
      **tab count** number should dominate (was the score pre-audit),
      readable even when shrunk to ~200px wide (X feed thumbnail size).
- [ ] In the full report (`Open full report` button), click **Download
      IG card** → PNG with dimensions exactly **1080×1350**.
- [ ] Click **Download story card** → PNG with dimensions exactly
      **1080×1920**. Tab count is even larger here; one-line score
      breakdown sits beneath ("47 tabs + 12 dupes = 59").

### Cleanup actions

- [ ] Open 5 tabs, then duplicate one of them 3 times (cmd-click the
      tab to duplicate, or just open the same URL again). The popup
      should show DUPLICATES = 3 and the "Close duplicate tabs"
      button should be enabled.
- [ ] Click **Close duplicate tabs**. Three of the four duplicate tabs
      close (the most recently active one survives). The popup label
      flashes "Closed 3 dups ✓" then resets, and the duplicate count
      drops to 0.
- [ ] When duplicates = 0, the cleanup button should be disabled with
      a hover tooltip "Nothing to close — no duplicates detected".
- [ ] In the full report's **Cleanup** section, the three Pro buttons
      (close by age, close by domain, save session) should appear
      visually locked (dashed border, "Pro · …" sub-label). Clicking
      them does nothing.

### Pro hooks (verify they're inert in v1)

In the service worker DevTools console:
```js
// Should resolve with { ok: true, gated: true, message: "This is a TabShame Pro feature." }
chrome.runtime.sendMessage({ type: "CLOSE_OLDER_THAN", days: 7 }, console.log);
chrome.runtime.sendMessage({ type: "CLOSE_BY_DOMAIN", domain: "linkedin.com" }, console.log);
```

To temporarily test the Pro path manually:
```js
// Force-enable in storage, then re-fire the same message — it executes.
chrome.storage.local.set({ isPremium: true, featureFlags: { smartCleanupByAge: true } });
// REMEMBER to undo:
chrome.storage.local.set({ isPremium: false, featureFlags: {} });
```

### Session history (collected silently)

- [ ] Open the popup (or report). In the service-worker DevTools:
      ```js
      chrome.storage.local.get('sessionHistory', (r) => console.log(r.sessionHistory));
      ```
      Expect: an array with one entry per day you've opened the
      extension, each shaped `{dateKey, ts, tabCount, score, archetypeId, duplicateCount}`.
      Capped at 60 entries.

### Notifications / alarms

- [ ] In the service worker DevTools console, run:

      ```js
      chrome.runtime.sendMessage({ type: 'TRIGGER_REPORT_NOTIFICATION', kind: 'weekly' });
      ```

      Expect: a Chrome notification "Your weekly shame is ready 👀".
- [ ] Click the notification → opens `report/report.html` in a new tab.
- [ ] Repeat with `kind: 'monthly'` → notification reads "Your TabShame
      Wrapped is ready."

### Archetype catalogue

- [ ] Confirm all 24 archetypes have ≥3 distinct roast templates each.
      Quick check from the service worker console:

      ```js
      console.table(
        TabShame.ARCHETYPES.map(a => ({
          id: a.archetypeId,
          templates: a.roastTemplates.length
        }))
      );
      ```

      Every row should show `templates ≥ 3`. The catalogue currently
      contains **34 entries**: 33 specific archetypes (24 from the
      original brief + 9 promoted from the May 2026 backlog Tier 1)
      plus `casual_hoarder` as a strict catch-all fallback so the
      diagnose pipeline always returns a result.

---

## Persona trigger threshold + transition notification (May 2026)

Every persona requires **at least 5 tabs of its own category** before
it fires:

- 5 YouTube tabs unlock _The YouTube Rabbit-Holer_
- 5 LinkedIn tabs unlock _The LinkedIn Lurker_
- 5 Booking.com / Hotels.com tabs unlock _The Booking.com Detective_
- 5 ChatGPT / Claude / Gemini tabs unlock _The AI Chat Hoarder_
- …and so on for every archetype

If **no persona reaches its 5-tab threshold**, the diagnosis falls
through to **Casual Hoarder**. The constant
`PERSONA_TRIGGER_MIN = 5` is documented in
[`lib/archetype-engine.js`](lib/archetype-engine.js) and the actual
`min: 5` lives on each rule in
[`lib/domain-rules.js`](lib/domain-rules.js).

### Exceptions (deliberate)

A handful of rules don't follow the flat 5-tab rule because they're
**qualifiers**, not primary detection signals:

| Archetype | Qualifier | Why it's not 5 |
|-----------|-----------|----------------|
| Figma Multiverse | 1+ tab title contains "FINAL" | Filename signal, separate from tab count |
| Meeting Multiverse | 1+ tab in each of 4 tool groups | Multi-tool simultaneous-use signal |
| Eternal Read-Later | oldest tab age ≥ 14 days | Age qualifier on top of 5+ articles |
| Stack Overflow Necromancer | same exact URL appears 5+ times | Duplicate-URL signal (5 of literally the same answer) |
| 3am WebMD / 3am New Parent / 11:47 PM Student | local hour in a window | Time qualifier on top of 5+ tabs |
| Pre-Date Detective | 1+ people-search domain + 2+ social profiles | Rare-but-strong people-search tab is the signal |
| Worldbuilder | 1+ World Anvil/Kanka tab + 5+ Wikipedia tabs | Worldbuilding tool is the qualifier |
| Recruiter Black Hole | 5+ LinkedIn AND 1+ ATS (Greenhouse/Lever/etc.) | The ATS tab differentiates recruiter from job-seeker; priority 9 means it wins ties with LinkedIn Lurker |
| Tab Maximalist | 200+ total tabs | Extreme catch — different signal entirely |

### Casual Hoarder → specific transition notification

The Casual Hoarder fallback fires whenever no persona reaches its
threshold. When the user opens enough tabs to cross _any_ persona's
5-tab threshold, a one-shot Chrome notification fires:

> **TabShame · You've earned your archetype**
> 💼  You're The LinkedIn Lurker. Tap to see your card.

Click → opens `report/report.html?kind=transition`.

The notification is suppressed on:
- **First install** (no prior `lastArchetypeId` stored — we don't pop
  on the very first diagnosis).
- **Specific → Casual Hoarder demotion** (closing tabs is silent).
- **Specific → specific transitions** (e.g. LinkedIn Lurker becoming
  Recruiter Black Hole as you open an ATS tab).

### How transitions are detected

Two paths feed the same `notifyArchetypeTransition()`:

1. **Active**: every popup or report open calls `buildLiveReport()`,
   which runs the transition check after diagnosing.
2. **Passive**: every `chrome.tabs.onCreated` / `onUpdated` /
   `onRemoved` re-arms a `tabshame_transition_check` alarm 30s out.
   Re-arming overwrites by name, so a burst of tab activity collapses
   to one diagnosis ~30s after the last event. Users get notified
   within 30 seconds of crossing a threshold even if they never open
   the popup.

### Tuning the threshold

The 5-tab number lives on each `min:` value in
[`lib/domain-rules.js`](lib/domain-rules.js). To change the global
threshold, sweep all primary `domainCount` / `domainsAnyCount` rules
to the new value. The `PERSONA_TRIGGER_MIN` constant in
`archetype-engine.js` is documentary — grep for it to find every
related code path.

## Backlog Tier 1 promoted (May 2026)

Nine archetypes promoted from the strategy backlog, slotted into the
priority chain so they don't crowd out specifics:

| New archetype | Priority | Beats |
|---------------|----------|-------|
| The 3am New Parent | 9 | catch-alls; ties with 3am WebMD (declared earlier wins) |
| The Recruiter Black Hole | 9 | LinkedIn Lurker (was the lone recruiter signal) |
| The Pre-Date Detective | 9 | LinkedIn Lurker for any user with people-search + 2 socials |
| The 11:47 PM Student | 8 | AI Chat Hoarder during late-night study |
| The PhD Lit Review Avoider | 8 | Phantom Researcher for academic users |
| The Mech Keyboard Hoarder | 8 | Casual Hoarder; very specific domain set |
| The Worldbuilder (Not Writing) | 8 | YouTube Rabbit-Holer for users with worldanvil + Wikipedia |
| The Wedding Spreadsheet | 7 | LinkedIn Lurker / Phantom Researcher for engaged users |
| The AI Chat Hoarder | 7 | Phantom Researcher for users with 4+ AI tabs |

**Tier 2 and Tier 3 not built**: per the backlog itself, those entries
are explicitly held — Tier 2 needs further audience testing (News
Doomscroller, Stan Account, Career Pivoter) and Tier 3 was deliberately
cut (Lawyer, Medical Resident, Crypto Trader, Conspiracy Researcher).
The Incognito Believer ("detected silently, never broadcast") is also
deferred since it requires a privacy-respecting silent-mode that
contradicts the current "always show the diagnosis" UX.

## Audit-driven changes (May 2026)

Following the strategy report:

- **Hero swap**: tab count is now the dominant number on the popup,
  the report, and all share cards. Shame Score is a smaller secondary
  line with a 1-line breakdown so the math is legible.
- **Oldest tab age cut** from every visible UI surface (popup tile,
  report tile, share-card stat row). Still computed internally and
  used in score weighting; just not displayed.
- **Top Haunt tile** added: shows the most-tabbed domain with its
  count, replacing the cut oldest-age tile. Personality + truth.
- **Story card format added**: 1080×1920 (9:16) for IG/TikTok stories.
- **Close Duplicates** ships free in the popup and report.
- **Pro cleanup hooks** wired (close by domain, close by age, save
  session) but inert until license validation lands.
- **Session-history snapshot** writes once per local-day so the
  future trend view has retroactive data.

## Known limitations

- **Tab age across browser restarts**: Chrome doesn't expose the original
  open time across restarts. We treat tabs that survive a restart as
  unchanged (their stored `openedAt` is preserved); tabs Chrome reopens
  on its own get a fresh `openedAt`. Ages are best-effort.
- **Path matching is naive**: rules like `urlIncludes: "mortgage"` do
  case-insensitive substring matching. False positives are possible
  (e.g., a blog post about mortgages on a non-mortgage domain wouldn't
  match its rule, but a mortgage page on a calculator-listed domain
  would, even if you're just window-shopping).
- **The 3am WebMD Patient rule** uses your local clock. If you live a
  reverse schedule, the diagnosis won't fire.
- **Incognito tracking** uses `incognito: "split"` mode in the manifest,
  meaning a separate service-worker instance runs in incognito. We
  reject those tabs at write time, so they never reach storage.
- **Share-card text wrapping** is based on Canvas's `measureText`, which
  is reasonably good but not pixel-perfect for italic faces. Long roast
  templates may wrap to 3+ lines on the X card; keep templates ≤ ~140 chars.
- **Premium UI is intentionally inert** — the "Upgrade" button does
  nothing and `isPremium()` always returns `false` until v1.1 ships.

---

## Architecture notes (for future maintainers)

- **No build step.** All JS is plain script files. Library files attach
  to `globalThis.TabShame.*` so the same files work for both the
  service worker (`importScripts`) and the popup/report (`<script>` tags).
- **Engines are pure.** `archetype-engine.js`, `shame-engine.js`, and
  `card-renderer.js` don't touch `chrome.*` directly. They take data
  and return data. Everything chrome-flavored lives in
  `background.js` + `storage.js`.
- **Adding an archetype** is one entry in `lib/domain-rules.js`. The
  diagnosis engine reads it generically. No code changes needed unless
  you need a new rule type (then add an evaluator in
  `archetype-engine.js`).
- **Premium hooks**: see `storage.js` — `isPremium()`, `getFeatureFlags()`,
  `isFeatureEnabled()`. v1.1 will wire `isPremium` to a license check
  (LemonSqueezy) and toggle individual flags. The hook is already present
  in `background.js` (`historicalReports`) as a worked example.

---

## What's free vs. Pro

This v1 ships everything as **free**. Pro features are wired up and
gated by the `featureFlags` object in `chrome.storage.local`, but
`isPremium()` in [`lib/storage.js`](lib/storage.js) hard-returns `false`
until license validation lands in v1.1. Deliberately:

| Feature                                         | Status in v1                                  |
|-------------------------------------------------|-----------------------------------------------|
| Tab count + archetype + roast                   | Free (always)                                 |
| Score + breakdown                               | Free                                          |
| Share cards (Twitter, IG, Story)                | Free                                          |
| Weekly + monthly Wrapped reports                | Free                                          |
| **Close duplicate tabs**                        | **Free, shipping** in popup + report          |
| Smart cleanup — close by domain                 | Pro hook implemented, gated `false`           |
| Smart cleanup — close older than N days         | Pro hook implemented, gated `false`           |
| Save session before closing                     | Pro hook implemented, gated `false`           |
| 4-week tab-count history / sparkline            | Data is collected daily; UI is Pro            |
| Custom card themes (seasonal / Wrapped variants)| Pro flag exists; no UI yet                    |

The session-history snapshot writes once per local-day inside
`buildLiveReport()`, so users who open the popup at least once a day
have history ready the moment the Pro trend view ships. Storage is
capped at 60 days.

## What's deferred (with reasons)

These were in the strategy audit but I did not build them in this pass:

- **Hall of Shame leaderboard** — Requires a backend to aggregate and
  serve global submissions, which directly conflicts with the
  privacy-first non-negotiable ("zero network requests, no data leaves
  the device"). Needs explicit go-ahead and a separate hosted service
  before I touch it.
- **Expanded message library (100+ roast templates)** — Content work,
  not engineering. Each archetype currently has 3 templates; adding
  more is a one-line edit per template in
  [`lib/domain-rules.js`](lib/domain-rules.js).
- **LemonSqueezy / payment integration** — Explicitly out of scope per
  the original brief ("DO NOT implement payment, accounts, or any
  backend in v1"). The Premium hooks above are ready for it.
- **Custom-themed share cards (UI)** — Free version of the layout
  ships; theming would be a `style` parameter on `renderCard(report,
  format, style)` in [`lib/card-renderer.js`](lib/card-renderer.js).

## License

Proprietary — TabShame, all rights reserved.
