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
  Job Hunt Marathon_, _The Pre-Date Detective_, _The AI Chat Hoarder_
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
- New-tab page shortcuts are **opt-in via Chrome's permission dialog**,
  split into two independent pipelines so users can pick one or both:
  - **Recent** needs `topSites` + `favicon`
  - **Bookmark Bar** needs `bookmarks` + `favicon`

  All three are declared as `optional_permissions` (not `permissions`).
  On install the extension does NOT hold any of them and never queries
  the corresponding APIs. The user clicks "Add Recent" or "Add
  Bookmarks" — each triggers `chrome.permissions.request` for just
  that pipeline's perms — and can revoke any time via the on-page
  "remove" links, the popup, or `chrome://extensions`.
- These permissions are used **only** to populate the new-tab shortcut
  tiles. They are never read by the persona-diagnosis pipeline or
  share-card renderer:
  - `chrome.tabs` (always granted) is the only data source for the
    archetype engine — see [`lib/archetype-engine.js`](lib/archetype-engine.js).
  - `chrome.topSites` and `chrome.bookmarks` are queried in exactly one
    function — `hydrateShortcuts()` in
    [`newtab/newtab.js`](newtab/newtab.js) — and only after the
    matching permission is granted.
  - Tile favicons load from Chrome's local cache via the `_favicon`
    resource — no third-party favicon service is contacted.

To inspect what's stored: `chrome://extensions` → TabShame → "Service
worker" link → DevTools → Application → Storage → IndexedDB / Local Storage.

---

## File structure

```
manifest.json                — Manifest V3 declaration
background.js                — service worker: tab tracking, alarms, messaging
popup/                       — toolbar popup (current stats)
report/                      — full Wrapped report (opens in a new tab)
newtab/                      — override new-tab page (full + lite modes)
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
- [ ] **Job Hunt Marathon** — open 5 LinkedIn tabs + 1
      `greenhouse.io` (or `lever.co`, `calendly.com`). Expect:
      "The Job Hunt Marathon" (priority 9 beats LinkedIn Lurker
      at priority 6 for the tied 5-LinkedIn case; the ATS tab is
      what differentiates a job seeker from a casual LinkedIn lurker).
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

### Auto-group persona tabs

- [ ] **Group created on transition** — open 5 LinkedIn tabs (or any 5
      tabs that match a persona). Within ~6–30 seconds, a Chrome tab
      group appears at the top of the tab strip named `💼 LinkedIn`,
      colored cyan (work category). All 5 LinkedIn tabs are pulled into
      it. (Tab-group titles use each archetype's `shortName` to dodge
      Chrome's tab-strip truncation; see [`lib/domain-rules.js`](lib/domain-rules.js).)
- [ ] **Other groups left alone** — manually group 2 of those 5 LinkedIn
      tabs first (right-click a tab → "Add tab to new group" → name it
      "Research"). Then open 3 more LinkedIn tabs. The "Research" group
      stays untouched; the 3 new ungrouped LinkedIn tabs land in a
      separate TabShame group.
- [ ] **Persona change renames the group** — with a LinkedIn Lurker
      group in place, open a `greenhouse.io` tab to promote to The
      Job Hunt Marathon. The existing group renames + recolors to
      `🎯 Job Hunt`, cyan (still in the `work` category).
- [ ] **Group survives popup-less use** — close the popup, open new
      matching tabs. The group updates without you ever clicking the
      icon (the service worker's tab listeners trigger the regrouping).
- [ ] **Disabling the toggle** — uncheck "Auto-group persona tabs" in
      the popup. Open 5 fresh tabs of a new persona — no group is
      created. Existing TabShame groups stay where they are (Chrome
      groups persist until the user removes them).
- [ ] **Casual Hoarder / Tab Maximalist skipped** — opening only
      catch-all tabs should NOT create a group. Likewise, crossing 200
      tabs (Tab Maximalist) should not bulk-group every tab.
- [ ] **Cross-window** — open 3 matching tabs in window A and 2 in
      window B (any persona that needs 5+ in total). Once the global
      diagnosis fires, separate TabShame groups appear in each window
      (Chrome's `tabs.group` can't span windows).
- [ ] **User dismantled the group** — manually ungroup TabShame's group.
      Open a new matching tab. A fresh group should be created on the
      next diagnosis (the stored stale `groupId` is cleared on the
      failed `tabGroups.get`).
- [ ] **Persistence in storage** — in the service-worker DevTools:
      ```js
      chrome.storage.local.get('personaGroups', console.log);
      ```
      Expect a `{ [archetypeId]: { [windowId]: groupId } }` map.

### New-tab page override

- [ ] **Override prompt appears** — after Load unpacked, opening a new
      tab (`Cmd+T`) lands on TabShame's page. Chrome shows its native
      "An extension changed your new tab page · Keep / Revert" banner at
      the top. Clicking "Keep" keeps TabShame's page; clicking "Revert"
      disables the override at the browser level.
- [ ] **Full mode renders** — default install lands on the persona
      showcase: "Hi, you're / 💼 The LinkedIn Lurker / 47 tabs · shame
      score 68", roast quote, and three CTAs (Share card, Close
      duplicates, Open full report).
- [ ] **Live diagnosis** — open the new tab right after crossing a
      persona threshold. The page reflects the current persona within
      ~200ms (cached priming for instant paint, then a fresh fetch).
- [ ] **Share card works** — click "Share card". A
      `tabshame-twitter-…png` downloads (1200×675).
- [ ] **Close duplicates works** — if you have duplicate tabs, the
      button is enabled; clicking it closes them and refreshes the
      counts inline.
- [ ] **Switch to lite (inline)** — click "switch to lite mode" in
      the footer. The page swaps (no reload). Both modes use the same
      single-column stack; lite simply places the Recent + Bookmark
      grids ABOVE the persona, which becomes a full-width card below.
      Single alignment axis — every element shares the same horizontal
      bounds.
- [ ] **Toggle label updates** — in lite mode the footer link reads
      "switch to full mode". Clicking it returns to persona-on-top.
- [ ] **Lite = add-on, not replacement** — the persona is still
      visible (full-width card below the shortcuts), all action
      buttons still present. Shortcuts are simply elevated to the top.
- [ ] **Mode persists across tabs** — pick lite, open another new tab.
      It also renders in lite mode.
- [ ] **Popup mirrors the setting** — open the popup. The
      "New-tab page" dropdown reflects the current mode. Changing it
      there flips future new-tab pages.
- [ ] **Casual = near-blank** — open a new tab while you're still
      The Casual Hoarder (no persona threshold crossed). Expect a
      near-empty page: just a whisper-faint `TAB SHAME` brand tick and
      a one-line nudge ("No archetype yet — open ~5 themed tabs…").
      No persona showcase, no buttons. Address bar still gets focus so
      typing-and-search just works. This honors the rule: the new-tab
      page only takes over once the user has been tagged with a
      specific persona.
- [ ] **Casual → specific upgrade** — cross a persona's 5-tab threshold
      while a casual new-tab is already open. Opening a fresh new tab
      should now render the full (or lite) showcase. The existing
      open new-tab does NOT auto-upgrade (the page snapshots state on
      load); reload it to see the new diagnosis.
- [ ] **Specific → casual demotion** — close tabs back below the
      threshold. New tabs render in casual mode again, even if the
      popup's "New-tab page" select is set to Full or Lite (that
      preference only applies when there IS a persona).

### New-tab shortcuts (two opt-in pipelines)

Shortcuts are split into two independent pipelines so users can opt
into Recent without committing to Bookmarks (and vice versa). Each
pipeline asks for the minimum permissions it needs:
- **Recent** → `topSites` + `favicon`
- **Bookmark Bar** → `bookmarks` + `favicon`

`favicon` is shared infrastructure — granted on the first Add of
either kind, revoked when both kinds are removed.

- [ ] **Fresh install = no permissions held** — `chrome://extensions`
      → Details on TabShame → "Permissions". `topSites`, `bookmarks`,
      `favicon` should NOT appear under "Granted permissions" (they
      live under "Optional permissions").
