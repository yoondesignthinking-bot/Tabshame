# Chrome Web Store — Complete Submission Sheet

Every field in the developer dashboard, every paste-ready answer.
Organized tab-by-tab in the order the dashboard lays them out.

Email used everywhere: **`nysgbuilderbros@gmail.com`**

---

## TAB 1 · Store listing

### Item name (display title)

```
TabShame
```

This may already be pre-filled from `manifest.json`. Leave as is.

### Summary (132 char max — appears under the name in search results)

```
Diagnoses your tab-hoarding archetype and generates shareable shame cards. All data stays on your device.
```

*(105 chars — under the limit)*

Alternative punchier version (121 chars):
```
73 tabs open? We see you. TabShame names your hoarding archetype and turns it into a share card. 100% local.
```

### Detailed description (~1,000 char — appears on the full listing page)

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

### Category

Primary: **Productivity**
Secondary (if requested): **Fun**

### Language

```
English (United States)
```

### Icon (128×128)

Already in your zip at `assets/icon-128.png`. The dashboard auto-extracts it from the manifest. **No action needed.**

### Screenshots (1–5 — Chrome requires at least 1)

Upload all 5 in this order:

| # | File | What it shows |
|---|---|---|
| 1 | `/Users/cheeampion/Desktop/TabShame/store-screenshot-1.png` | Popup hero (small tab-count → archetype → pull-quote → extras block) |
| 2 | `/Users/cheeampion/Desktop/TabShame/store-screenshot-2.png` | Report's archetype reveal panel |
| 3 | `/Users/cheeampion/Desktop/TabShame/store-screenshot-3.png` | Share the Shame row with X + Instagram buttons + 3 card sizes |
| 4 | `/Users/cheeampion/Desktop/TabShame/store-screenshot-4.png` | Full-bleed tab finder with linkedin filter active |
| 5 | `/Users/cheeampion/Desktop/TabShame/store-screenshot-5.png` | Dark mode following system preference |

### Promo tile · small (440×280)

```
/Users/cheeampion/Desktop/TabShame/store-promo-small.png
```

### Promo tile · marquee (1400×560)

Optional but submit it — this is what makes you Featured-shelf eligible.

```
/Users/cheeampion/Desktop/TabShame/store-promo-marquee.png
```

### Official URL — Homepage

```
https://tabshame.app
```

If you haven't deployed `tabshame.app` yet, use the GitHub Pages fallback you set up for the privacy policy, e.g.:

```
https://nysgbuilderbros.github.io/tabshame-privacy/
```

### Support URL

```
https://tabshame.app/support
```

If you don't have a `/support` page, use a `mailto:` URL:

```
mailto:nysgbuilderbros@gmail.com
```

### Search keywords (Chrome allows up to 7, free-text)

```
tab manager
tab finder
productivity
chrome tabs
archetype
share card
dark mode
```

---

## TAB 2 · Privacy practices

This is the tab where most of the dashboard's red bullets live. Every block below pastes into a single named field.

### Single-purpose description

```
TabShame's single purpose is to diagnose the user's tab-hoarding archetype from their open tabs and generate a shareable image of the result, with all processing performed locally on the user's device.
```

### Permission justifications — one per declared permission

#### `tabs`

```
Required for the core feature: diagnosing the user's tab-hoarding archetype across all open tabs. We read tab URLs, titles, hostnames, timestamps, and pinned/active state to compute the user's archetype locally and identify duplicate sites for the one-tap "Close extras" action. The data is never stored beyond the current session, transmitted off-device, or shared with any third party.
```

#### `tabGroups`

```
Used by the optional auto-grouping feature. When the user enables "Auto-group persona tabs" in the popup Settings, TabShame bundles the tabs that triggered the diagnosis into a labeled Chrome tab group (e.g. "LinkedIn Lurker") so the persona is visible in the tab strip. Only the user's own tabs in their own window are grouped. The user can toggle this off or close all persona groups at any time from Settings.
```

#### `storage`

