"""
_make_store_assets.py — render Chrome Web Store listing graphics.

Outputs (into the repo root, not assets/ — these are marketing artifacts):

  Required by the dashboard:
    store-screenshot-1.png   1280×800   popup hero (redesigned)
    store-promo-small.png    440×280    search-result tile
    store-promo-marquee.png  1400×560   Featured-shelf eligibility

  Recommended (richer listing):
    store-screenshot-2.png   1280×800   report archetype reveal
    store-screenshot-3.png   1280×800   share-the-shame row
    store-screenshot-4.png   1280×800   tab finder grid
    store-screenshot-5.png   1280×800   dark mode

No external deps beyond Pillow. Run from anywhere:
    python3 assets/_make_store_assets.py
"""

from PIL import Image, ImageDraw, ImageFont
import os

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Editorial palette — matches the extension's CSS tokens
PAPER = (244, 237, 224)        # --paper
INK = (26, 22, 18)             # --ink
INK_SOFT = (97, 89, 80)        # ~ink @ 60% over paper
SHAME = (230, 57, 70)          # --shame
PEACH = (255, 137, 102)        # --peach
LAVENDER = (184, 164, 255)     # --lavender

# Dark mode tokens
DARK_PAPER = (28, 22, 18)
DARK_INK = (240, 230, 212)
DARK_INK_SOFT = (168, 161, 148)
DARK_SHAME = (240, 104, 118)
DARK_PEACH = (255, 154, 122)


def find_font(candidates, size):
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                pass
    return ImageFont.load_default()


SERIF = [
    "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
    "/System/Library/Fonts/NewYork.ttf",
    "/System/Library/Fonts/Supplemental/Georgia.ttf",
]
SERIF_BOLD = [
    "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf",
    "/System/Library/Fonts/Supplemental/Georgia Bold.ttf",
]
MONO = [
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/SFNSMono.ttf",
]
ITALIC = [
    "/System/Library/Fonts/Supplemental/Times New Roman Italic.ttf",
    "/System/Library/Fonts/Supplemental/Georgia Italic.ttf",
]


def paint_gradient(w, h, c1, c2, base=PAPER):
    """Soft diagonal gradient peach → lavender over a paper base."""
    img = Image.new("RGB", (w, h), base)
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ox = ImageDraw.Draw(overlay)
    for y in range(h):
        for x in range(0, w, 4):
            t = (x + y) / (w + h)
            r = int(c1[0] * (1 - t) + c2[0] * t)
            g = int(c1[1] * (1 - t) + c2[1] * t)
            b = int(c1[2] * (1 - t) + c2[2] * t)
            ox.rectangle((x, y, x + 4, y + 1), fill=(r, g, b, 70))
    img.paste(overlay, (0, 0), overlay)
    return img