- [ ] **Two CTAs below the persona, side-by-side** — open a fresh new
      tab. The persona showcase (hero + roast + Share card / Close
      duplicates / Open full report) sits at the top. Below the action
      row, two opt-in cards sit side-by-side at wide widths: "Show
      your Recent sites here?" and "Show your Bookmark Bar here?".
      Below ~700px they stack vertically.
- [ ] **Page fits without scrolling** — at typical viewport heights
      (700–900px), the whole page from topbar to footer is visible
      without scrolling. The persona + actions + CTAs all in one view.
- [ ] **CTAs are equal height** — when both are CTAs (fresh install),
      the two cards stretch to the same height. Verify with DevTools:
      both `.shortcuts-cta` elements have identical `offsetHeight`.
- [ ] **Add Recent grants only Recent perms** — click "Add Recent" on
      the top CTA. Chrome's dialog lists `topSites` + `favicon`
      (NOT `bookmarks`). Accept → only the Recent grid hydrates at
      the top of the page. The Bookmark Bar CTA still appears below.
- [ ] **Add Bookmarks grants only Bookmark perms** — click "Add
      Bookmarks" on the second CTA. Chrome's dialog lists `bookmarks`
      (and `favicon` if not already held from Recent). Accept → the
      Bookmark Bar grid hydrates next to Recent at the top of the page.
- [ ] **Folder-only bookmark bar still renders** — put only folders
      (no direct URL items) on your bookmark bar, then add a few URLs
      inside one of those folders. Click "Add Bookmarks" → the grid
      hydrates with the URLs from inside the folders (BFS walk).
      Confirms the fix for the silent-empty-grid bug.
