"""
Generates placeholder TabShame icons (16, 48, 128) using only the stdlib.

The icons are a peach square with a bold black "TS" wordmark. Notification
state is driven by chrome.action.setBadgeText (the always-on tab-count
badge) and OS notifications, not by a baked-in red dot — the dot in the
earlier revision looked decorative rather than like a notification, so
it was removed in Jun 2026.

    python3 assets/_make_icons.py

Outputs: icon-16.png, icon-48.png, icon-128.png in this directory.
"""

import os
import struct
import zlib

ROOT = os.path.dirname(os.path.abspath(__file__))

# Palette (TabShame design system)
PEACH = (255, 137, 102, 255)
INK = (26, 22, 18, 255)
PAPER = (244, 237, 224, 255)


def make_pixels(size):
    """Return a bytearray of RGBA pixels (size*size*4)."""
    px = bytearray(size * size * 4)
    # Background: peach with rounded-corner mask.
    radius = max(2, size // 6)
    for y in range(size):
        for x in range(size):
            i = (y * size + x) * 4
            if _in_rounded_rect(x, y, size, radius):
                _set(px, i, PEACH)
            else:
                _set(px, i, (0, 0, 0, 0))

    # "TS" wordmark — drawn from a 5x7 bitmap font, scaled.
    # No shame-dot in the corner: notifications are now signaled by the
    # toolbar badge text (chrome.action.setBadgeText) so the base icon
    # stays clean. A decorative dot can't be reliably distinguished from
    # a real notification indicator, which was the original complaint.
    _draw_text(px, size, "TS", INK)

    return px


def _set(px, i, color):
    px[i] = color[0]
    px[i + 1] = color[1]
    px[i + 2] = color[2]
    px[i + 3] = color[3]


def _in_rounded_rect(x, y, size, r):
    if x < r and y < r:
        return (r - x) ** 2 + (r - y) ** 2 <= r * r
    if x >= size - r and y < r:
        return (x - (size - r - 1)) ** 2 + (r - y) ** 2 <= r * r
    if x < r and y >= size - r:
        return (r - x) ** 2 + (y - (size - r - 1)) ** 2 <= r * r
    if x >= size - r and y >= size - r:
        return (x - (size - r - 1)) ** 2 + (y - (size - r - 1)) ** 2 <= r * r
    return True


# Tiny 5x7 bitmap font, just enough for "TS".
GLYPHS = {
    "T": [
        "11111",
        "00100",
        "00100",
        "00100",
        "00100",
        "00100",
        "00100",
    ],
    "S": [
        "01111",
        "10000",
        "10000",
        "01110",
        "00001",
        "00001",
        "11110",
    ],
}


def _draw_text(px, size, text, color):
    # Pick a scale so the text fits roughly across the lower half of the icon.
    avail_w = int(size * 0.7)
    char_w = 5
    gap = 1
    total_units = char_w * len(text) + gap * (len(text) - 1)
    scale = max(1, avail_w // total_units)
    text_w = total_units * scale
    text_h = 7 * scale
    start_x = (size - text_w) // 2
    start_y = int(size * 0.55)

    for ci, ch in enumerate(text):
        glyph = GLYPHS.get(ch)
        if not glyph:
            continue
        gx_origin = start_x + ci * (char_w + gap) * scale
        for gy in range(7):
            row = glyph[gy]
            for gx in range(char_w):
                if row[gx] == "1":
                    for dy in range(scale):
                        for dx in range(scale):
                            x = gx_origin + gx * scale + dx
                            y = start_y + gy * scale + dy
                            if 0 <= x < size and 0 <= y < size:
                                i = (y * size + x) * 4
                                _set(px, i, color)


def write_png(path, size, pixels):
    """Minimal PNG writer (RGBA8)."""

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    raw = bytearray()
    stride = size * 4
    for y in range(size):
        raw.append(0)  # filter: none
        raw.extend(pixels[y * stride : (y + 1) * stride])
    idat = zlib.compress(bytes(raw), 9)

    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", idat))
        f.write(chunk(b"IEND", b""))


def main():
    for size in (16, 48, 128):
        out = os.path.join(ROOT, f"icon-{size}.png")
        pixels = make_pixels(size)
        write_png(out, size, pixels)
        print(f"wrote {out}")


if __name__ == "__main__":
    main()