def center_text(d, text, font, y, width, color):
    try:
        tw = d.textlength(text, font=font)
    except Exception:
        tw = len(text) * (font.size if hasattr(font, "size") else 12)
    d.text(((width - tw) // 2, y), text, fill=color, font=font)


# ─── PRIMARY SCREENSHOT — popup hero (redesigned hierarchy) ─────────
def make_screenshot_popup_hero():
    """1280×800 — shows the redesigned popup: small tab-count label at
    top, archetype emoji + name as visual hero, pull-quote roast,
    merged extras block."""
    w, h = 1280, 800
    img = paint_gradient(w, h, PEACH, LAVENDER)
    d = ImageDraw.Draw(img)

    f_mono_lg = find_font(MONO, 22)
    f_mono = find_font(MONO, 16)
    f_mono_sm = find_font(MONO, 13)
    f_serif_hero = find_font(SERIF_BOLD, 100)
    f_italic_lg = find_font(ITALIC, 36)
    f_italic = find_font(ITALIC, 20)
    f_emoji = find_font(SERIF_BOLD, 90)

    pad = 80

    # Header
    d.text((pad, 56), "TAB SHAME · WRAPPED", fill=INK_SOFT, font=f_mono)
    d.text((w - pad - 220, 56), "PRESS THE GEAR FOR SETTINGS", fill=INK_SOFT, font=f_mono)

    # Top meta: small tab-count line — matches new popup hierarchy
    meta_y = 130
    d.text((pad, meta_y), "73", fill=INK, font=find_font(MONO, 18))
    d.text((pad + 38, meta_y + 3), "tabs open · feral", fill=INK_SOFT, font=f_mono_sm)

    # Divider
    d.line([(pad, meta_y + 38), (w - pad, meta_y + 38)], fill=INK_SOFT, width=1)

    # Hero: archetype emoji + name
    d.text((pad, 220), "(emoji)", fill=INK, font=f_emoji)
    d.text((pad, 320), "The LinkedIn", fill=INK, font=f_serif_hero)
    d.text((pad, 420), "Lurker", fill=INK, font=f_serif_hero)

    # Pull-quote — the personality
    quote_y = 550
    # peach left border
    d.rectangle((pad, quote_y, pad + 5, quote_y + 80), fill=PEACH)
    d.text((pad + 24, quote_y), '"7 profiles open. None of them', fill=INK, font=f_italic_lg)
    d.text((pad + 24, quote_y + 44), 'viewed yours back. Sorry, queen."', fill=INK, font=f_italic_lg)

    # Merged extras block hint
    box_y, box_h = 690, 70
    d.rounded_rectangle((pad, box_y, w - pad, box_y + box_h), radius=12, fill=(255, 255, 255, 80), outline=INK_SOFT)
    d.text((pad + 16, box_y + 14), "TOP HAUNT · linkedin.com", fill=INK_SOFT, font=f_mono_sm)
    d.text((pad + 16, box_y + 36), "7 tabs · 4 extras closeable", fill=INK, font=f_mono)
    d.text((w - pad - 160, box_y + 22), "Close extras →", fill=INK, font=f_mono)

    return img


# ─── SCREENSHOT 2 — report archetype reveal ────────────────────────
def make_screenshot_report_reveal():
    w, h = 1280, 800
    img = paint_gradient(w, h, LAVENDER, PEACH)
    d = ImageDraw.Draw(img)

    pad = 100
    f_mono = find_font(MONO, 16)
    f_eyebrow = find_font(MONO, 14)
    f_serif_xl = find_font(SERIF_BOLD, 80)
    f_italic = find_font(ITALIC, 24)
    f_count = find_font(SERIF_BOLD, 200)

    d.text((pad, 60), "TAB SHAME · WRAPPED", fill=INK_SOFT, font=f_mono)
    d.text((w - pad - 130, 60), "JUNE 2026", fill=INK_SOFT, font=f_mono)

    # Compact hero — smaller count
    d.text((pad, 140), "73", fill=SHAME, font=f_count)
    d.text((pad + 290, 230), "TABS OPEN", fill=INK_SOFT, font=f_mono)
    d.text((pad + 290, 256), '"suspiciously low. are you... okay?"', fill=INK, font=f_italic)

    # Archetype reveal panel
    panel_y = 420
    d.rounded_rectangle((pad - 20, panel_y, w - pad + 20, panel_y + 280),
                        radius=20, fill=(255, 255, 255, 110))
    center_text(d, "YOUR ARCHETYPE", f_eyebrow, panel_y + 30, w, INK_SOFT)
    center_text(d, "The LinkedIn Lurker", f_serif_xl, panel_y + 90, w, INK)
    center_text(d, "You open profiles like books and refresh your", f_italic, panel_y + 200, w, INK_SOFT)
    center_text(d, "own like it's a slot machine.", f_italic, panel_y + 232, w, INK_SOFT)

    return img


# ─── SCREENSHOT 3 — share-the-shame ─────────────────────────────────
def make_screenshot_share():
    w, h = 1280, 800
    img = paint_gradient(w, h, PEACH, LAVENDER)
    d = ImageDraw.Draw(img)

    pad = 90
    f_mono = find_font(MONO, 16)
    f_mono_lg = find_font(MONO, 18)
    f_section = find_font(MONO, 14)
    f_serif_med = find_font(SERIF_BOLD, 44)
    f_label = find_font(MONO, 12)

    d.text((pad, 50), "TAB SHAME · WRAPPED", fill=INK_SOFT, font=f_mono)

    d.text((pad, 130), "SHARE THE SHAME", fill=INK_SOFT, font=f_section)

    # Two big direct-share buttons
    btn_y, btn_h = 180, 70
    btn_w = (w - pad * 2 - 16) // 2
    # X button (filled ink)
    d.rounded_rectangle((pad, btn_y, pad + btn_w, btn_y + btn_h), radius=14, fill=INK)
    d.text((pad + 30, btn_y + 22), "🆇  SHARE ON X", fill=PAPER, font=f_mono_lg)
    # IG button (gradient stand-in: peach)
    ig_x = pad + btn_w + 16
    d.rounded_rectangle((ig_x, btn_y, ig_x + btn_w, btn_y + btn_h), radius=14, fill=(238, 42, 123))
    d.text((ig_x + 26, btn_y + 22), "📸  SAVE FOR INSTAGRAM", fill=(255, 255, 255), font=f_mono_lg)

    # Three card previews
    cards_y = 320
    card_w = (w - pad * 2 - 60) // 3
    card_h = 380
    card_labels = [
        ("X · 16:9", "1200×675"),
        ("Instagram · 4:5", "1080×1350"),
        ("Stories · 9:16", "1080×1920"),
    ]
    for i, (name, dims) in enumerate(card_labels):
        cx = pad + i * (card_w + 30)
        d.rounded_rectangle((cx, cards_y, cx + card_w, cards_y + card_h),
                            radius=16, fill=(255, 255, 255, 140))
        # Mini "73" hero inside each
        d.text((cx + card_w // 2 - 50, cards_y + 40), "73", fill=SHAME, font=f_serif_med)
        d.text((cx + 16, cards_y + card_h - 70), name, fill=INK, font=f_mono)
        d.text((cx + 16, cards_y + card_h - 44), dims, fill=INK_SOFT, font=f_label)

    return img


# ─── SCREENSHOT 4 — tab finder grid ─────────────────────────────────
def make_screenshot_tabfinder():
    w, h = 1280, 800
    img = Image.new("RGB", (w, h), PAPER)
    d = ImageDraw.Draw(img)

    pad = 60
    f_mono = find_font(MONO, 16)
    f_mono_sm = find_font(MONO, 12)
    f_input = find_font(SERIF, 22)
    f_section = find_font(MONO, 12)

    # Top bar
    d.rectangle((0, 0, w, 110), fill=(255, 255, 255))
    d.text((pad, 30), "FIND A TAB", fill=INK, font=f_mono)
    d.text((pad, 56), "↑↓ navigate · Enter switch · Esc close", fill=INK_SOFT, font=f_mono_sm)
    d.text((w - pad - 80, 56), "73 tabs", fill=INK_SOFT, font=f_mono_sm)

    # Search bar
    sb_y = 140
    d.rounded_rectangle((pad, sb_y, w - pad, sb_y + 58), radius=14,
                        fill=(255, 255, 255), outline=INK_SOFT)
    # search icon
    d.ellipse((pad + 22, sb_y + 22, pad + 36, sb_y + 36), outline=INK_SOFT, width=2)
    d.line((pad + 33, sb_y + 33, pad + 40, sb_y + 40), fill=INK_SOFT, width=2)
    d.text((pad + 60, sb_y + 18), "linkedin", fill=INK, font=f_input)

    # Filter chips
    chip_y = 220
    chips = [("ALL", 73), ("LINKEDIN.COM", 7), ("YOUTUBE.COM", 5), ("GITHUB.COM", 4)]
    cx = pad
    for label, count in chips:
        chip_w = 8 + len(label) * 7 + 8 + 20
        d.rounded_rectangle((cx, chip_y, cx + chip_w, chip_y + 28), radius=14,
                            fill=(255, 255, 255), outline=INK_SOFT)
        d.text((cx + 12, chip_y + 8), f"{label}  {count}", fill=INK, font=f_mono_sm)
        cx += chip_w + 8

    # Tab tiles grid
    grid_y = 290
    cols, rows = 4, 3
    tile_w = (w - pad * 2 - (cols - 1) * 14) // cols
    tile_h = 130
    titles = [
        "Anna Kim — Product Designer",
        "Pull request: feat/persona-engine",
        "Alex Chen — Software Engineer",
        "feed | LinkedIn",
        "Jordan T. — Open to work",
        "Notifications · LinkedIn",
        "Hiring? · LinkedIn",
        "Maya P. — Senior Designer",
        "Recruiter spam · LinkedIn",
        "Lin Yi — UX Lead",
        "Network growth tips",
        "Job alerts · LinkedIn",
    ]
    for i in range(cols * rows):
        if i >= len(titles): break
        r, c = i // cols, i % cols
        x = pad + c * (tile_w + 14)
        y = grid_y + r * (tile_h + 14)
        d.rounded_rectangle((x, y, x + tile_w, y + tile_h), radius=12,
                            fill=(255, 255, 255), outline=INK_SOFT)
        # favicon stub
        d.rounded_rectangle((x + 14, y + 14, x + 40, y + 40), radius=6, fill=PEACH)
        # title
        title = titles[i]
        if len(title) > 28: title = title[:27] + "…"
        d.text((x + 14, y + 56), title, fill=INK, font=f_mono_sm)
        d.text((x + 14, y + 90), "linkedin.com", fill=INK_SOFT, font=find_font(MONO, 10))

    return img


# ─── SCREENSHOT 5 — dark mode ────────────────────────────────────────
def make_screenshot_dark():
    w, h = 1280, 800
    img = Image.new("RGB", (w, h), DARK_PAPER)
    d = ImageDraw.Draw(img)

    pad = 80
    f_mono = find_font(MONO, 18)
    f_mono_sm = find_font(MONO, 13)
    f_serif_hero = find_font(SERIF_BOLD, 100)
    f_italic_lg = find_font(ITALIC, 32)
    f_emoji = find_font(SERIF_BOLD, 80)

    d.text((pad, 56), "TAB SHAME · WRAPPED", fill=DARK_INK_SOFT, font=f_mono)
    d.text((w - pad - 280, 56), "DARK MODE · FOLLOWS SYSTEM", fill=DARK_INK_SOFT, font=f_mono)

    # Big shame-red number in dark theme
    d.text((pad, 160), "73", fill=DARK_SHAME, font=find_font(SERIF_BOLD, 240))
    d.text((pad + 320, 280), "TABS OPEN", fill=DARK_INK_SOFT, font=f_mono)
    d.text((pad + 320, 310), '"suspiciously low. are you... okay?"',
           fill=DARK_INK, font=find_font(ITALIC, 22))

    # Archetype + roast in dark
    d.text((pad, 480), "(emoji)  The YouTube Rabbit-Holer", fill=DARK_INK, font=find_font(SERIF_BOLD, 56))

    # Peach left border + italic
    d.rectangle((pad, 580, pad + 5, 700), fill=DARK_PEACH)
    d.text((pad + 24, 590), '"You started with pasta and ended', fill=DARK_INK, font=f_italic_lg)
    d.text((pad + 24, 632), 'with WWII tank treads. The algorithm', fill=DARK_INK, font=f_italic_lg)
    d.text((pad + 24, 674), 'is scared."', fill=DARK_INK, font=f_italic_lg)

    return img


# ─── PROMO SMALL — 440×280 ──────────────────────────────────────────
def make_promo_small():
    w, h = 440, 280
    img = paint_gradient(w, h, PEACH, LAVENDER)
    d = ImageDraw.Draw(img)

    f_hero = find_font(SERIF_BOLD, 110)
    f_brand = find_font(SERIF_BOLD, 22)
    f_label = find_font(MONO, 12)
    f_tag = find_font(MONO, 10)

    center_text(d, "73", f_hero, 40, w, SHAME)
    center_text(d, "TABS OPEN", f_label, 175, w, INK_SOFT)
    center_text(d, "TAB SHAME", f_brand, 205, w, INK)
    center_text(d, "WE SEE YOU · 100% LOCAL", f_tag, 244, w, INK)
    return img


# ─── PROMO MARQUEE — 1400×560 ────────────────────────────────────────
def make_promo_marquee():
    w, h = 1400, 560
    img = paint_gradient(w, h, PEACH, LAVENDER)
    d = ImageDraw.Draw(img)

    f_hero = find_font(SERIF_BOLD, 280)
    f_label = find_font(MONO, 22)
    f_brand = find_font(MONO, 18)
    f_arch = find_font(SERIF_BOLD, 30)

    d.text((90, 90), "73", fill=SHAME, font=f_hero)
    d.text((90, 380), "TABS OPEN · WE SEE YOU", fill=INK, font=f_label)

    archs = [
        "The LinkedIn Lurker",
        "The YouTube Rabbit-Holer",
        "The Comparison Shopper",
        "The 3am WebMD Patient",
        "The Reddit Loop",
    ]
    y0 = 110
    for i, name in enumerate(archs):
        y = y0 + i * 58
        d.ellipse((720, y + 16, 736, y + 32), fill=SHAME)
        d.text((756, y), name, fill=INK, font=f_arch)

    d.text((90, h - 50), "TABSHAME.APP", fill=INK, font=f_brand)
    d.text((w - 90 - 250, h - 50), "ALL DATA STAYS LOCAL", fill=INK, font=f_brand)

    return img


def main():
    artifacts = {
        # Required by dashboard
        "store-screenshot-1.png": make_screenshot_popup_hero(),
        "store-promo-small.png": make_promo_small(),
        "store-promo-marquee.png": make_promo_marquee(),
        # Recommended for richer listing
        "store-screenshot-2.png": make_screenshot_report_reveal(),
        "store-screenshot-3.png": make_screenshot_share(),
        "store-screenshot-4.png": make_screenshot_tabfinder(),
        "store-screenshot-5.png": make_screenshot_dark(),
    }
    for fname, img in artifacts.items():
        path = os.path.join(REPO_ROOT, fname)
        img.save(path, "PNG", optimize=True)
        print(f"✓ {fname}  ({img.size[0]}×{img.size[1]})  → {path}")


if __name__ == "__main__":
    main()
