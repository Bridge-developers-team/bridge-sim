# BRIDGE — Brand kit (Midnight Navy / Gold)

**Chosen concept:** the first Bridge navy-and-gold logo direction. This kit is suitable for the team, presentations, Figma and frontend implementation.

## Official palette

| Token | HEX | Where to use |
|---|---|---|
| Midnight Navy (primary) | `#0B1A3A` | Logo, headings, navigation, primary CTA |
| Signature Gold (accent) | `#C9A14E` | Small highlights, lines, accents, logo path |
| Ivory (background) | `#F6F1E6` | Main page background |
| Stone (secondary) | `#3B332B` | Secondary text / editorial use |
| White (surface) | `#FFFFFF` | Cards, form controls |
| Warm Border | `#DAD6CD` | Dividers, input borders |
| Muted Text | `#63656D` | Supportive descriptions |
| Navy hover | `#172B50` | Primary button hover |

Use **navy as the dominant brand color**, ivory as a warm neutral base, and gold sparingly (roughly 5–10% of visual emphasis). Avoid gold as small text on ivory because of contrast.

## Fonts

- **Logo:** use the supplied visual logo artwork; do not retype it with an arbitrary font.
- **Site interface, buttons, body, dashboard:** **Inter**, 400 / 500 / 600 / 700.
- **Optional editorial hero or quote:** **Literata**, 400 / 500, sparingly. Keeping most of the product in Inter will feel more confident and consistent.
- For UI readability: base text 16px, line height 1.5, headings 32–56px depending on page, button text 14–16px.

## Files

- `bridge_logo_reference_transparent.png` — horizontal logo, 867 × 205 px, transparent background, rendered from `bridge_logo_vector.svg`.
- `bridge_logo_reference_2x.png` — horizontal logo, 1734 × 410 px, for presentations.
- `bridge_icon_round.png` — circular icon / avatar, 1024 px, rendered from `bridge_icon_vector_round.svg`.
- `bridge_icon_round_512.png`, `bridge_icon_round_256.png` — smaller round formats.
- `bridge_app_icon_rounded.png` — rounded-square app icon, 1024 px, rendered from `bridge_app_icon_rounded.svg`.
- `bridge_favicon.ico`, `bridge_favicon_source.png` — browser favicons.
- `bridge_logo_vector.svg` — vector master of the horizontal logo: redrawn bridge mark (navy arch, gold inner face and deck) plus the approved "Bridge" letterforms traced to outlines, so no font is needed.
- `bridge_logo_vector_flat.svg`, `bridge_logo_flat_2x.png` — flat horizontal logo: solid navy and gold, no gradients.
- `bridge_icon_vector_round.svg` — vector master of the round icon (metallic gold on navy).
- `bridge_app_icon_rounded.svg` — vector master of the rounded-square app icon; also the source of the favicon files.
- `bridge_icon_round_flat.svg`, `bridge_icon_round_flat.png` (+ `_512`, `_256`) — flat round icon: solid navy and gold, no gradients or shadow. Use where metallic effects are unwanted (product UI, print, embroidery, single-colour use).
- `bridge_app_icon_rounded_flat.svg`, `bridge_app_icon_rounded_flat.png` — flat rounded-square app icon.
- `bridge_theme.css`, `bridge_colors.json` — copy/paste tokens.
- `BRIDGE_brand_guide.pdf` — one-page brand guide.

## Usage

1. Place the complete transparent PNG in the **navbar and pitch deck** (preserves the precise selected logo style).
2. Place the circular icon for **social avatars**; use the rounded-square edition for **mobile app icon**.
3. Use the favicon for the website's `<link rel="icon" href="/bridge_favicon.ico">`.
4. Implement UI color tokens and Inter, while keeping most surfaces light and clean.
5. The SVG files are the masters. Change a logo in its SVG (Figma, Illustrator or a text editor), then re-export the PNGs and the ICO from it; never edit a PNG directly.

## Tagline

**Your next career, without starting over.**

Alternate: **A clearer path to what's next.**

## What to avoid

- Gradients, fake gold metallic effects, glassmorphism and large decorative gold surfaces in the product UI.
- Using gold as a small-text color on ivory.
- Changing the Bridge letterforms from screen to screen.
- Combining this palette with the older sage/forest green concept.

## Suggested message to Claude Code

> Keep the product's functionality unchanged. Apply the Bridge Midnight Navy/Signature Gold identity from `bridge_theme.css`. Use Inter for product UI and the supplied logo assets; the horizontal transparent logo belongs in the header, the round mark belongs in profile/social contexts, and the ICO belongs in the browser tab. Replace the earlier sage-green palette entirely. Keep the UI editorial, restrained and high-contrast: ivory page, white cards, navy text and navy CTAs, thin warm borders, gold only for important accents. Validate mobile and desktop contrast/responsiveness. Do not recreate or alter the logo in CSS.
