# Reddit launch posts

Reddit is the single most rule-sensitive launch surface. Different subs
have different self-promo rules and tone expectations. This doc has
post copy for three subs (in priority order) + the meta-rules every
sub shares.

---

## The meta-rules (apply everywhere)

1. **Read the sub's pinned rules before posting.** Mods on Reddit
   shadow-remove submissions silently — your post just disappears with
   no notification. Always confirm via incognito after posting.
2. **Reply to every comment within the first hour.** Reddit's vote
   algorithm weights active OPs heavily. If you don't respond, the
   post gets buried regardless of upvote count.
3. **Don't link to a "buy" or "subscribe" page anywhere.** Free Chrome
   extension is fine on most subs; anything monetized requires
   pre-cleared flair or full disclosure.
4. **One sub per day, max.** Multi-sub same-day cross-posting triggers
   anti-spam flags across the platform.
5. **Use 9:16 or 4:5 portrait crops for image posts.** Reddit's mobile
   client favors portrait images strongly.

---

## Priority 1: r/chromeextensions

~50k members. Welcoming to legitimate Show Reddits.
Post type: **Text + image**.

### Title
```
I built a Chrome extension that names your tab-hoarding archetype (38 of them, 100% local)
```

### Body
```
Hey r/chromeextensions —

I shipped my first Chrome extension this week and I'd love feedback
before I add anything more.

TabShame reads your open tabs locally and classifies the pattern into
one of 38 archetypes — The LinkedIn Lurker, The YouTube Rabbit-Holer,
The 3am WebMD Patient, The Reddit Loop, etc. Then you can download
the diagnosis as a share card (X / Instagram / Stories sized).

Bonus features:

  • One-tap "Close extras" — collapses same-site tabs to one per
    domain (5 LinkedIn profile tabs become 1)
  • Cmd+Shift+F opens a full-bleed tab finder with live search
  • Auto-group persona tabs into a labeled Chrome tab group

Technical decisions I'm proud of (and would love feedback on):

  1. **host_permissions = `[]`**. No content scripts, no URL pattern
     matching. The extension reads only what `chrome.tabs.query`
     exposes (URL, title, hostname, pinned, timestamps). Even chrome://
     pages are correctly excluded.

  2. **Zero outbound network**. No fetch, XHR, WebSocket, sendBeacon
     anywhere in the codebase. No analytics, no telemetry. The single
     external URL is twitter.com/intent/tweet, opened via
     chrome.tabs.create from a user click.

  3. **Manifest V3, vanilla JS, no build step**. The whole zip is
     ~92 KB. Lib folder has 5 modules; service worker importScripts
     them at boot.

  4. **The archetype engine is data-driven**. domain-rules.js
     declares 38 rule sets with these operators: domainCount,
     domainsAnyCount, domainsAllCount, duplicateUrl, titleContains,
     oldestAgeDays, timeOfDayHours, tabCount, localhostCount. Adding
     a new persona is a single entry — no engine change.

  5. **Persona priority by "more tabs wins"**. If you have 5 LinkedIn
     + 6 YouTube tabs, you're The YouTube Rabbit-Holer. Priority is
     only a tiebreak.

Install: <CHROME_STORE_URL>

Things I want feedback on specifically:

  — Anything that breaks on weird Chrome configurations (Brave, Arc,
    Edge users especially — same MV3 bundle, but I haven't tested
    all four)
  — Personas that feel mis-tuned
  — The "Close extras" semantics: I switched from "same URL" to "same
    hostname" recently. 5 different LinkedIn profiles now collapse to
    1 — but so do 5 different GitHub repos. Open question whether
    that's right.

Happy to answer technical questions. Roast me about my code if you
spot something.
```

### After posting:
- Wait 30 min. If you have <10 upvotes and no comments, edit the
  post to add a screenshot as the top image. The image strongly boosts
  visibility on Reddit's algorithm.

---

## Priority 2: r/chrome

~80k members. Less welcoming to self-promo than r/chromeextensions.
Read the rules before posting — they require certain flairs.

### Title
```
[Extension] TabShame — a private, local-only extension that names your tab-hoarding pattern
```

### Body (shorter than r/chromeextensions; this audience prefers brevity)
```
Built this because I was the third person in a row to joke "I have
47 tabs open" on a video call and realized that's a personality.

TabShame classifies your tab-hoarding pattern into 38 archetypes:
The LinkedIn Lurker, The 3am WebMD Patient, The Reddit Loop, etc.
You can download the diagnosis as a share card.

Manifest V3. host_permissions = []. No analytics, no remote calls,
no signup. Open source.

Install: <CHROME_STORE_URL>

Would love feedback.
```

---

## Priority 3: r/productivity

~3M members. Bigger reach but stricter rules — likely no direct links
allowed in self-posts. Check the sidebar.

### If links allowed:
Use the r/chrome body above with a sidebar tweak emphasizing the
"one-tap Close extras" and tab finder as productivity tools.

### If links NOT allowed:
Don't post here. The "shame" framing reads as anti-productivity to this
sub. Save for after you have ~5k installs and can post the
"how-I-built-X-and-X-people-installed-it-in-7-days" lessons-learned
genre instead.

---

## Subs to AVOID for v1 launch

- **r/InternetIsBeautiful** — strictly no extensions / installable
  software. Pure web content only.
- **r/SideProject** — fine for the lessons-learned post AFTER launch,
  not for the launch itself. The audience there is mostly other
  builders, not end users.
- **r/macapps** — Chrome extensions don't qualify, even though it
  technically runs on macOS.

---

## Universal reply templates

For predictable comments. Keep these as scratch text; lightly modify
each reply.

### "Cool idea but [different archetype I have] is missing"
```
That one's a real pattern, you're right. Add it to the issues at
<repo>/issues — or DM me the domain list and I'll PR it in this
week.
```

### "Privacy claim is unverifiable / suspect"
```
Fair concern. Two things you can do:
  1. Open the extension's source (./lib/ + background.js + popup/),
     grep for `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`.
     You'll get zero hits.
  2. Open chrome://extensions, "Inspect views: service worker",
     and watch the Network tab. Empty.
The host_permissions field in manifest.json is literally `[]`, which
means the extension can't reach any URL pattern.
```

### "Why not just use [native Chrome tab grouping]?"
```
You can — and the auto-group feature is built on chrome.tabGroups.
The classification is what's novel: 38 archetypes vs. Chrome's
unnamed groups. The share card is the other reason — "I'm The
Reddit Loop" reads way different than "I have 5 tabs grouped".
```

### "Doesn't seem useful, it's a joke"
```
Yeah, it leans into being a joke on purpose. The share card is the
output. The two practical features (Close extras, tab finder) are
the reason it's still installed after the joke wears off.
```

(Don't argue. If they hate it after one reply, leave it.)

---

## Tracking what works

Keep a tiny tally per sub (in the same week of launch):
- Sub
- Time posted
- Upvotes at 1h / 6h / 24h
- Install conversions (from CWS dashboard's referrer breakdown — if
  Reddit referrer shows >50 installs that day, your post landed)
- Top comment thread (worth replying to or not)

After 2 weeks you'll know which sub to target for v1.1, v2, etc.
