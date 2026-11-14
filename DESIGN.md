---
name: Bridge
description: Your next career, without starting over.
colors:
  ground: "#f6f1e6"
  surface: "#ffffff"
  surface-2: "#fbf8f2"
  ink: "#0b1a3a"
  muted: "#4a4d57"
  faint: "#63656d"
  rule: "#dad6cd"
  rule-strong: "#c4beb1"
  band: "#0b1a3a"
  band-deep: "#071230"
  band-ink: "#f6f1e6"
  band-muted: "#b7c0d4"
  action: "#0b1a3a"
  action-hover: "#172b50"
  soft: "#efe9dc"
  gold: "#c9a14e"
  focus: "#82621f"
  stone: "#3b332b"
  kind-research: "#b5790f"
  kind-learning: "#6b4fa0"
  kind-simulation: "#c23c24"
  kind-portfolio: "#2f7a4c"
  kind-networking: "#1e7590"
  kind-application: "#a3345f"
  band-research: "#f2c14e"
  band-learning: "#c3b0ef"
  band-simulation: "#ff8a6e"
  band-portfolio: "#9fdcad"
  band-networking: "#86d2e6"
  band-application: "#ef9cc1"
  dark-ground: "#0a1124"
  dark-surface: "#111a30"
  dark-band: "#15284f"
  dark-action: "#d4af62"
typography:
  role-title:
    fontFamily: "Literata Variable, Georgia, serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  display:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  heading:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  bar: "3px"
  control: "8px"
  panel: "12px"
  band: "14px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  choice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 15px"
  choice-selected:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "24px"
  span-band:
    backgroundColor: "{colors.band}"
    textColor: "{colors.band-ink}"
    rounded: "{rounded.band}"
    padding: "26px"
---

# Design System: Bridge

## Overview

**Creative North Star: "The Span"**

Bridge's identity is the brand kit in [`brand/`](brand/): a navy arch over a gold deck, Midnight Navy and Signature Gold on ivory. The direction is pinned by that kit, not rolled: "Keep the UI editorial, restrained and high-contrast: ivory page, white cards, navy text and navy CTAs, thin warm borders, gold only for important accents" (`brand/README.md`). It replaced the Seed Packet Calendar world on 2026-11-15.

A career switch is a crossing from where you are to what's next, so the roadmap is drawn as a span: four week rows inside one navy band, each task a bar sized by its minutes, coloured by its kind and filled when done. The one gold thing on the band is the next step. The world lends four things only: type, palette, density, and that signature move. Navigation, forms and controls stay the standard web ones people already know.

The interface is a calm workspace for evenings after work: ivory ground, white panels ruled at 1px in a warm border, navy text, and one navy band per screen that carries the identity.

**Key Characteristics:**
- The navy span band holding the target role in Literata, the editorial voice.
- The growing calendar: task bars sized by minutes, coloured by kind, outline when to-do, filled when done, a gold ring and "Next" pin on the next bar.
- White panels with 1px warm rules on an ivory ground; no glass, no gradients in the UI.
- Inter for everything else: headings, controls, and reading text.
- The logo drawn inline from the kit's vector, never retyped.
- Tap-to-choose pills instead of typed answers.

## Colors

### Primary
- **Midnight Navy** (`#0b1a3a`): text, the span band, primary buttons, selected choices. Hover is **Navy Hover** (`#172b50`). In dark mode the ground turns navy and the action turns to **Gold** (`#d4af62`) with navy text, so buttons stay legible.

### Accent
- **Signature Gold** (`#c9a14e`): the logo's deck and inner arch, and the next step on the calendar (ring and "Next" pin). Never small text on ivory. **Focus Gold** (`#82621f`) is the focus ring: the accent, dark enough to pass 3:1 on ivory and white.

### Secondary
- **Kind colours**, one per task kind, used for the calendar bars, legend swatches and the small square on type pills. Deep values on white (`kind-*`), bright values on the navy band and in dark mode (`band-*`): research marigold, learning violet, practice tomato, portfolio leaf, networking teal, application plum.

### Neutral
- **Ivory** (`#f6f1e6`) ground, **White** (`#ffffff`) panels, **Midnight Navy** (`#0b1a3a`) text, **Slate** (`#4a4d57`) secondary text, **Muted** (`#63656d`) faint text, **Warm Border** (`#dad6cd`) hairlines. **Stone** (`#3b332b`) is the kit's editorial secondary; the app does not use it yet. Dark mode: `#0a1124` ground, `#111a30` panels, `#15284f` band.

### Named Rules
**The One Band Rule.** Each screen has at most one navy band, and it holds the identity (the target role, or the sample plan on the landing page). Everything else sits on white panels.

**The Gold Is Rare Rule.** Gold appears in the logo and on the next step, nothing else in light mode. A second gold element dilutes the one that tells you what to do.