- [ ] **Empty bookmark bar falls back to Other Bookmarks** — clear
      your bookmark bar entirely but keep items in "Other Bookmarks".
      The grid still hydrates with those items. Truly empty (no
      bookmarks anywhere) → grid stays hidden, which is correct.
- [ ] **CTA is persistent until Add** — there is no "No thanks"
      button. The CTA stays visible on every new tab until the user
      clicks Add. This is the intentional friction: no escape hatch,
      no nag-suppression flag.
- [ ] **Deny in Chrome dialog keeps the CTA** — click "Add Recent",
      click "Cancel" in Chrome's dialog. The Recent CTA stays in place
      so the user can click Add again whenever they're ready.
- [ ] **Remove brings the CTA back** — with a grid active, click the
      "remove" link at the foot of the grid. The grid disappears AND
      the matching opt-in CTA reappears in its place. Revoking is
      treated as "I changed my mind" — re-offering the option is the
      correct UX.
- [ ] **Remove Recent keeps Bookmarks** — with both grids active,
      remove only Recent. Recent's CTA reappears; Bookmarks grid still
      rendered. `chrome://extensions` → Details → Permissions:
      `topSites` is gone but `bookmarks` + `favicon` still granted.
- [ ] **Remove last kind drops favicon too** — with only Bookmarks
      remaining, click "remove Bookmarks + revoke permission". Both
      CTAs visible again. Permissions: `topSites`, `bookmarks`,
      `favicon` all gone from Granted (back under Optional).
- [ ] **Revoke at chrome://extensions re-shows CTA** — with shortcuts
      active, toggle off one of the perms at `chrome://extensions` →
      Details (no popup or new tab open). Open a new tab → that kind's
      CTA is shown again (the service-worker listener reset the seen
      flag on revoke).
- [ ] **Popup mirrors state per-row** — open the popup. Two rows
      ("Recent sites on new tab", "Bookmark Bar on new tab") each
      show an Add/Remove button based on current grant for THAT row.
      Clicking a row's button triggers the same per-kind flow.
- [ ] **Shortcuts below the persona in every mode** — switch between
      Full / Casual. In Full, the Recent and Bookmark Bar sections sit
      side-by-side below the action row, so the persona is the first
      thing visible. In Casual, they sit below the brand-tick + nudge.
      Lite mode shows the same two sections (centered) but without the persona showcase.
- [ ] **Responsive grid** — narrow the window to ~720px (sections
      stack vertically) and ~400px (tiles per row drop via
      `grid-template-columns: repeat(auto-fit, minmax(72px, 1fr))`).
      Nothing overflows.
- [ ] **5 tiles + "show more"** — open a new tab with both Recent
      and Bookmarks granted. Each section shows at most 5 tiles. If
      there are more available, a "show more" link appears between
      the grid and the remove link. Clicking it expands to ~16 tiles
      and hides the link. Reloading the tab returns to 5 (expansion
      is page-lifetime only).
- [ ] **Recent is deduped by hostname** — even if `chrome.topSites`
      returns multiple URLs from the same host (e.g. 3 google.com
      pages), only one tile per hostname appears. In DevTools:
      ```js
      chrome.topSites.get(console.log);
      ```
      Confirm the raw list may have duplicates; the rendered grid
      doesn't.
- [ ] **Section heights match + remove button aligned** — when one
      section is a CTA card and the other is a grid (or both grids
      with different item counts), both sections stretch to the same
      height. The "remove + revoke" link in each grid sits at the same
      Y; the CTA's Add / No-thanks row aligns with the sibling section's
      remove row.
- [ ] **CTAs look like share cards** — gradient peach/lavender wash
      on paper, serif title, italic body, soft shadow. The opt-in
      cards should feel like the share-card aesthetic, not a plain
      form.
- [ ] **Persona pipeline never queries the shortcut APIs** — in the
      service-worker DevTools console, run a diagnosis manually:
      ```js
      chrome.runtime.sendMessage({ type: "GET_REPORT" }, console.log);
      ```
      Inspect the report — only tab data is reflected. Grep
      `lib/archetype-engine.js` for `topSites` and `bookmarks` — no
      hits. The two pipelines are strictly separate.

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
| Job Hunt Marathon | 5+ LinkedIn AND 1+ ATS (Greenhouse/Lever/Calendly/etc.) | The ATS tab is the job-seeker tell. Priority 9 means it wins ties with LinkedIn Lurker (someone with LinkedIn alone is lurking; LinkedIn + an active application is job hunting). |
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
  Job Hunt Marathon as you open an ATS tab).

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
| The Job Hunt Marathon | 9 | LinkedIn Lurker (the ATS tab is the job-seeker tell; reframed from "Recruiter Black Hole" because the signal statistically describes a job seeker, not a recruiter) |
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
