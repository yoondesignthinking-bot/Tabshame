Fonts used by TabShame
======================

The CSS uses Fraunces, Instrument Serif, and JetBrains Mono with system
fallbacks (Georgia, monospace). The extension renders correctly without
the font files — just slightly less editorial.

To bundle the actual fonts (recommended for the final shareable cards):

  1. Download from Google Fonts:
       - Fraunces            https://fonts.google.com/specimen/Fraunces
       - Instrument Serif    https://fonts.google.com/specimen/Instrument+Serif
       - JetBrains Mono      https://fonts.google.com/specimen/JetBrains+Mono
     Use weights: Fraunces 900, Instrument Serif 400 italic, JetBrains Mono 600.

  2. Drop the .woff2 files into this directory.

  3. Add @font-face declarations to popup/popup.css and report/report.css.
     Example:

       @font-face {
         font-family: "Fraunces";
         src: url("../assets/fonts/Fraunces-Black.woff2") format("woff2");
         font-weight: 900;
         font-style: normal;
         font-display: swap;
       }

  4. The Canvas card renderer reads from document fonts, so the fonts must
     be loaded before card generation. The popup waits on DOMContentLoaded
     and the report awaits the report data, so a `document.fonts.ready`
     await before card render is the cleanest hook.
