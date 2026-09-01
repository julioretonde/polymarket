# Balmoral Running — Shopify theme

A Shopify Liquid + CSS recreation of the `balmoralrunning.com` home page, built
from a SingleFile capture of the live storefront
(`Balmoral - Premium Running Gear`, saved 31 Aug 2026).

## Layout of the theme

```
theme/
├── layout/theme.liquid                    document shell, header/nav/cart/footer wiring
├── templates/
│   ├── index.json                         the captured home page, section by section
│   └── 404 · page · product · collection · cart · search   minimal stand-ins (see below)
├── sections/
│   ├── site-header.liquid                 fixed header: menus, logo, cart, search
│   ├── site-nav.liquid                    burger panel for < 1200px
│   ├── site-footer.liquid                 menus, newsletter, localization, credits
│   ├── pb-row-hero.liquid                 full-bleed image hero + button blocks
│   ├── pb-row-page-header.liquid          full-bleed looping video
│   ├── pb-row-promo-products.liquid       promo panel beside a 2-up product grid
│   ├── pb-row-featured-products.liquid    titled 4-up collection grid
│   ├── pb-row-text-media.liquid           copy layered over an image + a video
│   └── pb-row-text-columns.liquid         four linked cards
├── snippets/
│   ├── product-preview.liquid             the product card, incl. colour swatches
│   ├── site-cart.liquid                   cart drawer
│   ├── pb-row-wrapper-class.liquid        per-breakpoint spacing utilities
│   ├── pb-row-wrapper-style.liquid        --zindex / --text-color / --bg-color
│   ├── font-face.liquid · meta-tags.liquid
│   └── icon-logo · icon-cart · icon-search · icon-close
├── assets/
│   ├── theme.css                          the storefront stylesheet, un-minified
│   ├── theme.js                           the interactions the markup depends on
│   └── NeueMontreal-*.woff2               six faces (300/400/500, roman + italic)
├── config/settings_schema.json · settings_data.json
└── locales/en.default.json
```

## The CSS

`assets/theme.css` is the storefront's own stylesheet. Rules, order and values
are unchanged — it was only un-minified and given one space after each
declaration colon. Two edits were unavoidable:

- The six `@font-face` blocks moved to `snippets/font-face.liquid`, because
  their `src` has to resolve through `asset_url`. The declarations themselves
  are identical.
- The localization `<select>` chevron kept its original inline
  `data:image/svg+xml` background — it is embedded in `theme.css` exactly as the
  storefront serves it.

Every other data URI in the capture was a page image or a font, and those are
theme/product assets rather than stylesheet content.

## What the capture could not give us

**`sf-hidden` is not a theme class.** SingleFile stamps it on every element that
was `display: none` at save time and ships its own
`.sf-hidden{display:none!important}` rule. In the capture it lands on the burger
button, the mobile nav, the search panel, the cart recommendations and the
localization dialog. Reproducing it would have hidden all of those permanently,
so it is dropped; the theme's own `[aria-hidden="true"]` rules — which are in
`theme.css` — do that work instead.

**Empty containers.** The capture ships `#site-nav` and
`#site-header__searchbar` empty; the live theme fills them on demand. Both are
`display: none` until their control is expanded, so they are populated here from
the same link lists and search route, and nothing about the page as captured
changes.

**Images and videos** were inlined as base64 by the capture, so their CDN URLs
are gone. Section settings expose `image_picker` / `video` pickers instead;
pick the assets in the theme editor. The captured page used:

| Row | Media |
| --- | --- |
| Hero | runners image |
| Page header | `e9774d0a…HD-1080p` video |
| Promo (Headwear / Oakwood) | promo stills |
| Text over media | image + `c96a1942…HD-1080p` video |
| Text columns | four card stills |

**Products and collections** are read from the store. `templates/index.json`
references the handles the captured page used (`somerville-4-panel-hat`,
`oakwood-tank-top`, `cotton-t-shirts`, `performance-t-shirts`, …); they resolve
once those products exist in the shop.

## The JavaScript

The live site runs Locomotive Scroll, Swiper, Windmill and a set of custom
elements. `assets/theme.js` is a dependency-free stand-in for the behaviour the
markup actually needs: header scroll state, the three `aria-controls` panels,
lazy video promotion from `data-src`, swatch rollover, localization selects, and
a scrollable text-columns track below 768px. Page transitions and smooth
scrolling are not reproduced.

## Stand-in templates

`404`, `page`, `product`, `collection`, `cart` and `search` are **not** part of
the captured page. They are deliberately minimal, and exist so the home page's
links land somewhere real. Replace them with the store's own templates.

## Fonts

The six Neue Montreal woff2 files were extracted from the capture, where they
were embedded as data URIs. Neue Montreal is a commercial typeface — make sure
the store's licence covers self-hosting before deploying or redistributing
these files.

## Verification

The theme was rendered with stub Shopify data and screenshotted against the
capture in Chromium. At 1440px both pages are 1440 × 6140 and differ in 0.15% of
pixels; at 390px both are 390 × 5571 and differ in 0.44%. Every difference traces
to one of: stub data (which products are sold out, how many countries are in the
switcher), SingleFile's injected "open video in new tab" icon, or the burger
button that `sf-hidden` had suppressed in the capture. The eight
`pb-row-wrapper` spacing class strings match the capture character for
character, in order.