```
Persists user settings (auto-group toggle, new-tab mode preference) and a per-day snapshot of tab count, archetype, and duplicate count for the future "year-in-review" feature. All data is stored in chrome.storage.local on the user's device. Nothing is synced to any server. The user can clear all stored data by uninstalling the extension.
```

#### `alarms`

```
Schedules two background tasks: a periodic re-diagnosis so the user's archetype stays current as their tabs change throughout the day, and a weekly "Wrapped" reminder notification. No remote calls are made on alarm fire — both tasks operate entirely on locally-stored tab data.
```

#### `notifications`

```
Sends a single OS notification when the user's archetype changes (for example, "You've earned The LinkedIn Lurker"). One notification per archetype transition, never repeated for the same archetype. The user can disable notifications in chrome://settings or by uninstalling.
```

#### `topSites` (optional)

```
Opt-in only. The user explicitly grants this permission from the new-tab page or popup Settings when they want their most-visited sites to appear as shortcut tiles. Used solely to render those tiles. Read on demand each time the new-tab page loads; never stored, transmitted, or shared. The user can revoke this permission from the same screen at any time.
```

#### `bookmarks` (optional)

```
Opt-in only. The user explicitly grants this permission from the popup Settings page when they want their Bookmark Bar to appear as shortcuts. Read-only access — TabShame never creates, modifies, or deletes a bookmark. Used solely to render the shortcut tiles on the new-tab page. The user can revoke this permission at any time.
```

#### `favicon` (optional)

```
Required to render small site icons on the topSites and bookmark shortcut tiles via the chrome-extension://EXT_ID/_favicon/ URL. Read from Chrome's local favicon cache only. No external network requests are made to fetch favicons. Granted alongside topSites or bookmarks; revoked automatically when both of those are revoked.
```

### Remote code use

Select: **"No, I am not using remote code"**

If a free-text justification field appears, paste:

```
TabShame does not load, execute, or rely on any remote code. All JavaScript ships inside the extension package. There are no remote scripts, no eval(), no new Function(), no fetch of executable content, and no remote configuration. The Manifest V3 CSP would block these patterns anyway.
```

### Data collection disclosure form

Chrome's dashboard asks one question per data type. For TabShame, the answer to every single question is **No / Not collected**. Specifically:

| Data type | Answer |
|---|---|
| Personally identifiable information | **No** |
| Health information | **No** |
| Financial and payment information | **No** |
| Authentication information | **No** |
| Personal communications | **No** |
| Location | **No** |
| Web history | **No** |
| User activity | **No** |
| Website content | **No** |
| User-provided content / file contents | **No** |

### Data-usage certifications (3 checkboxes)

Check all three:

- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases.
- ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes.

### Privacy policy URL

```
https://tabshame.app/privacy
```

Fallback if `tabshame.app` isn't live yet:

```
https://nysgbuilderbros.github.io/tabshame-privacy/
```

---

## TAB 3 · Distribution

### Visibility

```
Public
```

If you want a soft launch:

```
Unlisted
```

(Unlisted = installable via direct link, hidden from store search.)

### Regions

Select **all regions** (default). If the dashboard pre-selects "Available everywhere", leave it.

### Pricing

```
Free
```

### Mature content

```
No
```

### Account type

```
Individual
```

Unless you registered as a business — then **Group**.

### Trader status (recent EU/UK requirement)

```
Non-trader
```

Tick the **Non-trader** box. TabShame v1 is free, there's no commercial activity, you're not selling or processing payments. This box is what avoids the "verified trader contact info" forms.

If the dashboard requires you to confirm in a dropdown, the exact text is:

```
I am not a trader. This item is provided without commercial intent.
```

---

## TAB 4 · Account & contact

### Developer name (public, appears on the listing)

```
TabShame
```

Or if you prefer your own name visible:

```
Chee Ho Yoon
```

### Public contact email

```
nysgbuilderbros@gmail.com
```

### Support email (can be the same)

```
nysgbuilderbros@gmail.com
```

---

## Free-text fields (free placement — usually under Store listing or Privacy)

### Notes for reviewer

