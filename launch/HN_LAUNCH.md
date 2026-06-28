# Hacker News — Show HN draft

HN is the highest-quality skeptical audience you'll get on launch day.
Treat them well and they'll surface real technical feedback. Treat them
like marketing targets and they'll bury you.

---

## When to post

**Tuesday OR Thursday at 7:00–9:00 AM Pacific.**

Why:
- That window catches the East Coast workday startup AND the European
  late-afternoon scroll.
- Avoid Mondays (over-crowded with weekend launches), Fridays (low
  attention).
- The first 90 minutes determine whether you front-page; the algorithm
  weights early upvotes heavily.

**Don't post during major outages** (when HN is covering OpenAI down,
GitHub down, Cloudflare incidents — your "Show HN" gets buried in real
news).

---

## Title (≤80 chars, including the "Show HN: " prefix)

**Primary:**
```
Show HN: TabShame – a Chrome extension that diagnoses your tab-hoarding
```
(73 chars)

**Backup if you want a softer hook:**
```
Show HN: TabShame – name your tab-hoarding archetype, share the card
```
(70 chars)

**Avoid:**
- Don't say "AI-powered" (it's not, and HN distrusts the phrase)
- Don't say "revolutionary" / "the future of" / any superlative
- Don't include emojis in the title — HN strips them and it reads as spam

---

## URL field

Use the Chrome Web Store URL directly:
```
https://chrome.google.com/webstore/detail/<your-id>
```

A direct CWS link is better than a marketing site here — HN respects
"here's the thing, judge it" over "here's my landing page".

---

## Body text

```
Hi HN —

I built TabShame because I was the third person in a row to joke "I
have 47 tabs open" on a video call and realized that's actually a
personality, not just a number.

What it does:

  - Reads your open tabs locally.
  - Classifies the pattern into one of 38 archetypes (The LinkedIn
    Lurker, The 3am WebMD Patient, The Reddit Loop, The PhD Lit Review
    Avoider, …)
  - Lets you download the diagnosis as a share card (X 16:9, Instagram
    4:5, Stories 9:16) or open a Twitter compose intent pre-filled with
    the result.
  - Auto-groups the triggering tabs into a labeled Chrome tab group so
    your strip self-organizes.
  - Cmd+Shift+F opens a full-bleed tab finder with live search.

Technical notes that might be HN-relevant:

  1. Manifest V3, vanilla JS, no build step, no bundler. The whole
     thing is ~92 KB zipped including assets.

  2. host_permissions = []. The extension cannot read URLs or content
     from any site — it only reads the tab strip metadata exposed by
     chrome.tabs.query (URL, title, hostname, pinned state, timestamps).
     No content script.

  3. Zero outbound network. No fetch / XHR / WebSocket / sendBeacon
     anywhere. No analytics, no telemetry. The single outbound URL is
     twitter.com/intent/tweet, opened by chrome.tabs.create on user
     click — the extension itself never connects to anything.

  4. The archetype engine is data-driven. domain-rules.js declares 38
     rule sets with these operators: domainCount, domainsAnyCount,
     domainsAllCount, duplicateUrl, titleContains, oldestAgeDays,
     timeOfDayHours, tabCount, localhostCount. Adding a new persona is
     a single entry in that file — no engine changes.

  5. ~1,076 distinct domains registered, including regional variants
     (Amazon × 14 regions, Shopee × 8, Lazada × 6, etc.).

  6. Persona priority is resolved by "more tabs wins" with a priority
     tiebreak — if you have 5 LinkedIn + 6 YouTube tabs, you become
     The YouTube Rabbit-Holer, not The LinkedIn Lurker.

  7. Dark mode follows prefers-color-scheme. Tokens are duplicated in
     a single @media block per surface — no JS theme switching.

I'd love feedback on:

  — Which archetypes are missing or mis-tuned? The rule definitions
    are in lib/domain-rules.js if anyone wants to PR an addition.

  — The "Close extras" semantics. I switched it from "same URL" to
    "same hostname" recently because users expected 5 different
    LinkedIn profile URLs to be treated as one site. There's a
    tradeoff: 5 different GitHub repos also collapse to one. Open
    question whether that's the right call.

  — Anything else.

Install: <CHROME_STORE_URL>
Source (if curious): <YOUR_REPO_URL>

Happy to answer technical questions. Will be in the thread for the
next several hours.
```

---

## After you post

**First 30 minutes — sit in the thread.**

Reply to every comment. Match tone:
- Genuine question → genuine answer with detail.
- Skeptical question → engage with the skepticism, don't deflect.
- "I don't get it / wouldn't use it" → don't defend. Thank them, move on.
- Compliment → don't over-thank. A simple "thanks, that's the bet" works.

**HN-specific landmines to avoid:**

- **Don't post the same link in multiple threads.** Mods will dead it.
- **Don't ask for upvotes anywhere** — HN actively detects this via
  referrer logs and flags submissions. Your account can be shadowbanned
  silently for weeks.
- **Don't compare yourself to competitors.** HN voters dislike that.
  If asked about alternatives, give a fair comparison.
- **Don't argue with critics.** If someone says it's a "useless toy",
  thank them and move on. Long replies to negative feedback look
  defensive and drag your visibility down.

**What's normal to expect:**
- ~5–15% positive engagement rate.
- 1–3 "this is stupid / why does this exist" comments. Ignore them.
- 1–2 "the privacy story is suspect, prove it" comments. Reply by
  pointing to the lack of host_permissions + grep results for `fetch`.

**Best-case outcome**: 200+ upvotes, front-page for 6+ hours, ~10k
installs over 48 hours.

**Realistic outcome for a small Show HN**: 30–60 upvotes, off-front-page
but listed on /show, ~500–1.5k installs.

**If it dies (< 5 upvotes in first hour)**: don't repost. HN treats
re-submission of dead links harshly. Wait 6 months and try with a
substantial v2 changelog.
