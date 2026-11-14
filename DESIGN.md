---
name: Bridge
description: Your next career, without starting over.
colors:
  ground: "#edf1e8"
  surface: "#ffffff"
  surface-2: "#f4f7f1"
  ink: "#17241b"
  muted: "#4e5e53"
  rule: "#d3dccd"
  rule-strong: "#b8c6b2"
  band: "#1f5134"
  band-deep: "#163e27"
  band-ink: "#f3f7ef"
  band-muted: "#c2d6c6"
  action: "#1f5134"
  action-hover: "#163e27"
  soft: "#e1ecdd"
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
  dark-ground: "#101712"
  dark-surface: "#18211b"
  dark-action: "#9fdcad"
typography:
  role-title:
    fontFamily: "Archivo Variable, Arial Narrow, sans-serif"
    fontSize: "3.4rem"
    fontWeight: 820
    lineHeight: 0.95
    letterSpacing: "0.005em"
  display:
    fontFamily: "Archivo Variable, Arial Narrow, sans-serif"
    fontSize: "3rem"
    fontWeight: 760
    lineHeight: 1.02
    letterSpacing: "-0.01em"
  heading:
    fontFamily: "Archivo Variable, Arial Narrow, sans-serif"
    fontSize: "1.55rem"
    fontWeight: 760
    lineHeight: 1.1
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  bar: "3px"
  control: "8px"
  panel: "10px"
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
  packet-band:
    backgroundColor: "{colors.band}"
    textColor: "{colors.band-ink}"
    rounded: "{rounded.band}"
    padding: "26px"
---

# Design System: Bridge

## Overview

**Creative North Star: "The Seed Packet Calendar"**

Bridge's world is the printed seed packet and its sow-to-harvest calendar. A career switch is planted, tended and harvested over weeks, so the roadmap reads as a planting calendar: four week rows, one bar per task, each bar sized by its minutes, coloured by its kind like a seed variety, and filled when it is done. The world lends four things only: type, palette, density, and that one signature move. Navigation, forms and controls stay the standard web ones people already know.

The interface is a calm workspace for evenings after work. Pale leaf-paper ground, white packet-stock panels ruled at 1px, and one packet-green band per screen that carries the identity. Colour does jobs: green is action and the shell, variety colours mark task kinds, warm amber and red mark state. Nothing is decoration.

**Key Characteristics:**
- Packet-green band holding the target role in heavy condensed caps.
- The growing calendar: task bars sized by minutes, coloured by kind, outline when to-do, filled when done, a "Next" pin on the next bar.
- White panels with 1px rules on a cool leaf-paper ground; no glass, no gradients.
- Archivo condensed as the variety-name voice; the system sans for everything you read at length.
- Tap-to-choose pills instead of typed answers.

## Colors

### Primary
- **Packet Green** (`#1f5134`): the shell band, primary buttons, selected choices, focus. In dark mode the action turns to **Sprout** (`#9fdcad`) on dark green ground so buttons stay legible.

### Secondary
- **Variety colours**, one per task kind, used for the calendar bars, legend swatches and the small square on type pills. Deep values on white (`kind-*`), bright values on the green band and in dark mode (`band-*`): research marigold, learning violet, practice tomato, portfolio leaf, networking teal, application plum.

### Neutral
- **Leaf Paper** (`#edf1e8`) ground, **Packet Stock** (`#ffffff`) panels, **Seed Ink** (`#17241b`) text, **Stem** (`#4e5e53`) secondary text, **Rule** (`#d3dccd`) hairlines. Dark mode: `#101712` ground, `#18211b` panels.

### Named Rules
**The One Band Rule.** Each screen has at most one packet-green band, and it holds the identity (the target role, or the sample plan on the landing page). Everything else sits on white panels.

**The Colour Has A Job Rule.** Green means "act here" or "this is the shell". Variety colours mean a task kind. Amber and red mean state. A colour that only decorates is removed.