**The Colour Has A Job Rule.** Navy means "act here" or "this is the shell". Kind colours mean a task kind. Amber and red mean state. A colour that only decorates is removed.

## Typography

**UI and heading font:** Inter Variable (self-hosted from `@fontsource-variable/inter`).
**Editorial font:** Literata Variable (self-hosted from `@fontsource-variable/literata`), for the target role in the band, the sample plan's role, and the landing headline only.

**Character:** a confident modern sans for work, with one serif line that names where you are going.

### Hierarchy
- **Role title** (Literata 600, up to 3rem, line-height 1.05): the target role in the span band; the sample plan's role at 1.6rem.
- **Landing headline** (Literata 600, up to 4rem).
- **Display** (Inter 700, up to 3rem, -0.02em): page headings.
- **Heading** (Inter 700, 1.55rem / 1.2rem): section and week headings, sentence case; career-card titles at 1.3rem.
- **Body** (Inter 400, 17px, line-height 1.55): all reading text, kept under 70ch for long prose.
- **Label** (Inter 700, 0.8rem, uppercase, tracked 0.06em): small headings inside cards, table headers, week tags.

### Named Rules
**The One Serif Rule.** Literata names the destination and nothing else. Every other line is Inter.

**The One Size In Lists Rule.** Task lists use one text size; rank comes from weight, never from size jumps.

## Logo

The header shows the kit's horizontal logo drawn inline (`BridgeLogo` in `frontend/src/components/Icons.tsx`) from `brand/bridge_logo_vector_flat.svg`: flat colours, navy parts on `currentColor` so dark mode turns them ivory, gold parts on `--gold`. The favicon is the flat rounded-square icon (`frontend/public/favicon.svg`, `favicon.ico`), the home-screen icon the metallic one (`apple-touch-icon.png`). Change a logo in `brand/` first, then copy it here. The metallic logo files are for decks, social and app stores, not the product UI.

## Layout

A single centred column, max 980px, 16px side gutter. Panels stack with 16px between them; more space above a heading than below it. Grids use `auto-fit` minmax columns: career paths at 270px, form pairs at 240px. Under 600px, choice rows scroll sideways inside their card, the rubric table stacks, and task details lose their indent; the page itself never scrolls sideways.

## Elevation & Depth

Flat by default: panels separate by 1px rules, not shadows. The only shadow is under the landing page's sample plan (`0 18px 40px -18px rgba(11,26,58,.45)`), which lifts the one example artifact off the page.

## Shapes

Bars 3px, controls 8px, panels 12px, the span band 14px, pills and choices fully round. Checkboxes are native, tinted with `accent-color`.

## Components

### Buttons
Primary: navy, white text, 8px radius, 10×16 padding, 1px press. Secondary: white with a 1px strong rule, navy border on hover. Icons are inline SVG strokes (2px, round caps) placed before or after the label.

### Chips (choices)
Fully round pills with a 1px rule. Selected: filled navy, bold. Single- or multi-select via `aria-pressed`. On phones a row scrolls sideways with snap.

### Cards / Containers
White panel, 1px warm rule, 12px radius, 24px padding (16px on phones). Never nested. The next-action panel is the one panel with a 2px navy border.

### Inputs / Fields
Scroll lists (native select) and the CV dropzone: a dashed 1.5px rule, round navy icon, bold navy label; it turns soft ivory on hover or drag.

### Navigation
The logo left, text links right; the active link sits on a white pill.

### Growing Calendar (signature)
Inside the span band (`.packet` in the CSS). One row per week: a "WK n" label and a deep-navy track whose full width is the user's weekly hours, with one hairline per hour. Each task is a bar with flex-basis = its minutes ÷ weekly minutes, a 1.5px border in its kind colour, filled when done. The next bar gets a gold ring and a gold "Next" pin. Ticking a task animates its fill once (0.7s, expo-out); with reduced motion it fills instantly. Bars are buttons that jump to their task.

## Do's and Don'ts

### Do:
- **Do** show the next action before anything else on the roadmap.
- **Do** keep done tasks in place with a flat "Done" tag; nothing disappears.
- **Do** carry state by form first (outline, filled, ringed), colour second.
- **Do** label sample or AI-generated content where a visitor could mistake it.
- **Do** use the logo files from `brand/`; never redraw or retype the logo in CSS or a font.

### Don't:
- **Don't** put a small label or kicker above a heading; put the context inline or below.
- **Don't** add bridge illustrations or decorative arches; the world lives in type, palette, the logo and the calendar bars only.
- **Don't** use gradients, metallic gold, glass, glow or decorative stripes in the UI; gridlines must measure something.
- **Don't** use gold for small text on ivory, or for anything but the logo and the next step.
- **Don't** use emoji or text glyphs as icons.
- **Don't** invent salaries, prices, durations or success scores to fill a panel.
