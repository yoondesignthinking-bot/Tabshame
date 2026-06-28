# Chrome Web Store Privacy Practices tab — copy-paste sheet

The "Unable to publish" dialog blocks until every red bullet is resolved.
Below is the exact text to paste into each form field. All justifications
are written to pass a single-pass review for a local-only extension.

---

## 1. Permission justifications (one per field)

Each justification box on the Privacy practices tab matches one permission
name. Find the matching heading below, copy the block, paste.

### `tabs`

```
Required for the core feature: diagnosing the user's tab-hoarding archetype across all open tabs. We read tab URLs, titles, hostnames, timestamps, and pinned/active state to compute the user's archetype locally and identify duplicate sites for the one-tap "Close extras" action. The data is never stored beyond the current session, transmitted off-device, or shared with any third party.
```

### `tabGroups`

```
Used by the optional auto-grouping feature. When the user enables "Auto-group persona tabs" in the popup preferences, TabShame bundles the tabs that triggered the diagnosis into a labeled Chrome tab group (e.g. "LinkedIn Lurker") so the persona is visible in the tab strip. Disabled by default. Only the user's own tabs in their own window are grouped.
```

### `storage`

```
Persists user settings (auto-group toggle, new-tab mode preference) and a per-day snapshot of tab count, archetype, and duplicate count for the future "year-in-review" feature. All data is stored in chrome.storage.local on the user's device. Nothing is synced to any server.
```

### `alarms`

```
Schedules two background tasks: a periodic re-diagnosis so the user's archetype stays current as their tabs change, and a weekly "Wrapped" reminder notification. No remote calls are made on alarm fire.
```

### `notifications`

```
Sends a single OS notification when the user's archetype changes (for example, "You've earned The LinkedIn Lurker"). One notification per archetype transition; the user can disable notifications in chrome://settings or by uninstalling.
```

### `topSites` (optional)

```
Opt-in only. The user explicitly grants this permission from the new-tab page when they want their most-visited sites to appear as shortcut tiles. Used solely to render those tiles. Read on demand each time the new-tab page loads; never stored, transmitted, or shared.
```

### `bookmarks` (optional)

```
Opt-in only. The user explicitly grants this permission from the new-tab page when they want their Bookmark Bar to appear as shortcuts. Read-only access — TabShame never creates, modifies, or deletes a bookmark. Used solely to render the shortcut tiles on the new-tab page.
```

### `favicon` (optional)

```
Required to render small site icons on the topSites and bookmark shortcut tiles via the chrome-extension://EXT_ID/_favicon/ URL. Read from Chrome's local favicon cache only. No external network requests are made to fetch favicons.
```

---

## 2. Remote code use

The dialog asks whether you use remote code. **Answer: "No, I am not using remote code."**

If a free-text box appears, paste:

```
TabShame does not load, execute, or rely on any remote code. All JavaScript ships inside the extension package. There are no remote scripts, no eval(), no new Function(), no fetch of executable content, and no remote configuration.
```

---

## 3. Single purpose description

Paste this verbatim into the "Single purpose" field:

```
TabShame's single purpose is to diagnose the user's tab-hoarding archetype from their open tabs and generate a shareable image of the result, with all processing performed locally on the user's device.
```

---

## 4. Data-usage certification (three checkboxes)

Tick all three:

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases.
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

(All three are true — TabShame never transmits user data anywhere.)

---

## 5. Privacy-policy URL field

Paste the hosted URL once the privacy page is live. If you can't get the
domain up in time, GitHub Pages works as a fallback:

```
https://tabshame.app/privacy
```

or fallback:

```
https://<your-github-username>.github.io/tabshame-privacy/
```

The HTML to upload sits at `website/privacy.html` in this repo.

---

## 6. Screenshot — minimum 1, max 5

Required size: **1280×800 PNG** (landscape).

Fastest path:

1. Open Chrome at default window size on a Retina display.
2. Click the TabShame toolbar icon → popup opens with a live diagnosis.
3. **Cmd+Shift+4** → drag a rectangle around the popup → screenshot saved to Desktop.
4. The macOS screen capture will be at 2× (~760×950). To hit Chrome's
   required 1280×800: open the PNG in Preview → Tools → Adjust Size →
   set Width to 1280, leave "Scale proportionally" off → Height to 800.
5. If the popup is shorter than 800px, the easiest fix is to take the
   screenshot on a paper-colored background and let the editor pad to
   1280×800.

Even easier alternative: take a full Chrome window screenshot
(Cmd+Shift+4 then Spacebar then click the window) at 1280×800-ish
window size, then crop to 1280×800 in Preview.

Suggested filename: `screenshot-1-diagnosis.png`.

---

## 7. After pasting everything

1. Click **Save Draft** at the bottom of each tab as you go — the dashboard does NOT autosave.
2. Return to the listing-status banner. The 11 red bullets should now all be green.
3. Click **Submit for review**.

Expected review time for a local-only extension with no host_permissions: 1–3 business days. If the reviewer asks follow-up questions, they come by email to your developer account.