```
Thank you for reviewing TabShame.

TL;DR — TabShame reads the user's open tab list locally, classifies the user's tab-hoarding pattern into one of 38 archetypes (e.g. "The LinkedIn Lurker"), and lets them share the result as an image. Zero remote network requests. Every operation is local.

HOW TO TEST IN 5 STEPS

1. Toolbar icon — a "TS" pixel mark appears next to the omnibox. The badge shows the live tab count (e.g. "73"). Open any tab to confirm it updates.

2. Popup diagnosis — click the icon. The popup shows a small tab-count line, the diagnosed archetype as the visual hero ("The Casual Hoarder" on a fresh profile), an italic pull-quote roast, a merged TOP HAUNT + extras block, and two buttons (Open report, Find a tab). A gear icon top-right opens Settings within the same popup.

3. Trigger a specific archetype — open 5 tabs on a single domain like linkedin.com or youtube.com. Re-open the popup. The persona should change to "The LinkedIn Lurker" / "The YouTube Rabbit-Holer".

4. Share-card flow — click "Open report". Scroll to "SHARE THE SHAME". The "Share on X" button downloads the 16:9 card and opens a Twitter compose intent. The "Save for Instagram" button downloads the 9:16 Story card.

5. Cmd+Shift+F (Ctrl+Shift+F on Linux/Windows) — opens the tab finder with live search and arrow-key navigation.

PERMISSIONS RECAP

- tabs: required for the core diagnosis
- tabGroups: optional auto-grouping (off-by-default toggle)
- storage: settings + future Year-in-Review snapshot
- alarms: periodic re-diagnosis + weekly reminder
- notifications: single notification on archetype change
- topSites / bookmarks / favicon: opt-in only, requested via chrome.permissions.request() from the new-tab page

WHAT WE DELIBERATELY DON'T DO

- host_permissions is [] in manifest
- Zero outbound network calls (no fetch, XHR, WebSocket, sendBeacon)
- No remote code execution (no eval, no new Function, no remote scripts)
- No third-party SDKs or libraries at runtime — vanilla JS only
- No bundled fonts — CSS references families by name with system fallbacks

Privacy policy: https://tabshame.app/privacy
```

### What's new (changelog — shown publicly on the listing)

```
v1.0.0 — initial release

Diagnoses your tab-hoarding into one of 38 archetypes: The LinkedIn Lurker, The YouTube Rabbit-Holer, The 3am WebMD Patient, The Reddit Loop, The Inbox Avoidance — 33 more.

— Live tab-count badge on the toolbar
— One-tap "Close extras" collapses same-site tabs to one per domain
— Cmd+Shift+F to search every open tab in a full-bleed grid
— Auto-group persona tabs into a labeled Chrome group (toggle in Settings)
— Three share-card formats: X (16:9), Instagram feed (4:5), Stories (9:16)
— Dark mode follows your system preference

100% local. We see nothing. No analytics, no servers, no telemetry.
```

---

## Submission order — do these in this exact sequence

1. **Click "Account"** at the top — fill developer name, public email, trader status. Save.
2. **Click "Store listing"** — paste name, summary, description, URLs, keywords. Upload icons (auto from zip), 5 screenshots, 2 promo tiles. Save draft.
3. **Click "Privacy practices"** — paste single-purpose, all 8 permission justifications, remote-code answer, data-collection 10 No's, 3 certifications, privacy URL. Save draft.
4. **Click "Distribution"** — set Public, all regions, Free, No-mature, Individual, Non-trader. Save draft.
5. **Scroll to the top of any tab** — click **"Submit for review"**.

If the Unable-to-publish dialog still shows any bullets, paste the screenshot back to me and I'll diagnose. But all 12 bullets you saw before will be cleared once the above is filled.

---

## After approval

Your install URL appears as:

```
https://chrome.google.com/webstore/detail/<your-extension-id>
```

Copy that into `<CHROME_STORE_URL>` placeholders in:
- `launch/PRODUCT_HUNT.md`
- `launch/HN_LAUNCH.md`
- `launch/TWITTER_X_THREAD.md`
- `launch/REDDIT.md`
- `launch/EDGE_CROSS_LISTING.md`

Then execute the launch sequence on Tuesday.
