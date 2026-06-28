# Product Hunt Launch Kit — TabShame

A successful PH launch needs: (a) a hunter, (b) a sharp tagline, (c) the
first-comment maker post, (d) the gallery, (e) a coordinated launch-day
amplification plan. This doc has all five.

---

## When to launch

**Tuesday or Wednesday at 12:01 AM Pacific** (8 AM UTC / 5 PM KST).

Why:
- Mondays are saturated by big-company drops.
- Thursday/Friday traffic drops; PH algorithm favors early-week.
- 12:01 AM PT gives you the full 24-hour leaderboard window in your
  favor. (PH ranks by daily voting.)

**Avoid**: US public holidays, the week of WWDC / Google I/O / OpenAI
DevDay (gets buried in adjacent launches).

---

## Hunter

**Self-hunt is fine in 2026.** PH removed the hunter advantage in 2023.
Submit yourself, no hunter outreach required.

If you do want a hunter: aim for someone with 5–20k followers who hunts
in adjacent niches (productivity, browser tools, design ops). Avoid
mega-hunters (Chris Messina, Marc Köhlbrugge) — their slate is full and
the boost from their follower base is no longer load-bearing.

---

## Tagline (60 chars max)

**Primary:**
```
73 tabs open? TabShame names your hoarder archetype.
```
(53 chars)

**Backup if PH rejects "shame":**
```
Diagnose your tab-hoarding pattern. 38 archetypes.
```
(50 chars)

---

## Description (260 chars max — appears under tagline)

```
TabShame reads your open tabs locally and tells you what kind of
hoarder you are. 38 archetypes — The LinkedIn Lurker, The 3am WebMD
Patient, The Reddit Loop. Free, no signup, no servers. Generate a
share card and post the shame.
```
(252 chars)

---

## Maker comment (the first comment after your launch)

The first comment under your own PH launch gets ~70% of total scrolls.
Treat it like the hero pitch.

```
Hi PH 👋 I built TabShame because I was the third person in a row to
joke "I have 47 tabs open" on a video call and realize that's actually
a personality, not a number.

TabShame reads your open tab list locally and diagnoses your specific
hoarder archetype. Some examples:

 • The LinkedIn Lurker — 5+ LinkedIn profiles + you've checked your own
   page count this week
 • The 3am WebMD Patient — symptom-checker tabs, between 1–5am
 • The Reddit Loop — 5+ Reddit threads
 • The Inbox Avoidance — 5+ Gmail/Outlook/Proton tabs
 • The Travel Stack Detective — 5+ across Booking / Agoda / Trip.com /
   MakeMyTrip / etc.

  …33 more. Some are very specific (The Mech Keyboard Hoarder, The
PhD Lit Review Avoider, The Pre-Date Detective).

Why I'm proud of this:

 1. **It's actually private.** Zero remote requests. No fetch, no
    XMLHttpRequest, no analytics, no cookies. The extension's
    host_permissions is `[]`. You can verify by reading the source.

 2. **The share cards.** One click downloads X / Instagram / Story
    cards as PNGs. Direct compose intent for X. The aesthetic is
    intentional — editorial / zine, not "productivity SaaS".

 3. **It's also useful.** One-tap "Close extras" collapses same-site
    tabs to one per domain. Cmd+Shift+F opens a full-bleed tab finder.
    Auto-group persona tabs into labeled Chrome groups so your strip
    self-organizes.

Things I want feedback on:

 — Which archetypes are missing? I want this list to feel personal to
   everyone. If your hoarding pattern isn't covered, tell me and I'll
   add it.

 — The roast tone. It's warm-but-pointed. Not mean. If anything reads
   as judgment rather than affection, I want to know.

 — Anything that broke or looked wrong on your specific Chrome.

Install link: <CHROME_STORE_URL>
Source: <YOUR_REPO_URL> (or "DM me for the repo link if you want to
audit before installing")

Thanks for your tabs 🤘
```

Replace `<CHROME_STORE_URL>` and `<YOUR_REPO_URL>` before posting.

---

## Gallery (upload to PH in this order)

PH allows up to 5 gallery images + 1 video.

| # | Asset | Source | Purpose |
|---|---|---|---|
| 1 | Hero | `store-screenshot-1.png` (1280×800 popup hero) | First-impression — the redesigned popup |
| 2 | Archetype reveal | `store-screenshot-2.png` | The "you are X" moment |
| 3 | Share-the-shame | `store-screenshot-3.png` | Shows the IG / X direct buttons + 3 card sizes |
| 4 | Tab finder | `store-screenshot-4.png` | The non-obvious power feature |
| 5 | Dark mode | `store-screenshot-5.png` | Proves the polish |
| 6 (video) | Optional 30s screen capture | Record yourself opening 5 LinkedIn tabs → click TabShame → archetype reveals → Open report → share card downloads | The single biggest conversion-rate driver |

---

## Topics / categories

Pick 3:
- **Chrome Extensions** (primary)
- **Productivity**
- **No-Code** (only if PH still lists it) OR **Design Tools** OR **Personal Productivity**

Avoid: **Marketing**, **Crypto**, **AI** — wrong audience.

---

## Launch-day amplification plan

Schedule into your calendar. Times in PT.

| Time | Action |
|---|---|
| **00:01** | PH live. Tweet the launch from the maker account with link + share card embed. |
| **00:05** | Post in 2–3 relevant Slacks/Discords (Indie Hackers, MacOS-dev, designer communities). |
| **08:00** | LinkedIn post with the same hook (different framing — "Built this because I was the third person…"). |
| **12:00** | Submit to HN as "Show HN: TabShame …" (see HN_LAUNCH.md). |
| **15:00** | Reply to every PH comment personally. The PH algorithm boosts active makers. |
| **20:00** | Cross-post to r/chromeextensions (see REDDIT.md). |
| **23:55** | Last-call tweet thanking everyone who voted, regardless of position. |

The goal is **not** top-3. Top-10 is enough for ~3k installs on day one.

---

## After PH

- Add the "Featured on Product Hunt" embed to `tabshame.app` (PH gives
  you the embed code post-launch).
- If you placed in top-5, you're eligible for the PH email digest — about
  60k extra impressions over the next week.
- Save every email of every user who comments "I'd pay for X" — that's
  your beta list for Year-in-Review Pro.

---

## What to skip

- **Don't pre-launch a "coming soon" page on PH.** Discover-page algo
  doesn't reward it anymore.
- **Don't ask for upvotes in any post.** Both PH and HN ban this and
  flag it via incoming-link analysis. Phrase as "would love feedback"
  instead.
- **Don't pay for upvote services.** They're detectable, and a single
  flag from the team kills your account permanently.
