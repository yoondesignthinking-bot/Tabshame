# Reviewer Notes — TabShame v1.0.0

Paste the block below into the Chrome Web Store developer dashboard's
**"Notes for reviewer"** field (Privacy practices tab → free-text). It
covers exactly what a reviewer needs to verify the extension end-to-end
in under 90 seconds.

---

## For the Chrome Web Store reviewer

Thank you for reviewing TabShame.

**TL;DR**: TabShame reads the user's open tab list locally, classifies
the user's tab-hoarding pattern into one of 38 archetypes (e.g. "The
LinkedIn Lurker"), and lets them share the result as an image. No remote
network requests of any kind. Every operation is local.

### How to test in 5 steps

1. **Toolbar icon** — a "TS" pixel mark appears next to the omnibox.
   The badge text shows the live tab count (e.g. "73"). Open any tab to
   confirm the count updates immediately.

2. **Popup diagnosis** — click the icon. The popup shows:
   - A small "73 tabs open · feral" line at the top.
   - The diagnosed archetype as the visual hero ("Casual Hoarder 🐌" on
     a fresh profile).
   - An italic pull-quote roast under it.
   - A merged TOP HAUNT + extras block.
   - Two action buttons: "Open report" and "Find a tab".
   - A gear icon (top-right) → opens the Settings view inside the same
     popup. Settings includes the auto-group toggle, close-persona-groups
     action, new-tab mode select, and Recent/Bookmark permission rows.

3. **Trigger a specific archetype** — open 5 tabs on a single domain
   like `linkedin.com` or `youtube.com`. Click the toolbar icon again.
   The popup should now show "The LinkedIn Lurker" or "The YouTube
   Rabbit-Holer" with the matching emoji + roast.

4. **Share-card flow** — click "Open report". A new tab opens with the
   full Wrapped page. Scroll to "SHARE THE SHAME":
   - "Share on X" → downloads the 16:9 PNG and opens a Twitter compose
     intent URL pre-filled with the diagnosis (no auth, no posting).
   - "Save for Instagram" → downloads the 9:16 Story-sized PNG (no
     compose intent exists for Instagram on the web).
   - The three per-format download buttons below provide manual access
     to each card size.

5. **Cmd+Shift+F (Ctrl+Shift+F on Linux/Windows)** — opens the tab
   finder full-bleed grid with live search and arrow-key navigation.

### Permission justifications (recap)

- **`tabs`**: Core feature. Reads URL, title, hostname, timestamps,
  pinned/active state across all open tabs to compute the archetype
  locally.
- **`tabGroups`**: Optional auto-grouping feature (off by default in
  Settings, on by default in the popup gear toggle). Bundles persona-
  triggering tabs into a labeled Chrome group.
- **`storage`**: Settings + per-day snapshot for future Year-in-Review.
  All `chrome.storage.local`, never synced.
- **`alarms`**: Periodic re-diagnosis + weekly Wrapped reminder.
- **`notifications`**: Single notification when the user crosses into a
  new archetype.
- **`topSites` / `bookmarks` / `favicon` (optional_permissions)**:
  Opt-in only, requested via `chrome.permissions.request()` from the
  new-tab page or popup Settings. Used solely to render shortcut tiles
  on the new-tab page.

### What we deliberately don't do

- **No `host_permissions`** — `[]` in the manifest.
- **No remote network calls** — no `fetch`, `XMLHttpRequest`,
  `WebSocket`, or `navigator.sendBeacon` anywhere in the codebase. The
  one external URL we open (`twitter.com/intent/tweet`) is via
  `chrome.tabs.create` from a user click, not a programmatic fetch.
- **No remote code execution** — no `eval`, no `new Function`, no
  remote-script tags. Manifest V3 CSP would reject any of these anyway.
- **No third-party SDKs / libraries at runtime** — vanilla JS only.
- **No bundled font files** — the CSS references Fraunces / Instrument
  Serif / JetBrains Mono by name with system-font fallbacks, declared
  via `@font-face { src: local(...) }` so the browser uses them only
  if the user happens to have them installed.

### Single-purpose statement

TabShame's single purpose is to diagnose the user's tab-hoarding
archetype from their open tabs and generate a shareable image of the
result, with all processing performed locally on the user's device.

### Privacy policy

https://tabshame.app/privacy

---

# What's new — listing changelog text

Paste this block into the dashboard's **"Recent changes"** field. It
becomes the "What's new" section on the public listing.

```
v1.0.0 — initial release

Diagnoses your tab-hoarding into one of 38 archetypes: The LinkedIn
Lurker, The YouTube Rabbit-Holer, The 3am WebMD Patient, The Reddit
Loop, The Inbox Avoidance — 33 more.

— Live tab-count badge on the toolbar
— One-tap "Close extras" collapses same-site tabs to one per domain
— Cmd+Shift+F to search every open tab in a full-bleed grid
— Auto-group persona tabs into a labeled Chrome group (toggle in Settings)
— Three share-card formats: X (16:9), Instagram feed (4:5), Stories (9:16)
— Dark mode follows your system preference

100% local. We see nothing. No analytics, no servers, no telemetry.
```
