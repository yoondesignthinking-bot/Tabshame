# TabShame · Chrome Web Store Launch Kit

Everything you need to copy-paste into the [Chrome Web Store developer
dashboard](https://chrome.google.com/webstore/devconsole) when submitting
TabShame.

---

## 1. Manifest status — ✅ LAUNCH-READY

| Check                          | Status   | Note                                                     |
| ------------------------------ | -------- | -------------------------------------------------------- |
| `manifest_version: 3`          | ✅       |                                                          |
| `version: "1.0.0"`             | ✅       | Bump to `1.0.1` etc. on resubmits                        |
| Description ≤ 132 chars        | ✅ (105) |                                                          |
| `icons.128` present            | ✅       | `assets/icon-128.png`                                    |
| `host_permissions: []`         | ✅       | No `<all_urls>` — short review queue                     |
| `web_accessible_resources`     | ✅       | Removed entirely (no longer needed)                      |
| `permissions` minimal          | ✅       | See justifications below                                 |
| No remote code execution       | ✅       | No `eval`, no `new Function`, no remote scripts          |
| No outbound network            | ✅       | No `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`  |
| No third-party SDKs            | ✅       | Vanilla JS only                                          |
| Console statements stripped    | ✅       | `console.log` removed; `console.warn` retained for errors |

---

## 2. Permission justifications

When Chrome's reviewer asks "why do you need each permission?", paste
these into the dashboard's "Permission justifications" form. They are
written to pass a single-pass review.

### `tabs`
> TabShame's core feature is diagnosing the user's tab-hoarding pattern
> across all of their open tabs. We read tab URLs, titles, and timestamps
> to compute the user's archetype locally. The data never leaves the
> device.

### `tabGroups`
> Used by the optional auto-grouping feature, which bundles tabs that
> triggered the user's persona into a labeled Chrome tab group so the
> diagnosis is visible in the tab strip. The user can disable this in
> the popup preferences.

### `storage`
> Used to persist the user's settings (auto-group toggle, new-tab mode)
> and a rolling per-day snapshot of their tab count and archetype for
> the future "year-in-review" feature. Stored in `chrome.storage.local`,
> never synced.

### `alarms`
> Used to schedule background re-diagnosis (so the persona stays current
> as tabs change throughout the day) and weekly "Wrapped" notification
> reminders.

### `notifications`
> Used to send the user a one-line notification when their archetype
> changes (e.g. "You've earned The LinkedIn Lurker"). Off by default
> until the user installs and enables it.

### Optional: `topSites`
> Opt-in only. The user explicitly enables this from the new-tab page
> if they want most-visited site tiles to appear as shortcuts. Used
> only to render those tiles, never read otherwise.

### Optional: `bookmarks`
> Opt-in only. The user explicitly enables this if they want their
> Bookmark Bar to appear as shortcuts on the new tab page. Read-only
> access; TabShame never modifies a bookmark.

### Optional: `favicon`
> Required by `topSites` / `bookmarks` to render the small site icons
> on each shortcut tile.

### `commands` (`Cmd+Shift+F` shortcut)
> Opens TabShame's tab-finder page so the user can search through all
> their open tabs from a single grid view.

### `chrome_url_overrides.newtab`
> Replaces the default new-tab page with TabShame's persona showcase.
> User can switch between full and lite modes in the popup, or disable
> entirely by removing the extension.

### `incognito: split`
> Each profile (regular + incognito) gets its own independent extension
> instance — incognito tabs are never read by the regular-mode storage.
> This is the more privacy-respecting of the two incognito modes.

---

## 3. Store listing copy

### Short description (132 char max)

**Use this — 105 chars, fits comfortably:**

```
Diagnoses your tab-hoarding archetype and generates shareable shame cards. All data stays on your device.
```

**Or this punchier alternative — 121 chars:**

```
73 tabs open? We see you. TabShame names your hoarding archetype and turns it into a share card. 100% local.
```

### Long description (≈1000 char)

Paste this into the "Detailed description" field. Markdown is rendered
on the store page.

```
You have 73 tabs open. You know who you are. TabShame names them.

TabShame reads your open tabs locally, diagnoses your tab-hoarding archetype, and turns the result into a share card you can post anywhere. 38 archetypes, from The LinkedIn Lurker to The 3am WebMD Patient to The Pinterest Black Hole.

▸ One-tap "Close extras" — collapses duplicate sites and keeps one of each
▸ Tab finder — Cmd+Shift+F to search every open tab in one grid
▸ Auto-group — bundles the tabs that triggered your persona into a labeled Chrome group
▸ Three share-card formats — X/LinkedIn, Instagram feed, Stories — generated locally as PNG

PRIVACY
We see nothing. No analytics, no servers, no telemetry, no cookies. Every operation runs locally on your device. The extension makes zero outbound network requests. Read the full policy at tabshame.app/privacy.

WHAT IT IS NOT
Not a productivity guilt trip. Not a Pomodoro app. Not another notification asking you to focus. TabShame is a mirror, not a coach. Warm, observational, slightly chaotic.

Built by a tab hoarder, for tab hoarders. Honestly? Same.
```

Char count: ~990. Adjust freely.

### Single-sentence promo line (for marquee / featured tile)

```
73 tabs open? TabShame names your hoarder archetype. 100% local.
```

### Category

> **Productivity** — primary category.
> **Fun** — secondary (Chrome allows two).

### Languages

> English (United States) — primary. Other locales can be added post-launch.

---

## 4. Required graphics

| Asset                  | Size          | Status      | What it should show                                                                                      |
| ---------------------- | ------------- | ----------- | -------------------------------------------------------------------------------------------------------- |
| Extension icon         | 128×128 PNG   | ✅ have     | `assets/icon-128.png`                                                                                    |
| Small promo tile       | 440×280 PNG   | ❌ **TODO** | The "73" hero number in shame red on paper, with "TAB SHAME" wordmark and a small archetype name strip   |
| Screenshot 1 (popup)   | 1280×800 PNG  | ❌ **TODO** | The toolbar popup with a real diagnosis ("The LinkedIn Lurker") + the close-extras + find-a-tab buttons  |
| Privacy policy URL     | URL           | ❌ **TODO** | Host `website/privacy.html` at `https://tabshame.app/privacy`                                            |

## 5. Recommended (Featured-eligibility) graphics

| Asset              | Size         | Effect                                  | What it should show                                                                                  |
| ------------------ | ------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Marquee promo tile | 1400×560 PNG | Featured selection candidate            | Wide editorial banner — hero tab count + 3 archetype thumbnails alongside                            |
| Screenshot 2       | 1280×800 PNG | Share card preview                      | The full Wrapped report page (in light mode) showing tab count, archetype reveal, share card row     |
| Screenshot 3       | 1280×800 PNG | New-tab override                        | The new-tab page in full mode, showing persona poster + Recent shortcuts + Bookmark Bar shortcuts    |
| Screenshot 4       | 1280×800 PNG | Tab finder                              | The tab finder full-bleed grid mid-search ("github" filter active), keyboard hints visible           |
| Screenshot 5       | 1280×800 PNG | Dark mode                               | The popup or report page rendered in dark theme — proves the system-following dark mode works       |

### Screenshot direction notes

- All screenshots **must** be exactly 1280×800 (4:5 portrait aspect, but
  Chrome's spec is actually 1280×800 landscape — verify on upload).
- Keep the same browser chrome across all 5 (consistent macOS Safari-style
  faux frame works well — see your existing website mockups).
- The first screenshot is the only one most users see. Make it the
  diagnosis-on-the-popup hero shot.

---

## 6. Privacy + compliance

### Privacy policy

- ✅ `PRIVACY.md` written and committed
- ✅ `website/privacy.html` ready to deploy at `tabshame.app/privacy`
- ❌ **TODO:** ship `tabshame.app/privacy` (the URL must resolve before
  submission; reviewers click it)

### Data-collection disclosure (developer-dashboard form)

Tick **"Does not collect user data"** and fill the four sub-questions:

1. *"Personally identifiable information"* → **No**
2. *"Health information"* → **No**
3. *"Financial and payment information"* → **No**
4. *"Authentication information"* → **No**
5. *"Personal communications"* → **No**
6. *"Location"* → **No**
7. *"Web history"* → **No** (tab URLs are read transiently for diagnosis,
   never stored or transmitted)
8. *"User activity"* → **No**
9. *"Website content"* → **No**
10. *"User-provided content / file contents"* → **No**

Also tick the three certifications:

- ✅ I do not sell or transfer user data to third parties.
- ✅ I do not use or transfer user data for purposes unrelated to the
  item's single purpose.
- ✅ I do not use or transfer user data to determine creditworthiness
  or for lending purposes.

### "Single purpose" statement

> TabShame's single purpose is to diagnose the user's tab-hoarding
> archetype from their open tabs and generate a shareable image of the
> result, with all processing performed locally on the user's device.

---

## 7. Pre-submission final-check (do these in order)

1. ✅ Strip `console.log` (done)
2. ✅ Tighten manifest (done — `host_permissions` empty, no WAR)
3. ❌ Bundle the unpacked extension as a `.zip` (no `.git`, no `.DS_Store`,
   no `website/`, no `STORE_LISTING.md`, no `PRIVACY.md` source — only
   the runtime files: `manifest.json`, `background.js`, `lib/`, `popup/`,
   `newtab/`, `report/`, `tabfinder/`, `assets/icon-*.png`)
4. ❌ Test as unpacked extension in a clean Chrome profile — verify popup
   opens, diagnosis runs, share cards download, dark mode toggles
5. ❌ Generate the 4 required + 4 recommended graphics
6. ❌ Deploy `tabshame.app/privacy`
7. ❌ Create new item in dashboard, upload `.zip`, paste copy from this doc
8. ❌ Set "Visibility" to **Public** (or **Unlisted** for soft launch)
9. ❌ Submit for review — typical wait is 1–3 business days for
   no-host-permissions extensions

---

## 8. Suggested `.zip` packaging command

Run from the repo root:

```bash
zip -r tabshame-v1.0.0.zip \
  manifest.json \
  background.js \
  lib \
  popup \
  newtab \
  report \
  tabfinder \
  assets/icon-16.png \
  assets/icon-48.png \
  assets/icon-128.png \
  -x "*.DS_Store" -x "*/_*.py"
```

Excluded by design: `website/`, `STORE_LISTING.md`, `PRIVACY.md`,
`assets/fonts/` (not bundled), `assets/_make_icons.py`, `README.md`.

---

_Generated June 2, 2026 · matches manifest version `1.0.0`._