## Typography

**Display Font:** Archivo Variable (self-hosted from `@fontsource-variable/archivo`), set condensed (`font-stretch` 70–78%).
**Body Font:** the system UI stack.

**Character:** a seed packet's bold condensed variety name over plain, readable instructions.

### Hierarchy
- **Role title** (820, 3.4rem, line-height 0.95, uppercase, stretch 70%): the target role in the packet band; career-card titles at 1.4rem.
- **Display** (760, up to 3rem; landing hero to 4.2rem at stretch 72%): page headings.
- **Heading** (760, 1.55rem / 1.2rem): section and week headings, sentence case.
- **Body** (400, 17px, line-height 1.55): all reading text, kept under 70ch for long prose.
- **Label** (700, 0.8rem, uppercase, tracked 0.06em): small headings inside cards and table headers.

### Named Rules
**The Variety Name Rule.** Uppercase condensed caps only for short names: the target role, career titles, week tags. Sentences stay in sentence case.

**The One Size In Lists Rule.** Task lists use one text size; rank comes from weight, never from size jumps.

## Layout

A single centred column, max 980px, 16px side gutter. Panels stack with 16px between them; more space above a heading than below it. Grids use `auto-fit` minmax columns: career paths at 270px, form pairs at 240px. Under 600px, choice rows scroll sideways inside their card, the rubric table stacks, and task details lose their indent; the page itself never scrolls sideways.

## Elevation & Depth

Flat by default: panels separate by 1px rules, not shadows. The only shadow is under the landing page's sample plan (`0 18px 40px -18px rgba(18,52,32,.45)`), which lifts the one example artifact off the page.

## Shapes

Bars 3px, controls 8px, panels 10px, the packet band 14px, pills and choices fully round. Checkboxes are native, tinted with `accent-color`.

## Components

### Buttons
Primary: packet green, white text, 8px radius, 10×16 padding, 1px press. Secondary: white with a 1px strong rule, green border on hover. Icons are inline SVG strokes (2px, round caps) placed before or after the label.

### Chips (choices)
Fully round pills with a 1px rule. Selected: filled packet green, bold. Single- or multi-select via `aria-pressed`. On phones a row scrolls sideways with snap.

### Cards / Containers
White panel, 1px rule, 10px radius, 24px padding (16px on phones). Never nested. The next-action panel is the one panel with a 2px green border.

### Inputs / Fields
Scroll lists (native select) and the CV dropzone: a dashed 1.5px rule, round green icon, condensed green label; it turns soft green on hover or drag.

### Navigation
Wordmark (bridge-arch SVG mark plus "BRIDGE" in condensed caps) left, three text links right; the active link sits on a white pill.

### Growing Calendar (signature)
Inside the packet band. One row per week: a condensed "WK n" tag and a dark-green track whose full width is the user's weekly hours, with one hairline per hour. Each task is a bar with flex-basis = its minutes ÷ weekly minutes, a 1.5px border in its variety colour, filled when done. The next bar gets a white ring and a "Next" pin. Ticking a task animates its fill once (0.7s, expo-out); with reduced motion it fills instantly. Bars are buttons that jump to their task.

## Do's and Don'ts

### Do:
- **Do** show the next action before anything else on the roadmap.
- **Do** keep done tasks in place with a flat "Done" tag; nothing disappears.
- **Do** carry state by form first (outline, filled, ringed), colour second.
- **Do** label sample or AI-generated content where a visitor could mistake it.

### Don't:
- **Don't** put a small label or kicker above a heading; put the context inline or below.
- **Don't** add illustrations of plants, seeds or gardens; the world lives in type, palette and the calendar bars only.
- **Don't** use gradients, glass, glow or decorative stripes; gridlines must measure something.
- **Don't** use emoji or text glyphs as icons.
- **Don't** invent salaries, prices, durations or success scores to fill a panel.
