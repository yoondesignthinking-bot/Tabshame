# TabShame · Website (cinematic draft)

Static marketing + onboarding site for the TabShame Chrome extension.
Vanilla HTML / CSS / JS — no build step, no framework, no dependencies.

```
website/
├── index.html      → /            (cinematic landing — chapter-based scroll)
├── welcome.html    → /welcome     (post-install onboarding)
├── style.css       → design system + chapter/animation primitives
├── script.js       → reveal observer · sticky topbar · pinned chapters
└── README.md       → you are here
```

## Run locally

```sh
cd ~/Desktop/TabShame/website && python3 -m http.server 4000
# then open http://localhost:4000/
```

## The landing-page architecture

The landing is built as a sequence of **chapters** — full-viewport-height
sections, each with a single editorial idea, that progress as you scroll.
Inspired (in spirit, not in literal execution) by Apple product pages.

| # | Chapter | Mechanic |
|---|---|---|
| 0 | **Hero** | Letter-staggered reveal + persona-name marquee at the bottom + scroll cue. |
| 1 | **The Numbers** | Pinned. Big tab count climbs (12 → 47 → 127 → 412) while the caption morphs through 4 lines. Driven by scroll progress through the chapter. |
| 2 | **The Diagnosis** | Pinned. A mock Chrome browser sits center-screen. As the user scrolls, tabs pop into the strip one by one. At the 5-tab threshold, a persona pill flies in. Continue scrolling → the persona reveal block appears in the browser body. |
| 3 | **Personas** | 9 of 34 archetype cards, each staggered reveal-on-scroll. |
| 4 | **Share** | Three share-card mockups (X/Threads, Instagram feed, Stories) in a triptych, animated in. |
| 5 | **Privacy** | Bold "WE SEE NOTHING" headline + a mock DevTools panel showing "0 requests". |
| 6 | **Install** | Full-bleed gradient + massive serif CTA. |

### Sticky elements

- **Topbar** auto-shows once the user scrolls past the hero (Intersection Observer on `#hero`).
- **Marquee** in the hero loops persona names horizontally.

## Animation system

| Primitive | How | When to use |
|---|---|---|
| `.reveal` + `data-reveal="up"` + optional `data-delay="200"` | Intersection Observer flips `.is-visible`. CSS transitions opacity + translateY. | Any element you want to fade up on scroll. |
| `data-pinned-chapter` chapters | `position: sticky` inside a tall container. Scroll progress drives state via vanilla JS. | Cinematic moments (numbers chapter, diagnosis simulator). |
| `prefers-reduced-motion` | JS detects + skips the simulator scroll machine; CSS kills all transitions/marquees. Both pinned chapters jump straight to their end state. | Always honored. |

## Run locally

```sh
cd ~/Desktop/TabShame/website
python3 -m http.server 4000      # or `npx serve .`
```

Visit `http://localhost:4000/` (landing) or `/welcome.html` (post-install).

## Deploy

Drop the folder onto any static host. No build step.

| Host | Steps |
|---|---|
| **Vercel** | `vercel --prod` from `website/`. |
| **Netlify** | Drag-and-drop the folder at app.netlify.com/drop. |
| **GitHub Pages** | Push to a repo, enable Pages from `/` root. |
| **Cloudflare Pages** | Connect repo, build command empty, output dir `website/`. |

### Pretty URLs

For `welcome.html` → `/welcome`:

- **Vercel** — `vercel.json`: `{ "cleanUrls": true }`
- **Netlify** — `_redirects`: `/welcome /welcome.html 200`

## Wire it to the extension

Update [`background.js`](../background.js) on the install handler:

```js
// Replace:
chrome.tabs.create({
  url: chrome.runtime.getURL("report/report.html?welcome=1")
});

// With:
chrome.tabs.create({
  url: "https://tabshame.com/welcome?v=" + chrome.runtime.getManifest().version
});

// And also set the uninstall feedback URL:
chrome.runtime.setUninstallURL("https://tabshame.com/uninstalled");
```

## Performance notes

- **One JS file, ~9KB unminified**, no framework. Time-to-interactive should be ~100ms on a fast connection.
- **All scroll-progress calculations** are batched into a single `requestAnimationFrame` per chapter. No layout thrashing.
- **Marquee** uses `transform: translateX()` (GPU-composited) — no jank.
- **Fonts** are loaded from Google Fonts CDN via `<link>`. For zero third-party requests (matches the extension's privacy posture), self-host the four font files and swap the `<link>` for local `@font-face` declarations.

## Things to replace before ship

1. **`assets/pin.gif`** — animated GIF of cursor → 🧩 → 📌. The single most important asset on the site; without it `/welcome` is just text. Drop in `assets/` and replace the placeholder `<div class="pin-visual">` in `welcome.html`.
2. **Real share-card PNGs** — export from the extension via the `card-renderer.js` module, drop in `assets/cards/`, swap the `<div class="share-card-canvas">` placeholders. The placeholders today are pure CSS mockups — they look fine but real screenshots will land harder.
3. **Chrome Web Store URL** — `index.html` line ~70 has `REPLACE_WITH_EXTENSION_ID`. Replace once listed.
4. **Persona detail pages** (`/personas/the-linkedin-lurker` etc.) — linked from the cards but don't exist yet. Build once core site lands; each is great long-tail SEO.
5. **`/privacy`, `/faq`, `/gallery`, `/uninstalled`** — linked in footer. Stubs for now.
6. **Favicon + OG image** — set `og:image` to a hero share card PNG.

## Voice rules

If anyone edits the copy, the four rules:
1. Never apologize for the extension.
2. Be specific (numbers > vague).
3. Treat the reader like a friend who's been caught.
4. If a line could be cut and meaning survives, cut it.
