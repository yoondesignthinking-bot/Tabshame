# TabShame Privacy Policy

_Last updated: June 2, 2026_

**TabShame does not collect, store, transmit, or sell any user data.**

Every operation in this extension runs locally on your device:

- **Tab metadata** (URLs, titles, count, age) is read locally via Chrome's
  `chrome.tabs` API and used only to compute your archetype.
- **Your archetype** is calculated locally by JavaScript bundled inside
  the extension. The decision tree never leaves your browser.
- **Share cards** (PNG images) are rendered locally with the Canvas API
  and downloaded directly to your device.
- **Settings and snapshots** are stored in `chrome.storage.local`,
  which lives on your device and is never synced to any server we control.

We use **no analytics, no tracking pixels, no cookies, no remote servers,
no third-party SDKs**. There is no telemetry, no usage reporting, no
crash collector, no advertising network.

## What we *don't* see

- We don't see the URLs of your tabs.
- We don't see the contents of any web page.
- We don't see your browsing history, bookmarks, downloads, or saved passwords.
- We don't see your IP address — the extension makes no outbound network
  requests of any kind.

## Optional permissions

TabShame ships with two optional permissions (`topSites`, `bookmarks`)
that you can grant or revoke at any time from the new-tab page or
`chrome://extensions`. They are **opt-in only** — never auto-granted.
When granted, the corresponding data (most-visited sites; bookmark bar)
is read locally and rendered as shortcut tiles on the new tab page. It
is never read by, transmitted to, or stored anywhere outside your browser.

## Data retention

TabShame keeps a small amount of state in `chrome.storage.local`:

- The current tab archetype (a short string id).
- A rolling per-day snapshot of your tab count, archetype, and duplicate
  count — used to power future "year-in-review" features.
- Your preferences (auto-group toggle, new-tab mode).

You can wipe this entirely at any time by removing TabShame from
`chrome://extensions`, which deletes all extension storage.

## Third-party code

TabShame includes no third-party JavaScript libraries, frameworks, or
SDKs at runtime. The CSS optionally references three Google Fonts
(Fraunces, Instrument Serif, JetBrains Mono) by name with system-font
fallbacks. The font files themselves are **not bundled** and are **not
downloaded** at runtime — only system fonts ship with the extension.

## Children

TabShame is not directed at children under 13 and does not knowingly
collect data from any user — adult or child — because it does not collect
data from anyone.

## Changes to this policy

If the policy ever changes, the "Last updated" date at the top will
reflect the change. Material changes (e.g. if any data ever started
leaving your device) would be announced in the extension's update
description so you can review before updating.

## Contact

hello@tabshame.app
