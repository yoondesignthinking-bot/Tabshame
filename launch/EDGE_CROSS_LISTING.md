# Microsoft Edge Add-ons — cross-listing guide

Edge runs the same MV3 bundle as Chrome. Cross-listing takes ~45 min,
costs $0, and adds ~5% of Chrome's audience for almost no extra effort.
Worth doing the day after Chrome approves.

---

## Why bother

- **Free distribution channel.** No fees, no approval bottleneck like
  iOS. Approval takes 24–72h.
- **Same `.zip`, same `manifest.json`.** Edge's add-on store accepts
  Chrome's MV3 bundle directly. No code changes required.
- **No competition.** The Edge store has dramatically less inventory
  than the Chrome Web Store — your extension is easier to find by
  category browsing. Many users actively look in the Edge store rather
  than installing Chrome extensions from CWS via Edge's compatibility
  layer.
- **Brand-name signal.** "Available on Chrome AND Edge" reads as more
  legitimate in marketing copy than "Chrome only".

---

## Step-by-step

### 1. Create a Microsoft Partner Center account (one-time, ~10 min)

URL: <https://partner.microsoft.com/dashboard/microsoftedge/public/account/dashboard>

You need a Microsoft account (Outlook / Hotmail / personal Microsoft
ID — your Gmail will work via Microsoft account linking).

When you sign up:
- Choose **"Individual" account type** (vs. Company) unless you have
  a registered business.
- Fill the billing-info section even though there's no fee. Microsoft
  uses it for tax reporting on revenue you may earn from store
  promotions in the future.
- Select your country/region (this affects which markets your add-on
  is available in by default).
- Accept the developer agreement.

Approval is instant for individual accounts in most countries.

### 2. Submit a new add-on

URL: <https://partner.microsoft.com/dashboard/microsoftedge/public/extensions>

Click **"Create new extension"**.

You'll go through 4 tabs in order:

#### Tab 1: Availability
- **Markets**: select all (default).
- **Visibility**: Public (or Hidden for a soft launch — Hidden Edge
  add-ons are still installable via direct link, similar to
  Chrome's Unlisted).
- **Pricing**: Free.

#### Tab 2: Properties
- **Category**: Productivity (primary).
- **Privacy policy URL**: paste your hosted URL
  (`https://tabshame.app/privacy`).
- **Website**: `https://tabshame.app`.
- **Support contact info**: `nysgbuilderbros@gmail.com`.

#### Tab 3: Store listing

Use the SAME copy as Chrome Web Store. Edge accepts:
- **Display name**: TabShame
- **Short description** (132 chars): paste from
  `SUBMIT_PASTE_TEXT.md`.
- **Detailed description** (~1000 chars): paste from
  `STORE_LISTING.md §3` long description.
- **Search terms** (≤7 keywords):
  ```
  tab manager, tab finder, productivity, chrome tabs, archetype,
  share card, dark mode
  ```
- **Logo (300×300 PNG)**: Edge wants a 300×300 specifically (different
  from Chrome's 128×128). Resize your icon-128.png in Preview to
  300×300 with "Resample" off.
- **Screenshots**: same 1280×800 files from `store-screenshot-*.png`.
  Upload all 5.

#### Tab 4: Packages
- Upload the SAME `tabshame-v1.0.0.zip` you submitted to Chrome.
- Edge automatically extracts and validates the manifest. If anything
  fails validation, the error will quote the exact line.

### 3. Submit for review

Click **Submit**. Edge's review takes 24–72h for first submissions
(faster than Chrome for new developers). You'll get an email when it
goes live.

---

## What Edge handles differently

| Topic | Chrome | Edge |
|---|---|---|
| Listing logo size | 128×128 | 300×300 |
| Promo tile | 440×280 + 1400×560 | Not required (Edge has no promo-tile concept) |
| Permission justifications | Required per-permission | One free-text "justification" field for the whole extension |
| Single-purpose statement | Required | Not required, but space exists in "additional notes" |
| Visibility options | Public / Unlisted / Private | Public / Hidden |
| Review SLA | 1–3 business days | 24–72 hours |
| Updates after launch | Re-submit `.zip` | Same |

---

## Edge-specific copy adjustments

The store listing description should be Edge-friendly. Two small swaps
from the Chrome version:

1. Where the Chrome description says "Chrome group" or "Chrome's local
   list", change to "browser group" / "your browser's local list" so
   the copy reads neutrally to Edge users. The extension's code does
   this automatically — it uses Chrome's APIs which Edge implements.

2. The keyboard shortcut: Edge users press **Ctrl+Shift+F** (not
   Cmd+Shift+F) on Windows. Mac Edge users use Cmd+Shift+F.

A quick adapted version:

```
TabShame: 73 tabs open? We see you.

TabShame reads your open tabs locally, diagnoses your tab-hoarding
archetype, and turns it into a share card. 38 archetypes including
The LinkedIn Lurker, The 3am WebMD Patient, The Reddit Loop, and
The Travel Stack Detective.

▸ One-tap Close extras collapses same-site tabs to one per domain
▸ Ctrl+Shift+F opens a full-bleed tab finder with live search
▸ Auto-group persona tabs into a labeled browser group
▸ Three share-card formats — X, Instagram, Stories — as local PNGs

100% local. We see nothing. No analytics, no servers, no telemetry.
Available for Chrome and Edge.
```

---

## After Edge launch

- Add "Also on Edge" link to `tabshame.app` and to the Chrome listing's
  long description (Chrome doesn't allow direct Edge store links in the
  short description, but the long description usually slips through).
- Edge's developer dashboard shows install counts but NO referrer
  breakdown (vs. Chrome's). So Edge is a black-box growth channel; you
  won't know which marketing post drove installs.
- Edge's review is more lenient than Chrome's. If Chrome rejects you
  but Edge approves, you've gotten partial validation while you appeal
  Chrome.

---

## What about Firefox?

Firefox uses **WebExtensions**, which is largely compatible with MV3
but has gaps. TabShame would need three changes:

1. `service_worker` → `scripts: ["background.js"]` (Firefox doesn't
   support service workers in MV3 yet as of 2026 — they're rolling out
   slowly).
2. `chrome.tabGroups` doesn't exist in Firefox. The auto-group feature
   would need to fall back to a "do nothing" path.
3. The `commands` API works but Firefox's keyboard shortcut UX is
   different.

The Firefox port would take ~half a day. Skip for v1; consider for v1.2.

---

## What about Brave / Opera / Arc?

These all use the Chromium engine and support the Chrome Web Store
directly. **Your CWS listing is automatically installable on Brave,
Opera, and Arc.** No separate listing needed.

The only thing you might do: add badges to `tabshame.app` showing the
extension works on all four browsers (it does, since they all share
the Chromium extension API).
