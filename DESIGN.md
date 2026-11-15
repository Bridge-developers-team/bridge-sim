---
name: Bridge
description: Your next career, without starting over.
colors:
  ground: "#f6f1e6"
  surface: "#ffffff"
  surface-2: "#fbf8f2"
  ink: "#0b1a3a"
  muted: "#46506a"
  faint: "#5d667e"
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
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  choice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
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
    padding: "24px"
---

# Design System: Bridge

## Overview

**Material: Liquid Glass (2026-11-15).** The navy-and-gold identity is rendered in a liquid-glass material, chosen by the team from an approved test design: translucent panels (white at about 52%, a 24px backdrop blur with saturation) float over a slow ambient light of soft gold, navy and sky orbs. Every glass surface has a bright 1px top rim, a hairline edge and a soft specular sheen on its upper left. Controls are capsules. The header is a floating glass capsule with a thin gold-to-navy scroll-progress line. The span band is bright glass with navy type in light mode (the calendar uses the deep kind colours) and deep navy glass with a faint gold glow in dark mode. All of it lives in `frontend/src/styles/glass.css`, which loads last and overrides `components.css`.

**The Gold Is Focus Rule.** Gold, as a fill or a glow (`--focus-glow`), marks the single most important thing in view: the final action of a form, the plan's next step and its button, the path you chose, a selected option's check, and the pace control's active edge. Everything else stays neutral glass and navy. If two things on one screen glow gold, one of them is wrong.

**The Visible Pick Rule.** A chosen chip or list option is filled navy with white text in light mode, and gold with navy text in dark mode. A choice must never look like the unchosen ones.

**Theme.** One Light/Dark switch (sun and moon), no Auto option. The first visit follows the device; a click stores an explicit choice.


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
- **Ivory** (`#f6f1e6`) ground, **White** (`#ffffff`) panels, **Midnight Navy** (`#0b1a3a`) text, **Slate** (`#46506a`) secondary text and **Muted** (`#5d667e`) faint text, both tinted toward navy so the greys belong to the brand, **Warm Border** (`#dad6cd`) hairlines. **Stone** (`#3b332b`) is the kit's editorial secondary; the app does not use it yet. Dark mode: `#0a1124` ground, `#111a30` panels, `#15284f` band.

### Named Rules
**The One Band Rule.** Each screen has at most one navy band, and it holds the identity (the target role, or the sample plan on the landing page). Everything else sits on white panels.

**The Gold Is Rare Rule.** Gold appears in the logo and on the focus element of each screen (see The Gold Is Focus Rule), nothing else. A second gold element dilutes the one that tells you what to do.

**The Colour Has A Job Rule.** Navy means "act here" or "this is the shell". Kind colours mean a task kind. Amber and red mean state. A colour that only decorates is removed.

**The Tinted Grey Rule.** Every grey leans toward navy. A neutral grey (equal R, G and B) looks borrowed from another product.

## Typography

**UI and heading font:** Inter Variable (self-hosted from `@fontsource-variable/inter`).
**Editorial font:** Literata Variable (self-hosted from `@fontsource-variable/literata`), for the target role in the band, the sample plan's role, and the landing headline only.

**Character:** a confident modern sans for work, with one serif line that names where you are going.

### Scale
Six sizes, nothing in between (rem = 16px): **xs** 0.75rem (12px), **sm** 0.875rem (14px), **md** 1rem (16px), **body** 17px, **lg** 1.25rem (20px), **xl** 1.5rem (24px), plus the display sizes for page headings, the role title and the landing headline. Tokens: `--type-xs` to `--type-xl` in `tokens.css`.

### Hierarchy
- **Role title** (Literata 600, up to 3rem, line-height 1.05): the target role in the span band; the sample plan's role at 1.6rem.
- **Landing headline** (Literata 600, up to 4rem).
- **Display** (Inter 700, up to 3rem, -0.02em): page headings.
- **Heading** (Inter 700, xl 1.5rem / lg 1.25rem): section and week headings, sentence case; career-card titles at lg.
- **Body** (Inter 400, 17px, line-height 1.55): all reading text, kept under 70ch for long prose.
- **Label** (Inter 700, 0.8rem, uppercase, tracked 0.06em): small headings inside cards, table headers, week tags.

### Named Rules
**The One Serif Rule.** Literata names the destination and nothing else. Every other line is Inter.

**The One Size In Lists Rule.** Task lists use one text size; rank comes from weight, never from size jumps.

**The Weight Not Size Rule.** Hierarchy comes from weight and colour first: a title is only a step larger than its body, but heavier and darker; supporting text is Slate. A card never carries more than three sizes.

## Logo

The header shows the kit's horizontal logo drawn inline (`BridgeLogo` in `frontend/src/components/Icons.tsx`) from `brand/bridge_logo_vector_flat.svg`: flat colours, navy parts on `currentColor` so dark mode turns them ivory, gold parts on `--gold`. The favicon is the flat rounded-square icon (`frontend/public/favicon.svg`, `favicon.ico`), the home-screen icon the metallic one (`apple-touch-icon.png`). Change a logo in `brand/` first, then copy it here. The metallic logo files are for decks, social and app stores, not the product UI.

## Layout

A single centred column, max 980px, 16px side gutter. Panels stack with 16px between them; more space above a heading than below it.

**The Four-Point Rule.** Every gap, padding and margin is a multiple of 4px from the scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64), set through `--space-*` tokens, never a loose pixel value. Spacing does the grouping: a label sits closer to its input than fields sit to each other, and items inside a section sit closer than sections do. 1px is for borders only. Grids use `auto-fit` minmax columns: career paths at 270px, form pairs at 240px. Under 600px, choice rows scroll sideways inside their card, the rubric table stacks, and task details lose their indent; the page itself never scrolls sideways.

## Elevation & Depth

Three layered, navy-tinted elevations, each a short contact shadow plus a soft long one (never one heavy blur). Dark mode uses deeper black versions of the same three.
- **1, resting** (`--shadow-1`): panels and default buttons sit just above the ivory page.
- **2, raised** (`--shadow-2`): a hovered button or chip, the segmented control's thumb, primary buttons.
- **3, floating** (`--shadow-3`): things above the page: option sheets and popovers, the final action bar.

Depth follows interaction: a button lifts one level on hover and presses back down on click.

## Shapes

Bars 3px, small tags 4px, controls 8px, panels 12px, the span band 14px, pills and choices fully round. **The Nested Radius Rule:** an element inside a container gets a smaller radius than the container (band 14 > track 8 > bar 3; panel 12 > control 8 > tag 4), so the curves line up. Borders are 1px and use the warm rule colour. Checkboxes are native, tinted with `accent-color`.

## Components

### Buttons
Every button has depth: it rests at elevation 1, lifts 1px to elevation 2 on hover, and presses down (scale 0.98) on click. Primary: navy (gold in dark mode), white text, a 1px inner top highlight, 8px radius, 8×16 padding at 40px tall. **Final action** (`btn--cta`): the one button that finishes a form; 56px tall, 12px radius, 20px bold label, an arrow in a round chip that leans forward on hover, inside a floating action bar that sticks to the bottom of the screen and shows a one-line summary of the answers. It never greys out: with something missing, clicking it scrolls to the missing part and says what to add. **The One Primary Rule:** a screen has one primary button, the thing the screen is for. Everything else is secondary, subtle or a text link. Secondary: white with a 1px strong rule, navy border on hover. Icons are inline SVG strokes (2px, round caps) placed before or after the label.

### Chips (choices)
Fully round pills with a 1px rule. Selected: filled navy, bold. Single- or multi-select via `aria-pressed`. On phones a row scrolls sideways with snap.

### Cards / Containers
White panel, 1px warm rule, 12px radius, 24px padding (16px on phones). Never nested. The next-action panel is the one panel with a 2px navy border.

### Settings rows and option sheets
**Update (Liquid Glass):** option lists no longer open as pop-ups. Tapping a row unfolds its list right underneath, inside the same card: a search capsule for long lists, options as capsules in a grid (one column on phones), a "n of max chosen" line and Done for multi-choice. Only one list is open at a time, the page keeps scrolling, and Escape closes it. The text below describes the retired pop-up.

Answers on the start form are rows, not open text boxes: label on the left, current value on the right, a chevron that nudges right on hover, 56px tall, 1px dividers. Tapping a row opens an **option sheet**: a popover that grows out of the row on a wide screen, a bottom sheet that slides up on a phone (with a grip bar). Long lists get a search box, and a typed value that is not in the list can be used as is. Multi-choice sheets show "n of max" and a Done button. Built on `<dialog>` (Escape, focus trap, focus returns to the row).

### Segmented control
Three to four mutually exclusive options (pace) in one sunken track; a raised white thumb glides to the choice, and the choice's one-line explanation fades in below.

### CV card
Empty: one Upload CV button plus two text links (paste text instead, try a sample). Loaded: a compact file row (icon, name, word count, Replace) and a "Check the text" link that unfolds the editable text. Dropping a file anywhere on the card works.

### Inputs / Fields
Scroll lists (native select) and the CV dropzone: a dashed 1.5px rule, round navy icon, bold navy label; it turns soft ivory on hover or drag.

### Navigation
The logo left, text links right; the active link sits on a white pill.

### Motion
**Liquid Glass motion (overrides the timings below where they differ).**
- **Page changes:** the new page glides up from 48px below, sharpening from a 12px blur (0.75s, ease-out-quint), so the steps feel like one continuous page.
- **Scrolling:** panels and cards rise 56px, scale up from 0.96 and sharpen from blur as they enter, finishing within their first 240px on screen, so nothing is left half-drawn when you stop. The ambient light shifts hue slowly with scroll position, and the header's progress line fills.
- **Landing:** the hero copy arrives in a staggered sequence and the sample plan floats gently. Below it, the landing is one continuous story (where you are, three paths, 30 days, try the job, proof) whose meters fill as they arrive.
- **Focus:** when the focus element first appears it pulses once with a soft gold ring, then rests at its glow. It never loops.
- **Buttons:** a highlight sweeps across a capsule on hover, which lifts 2px and scales 1.02; pressing scales to 0.97.
- **Landing narrative:** a "See how it works" cue under the hero bobs gently and fades away once you scroll (the one looping animation outside loaders, because it disappears). Down the story runs a gold thread that grows as you read; each step number turns gold as its scene arrives. The story ends in a highlighted glass card (gold glow) holding the main action.
- The ambient orbs drift slowly (about 30s cycles); everything above is off with reduced motion.

Smooth, short and purposeful: it either answers an action or leads the eye down the page, never loops (except loaders). Tokens: `--dur-quick` 140ms (hover, press), `--dur-base` 220ms (popovers, fades), `--dur-slow` 380ms (sheets, sliding thumbs); `--ease` (expo-out) for most things, `--ease-settle` (ease-out-quint, a softer landing, no overshoot) for things that settle into place.
- **Answers to actions:** sheets slide up or grow from their row and leave faster than they came; task details unfold from their summary line; a chosen option's check pops in; ticking a task fills its bar; a missing field nudges sideways; errors and notices drop in from the top edge.
- **Reading guide:** on arrival a page settles in from just below (380ms). As you scroll, each panel and card rises into place once (a scroll-linked 24px rise), so the eye moves top to bottom with the content. Content is visible by default; browsers without scroll timelines skip it.
- Reduced motion turns all of it off.

### November rebuild (job introductions, start, pickers, loader)
- **Meet the job:** one glass panel per job with seven slides (hello, responsibilities, a day, tools, good and hard, pay, how to start). Left: a simple cartoon scene (big-headed figure, a few props) in navy, gold and ivory with a gold radial glow; right: the slide title in the editorial face and its content. Slides glide in from the side they come from; arrows, dots (the current one a gold pill), swipe and arrow keys move between them. The last slide ends with the gold "Build my 30-day plan for this job" and two quiet links.
- **Career card actions:** step 1 "Meet the job" is a solid navy row button with a gold step number; step 2 is a dashed "Skip to the plan" until the job was met, then a gold "Build my 30-day plan". The two never look alike.
- **CV start:** one large dashed drop zone (navy tile, upload icon) leads; under an "or" rule, two equal tiles: LinkedIn (brand-blue tile) and paste text. The LinkedIn link field unfolds in place, with the "Save to PDF" fallback in the hint.
- **Pickers:** the search capsule shows its focus as an inset gold ring (never clipped). Long lists show the best 80 matches (starts-with first) and say how many more; cities load per country as you type.
- **Budget:** a typed number with the currency beside it; one line says what 0 means.
- **Week calendar:** seven day tiles (Monday first); tap a day to study, then pick its own start time. On phones the days stack as rows.
- **Loader:** a small bridge draws itself while gold planks drop in and a dot walks across; a gold progress line eases toward 95%; steps get a gold check when done, a pulsing ring while active. No strikethrough.
- **Theme switch:** the thumb slides left to right while the sun turns into the moon, and the label slides the other way. Phones show the thumb only.
- **Logo:** pressing it grows the mark briefly and sweeps a light across the bridge (an overlay clipped to the arch and deck; the logo itself is unchanged).
- **First screen:** the hero fills the first screen; "See how it works" sits at its bottom and scrolls smoothly to the story; once the hero is gone, an up arrow pops in at the top and returns to the start.
- **Fine print** ("Why:" lines, link notes) is extra-small and faint. **Delete** is a small red outline button that fills red on hover.

### Course panel, study lines and Make it stick
- **Course panel** ("Your course for this month"): the main course as a row with a navy book tile, title link, provider and the provider's own length, then "This month in the course" as Week 1-4 rows (a 72px week label and the module names), an "After the 30 days" disclosure, and "Other good options" with plain tiles. A cost lozenge on each row: green "Free" or neutral "Paid"; never a price. Fine print says why these courses and when the links were checked.
- **Study line:** each week panel ends with "Study this week" and that week's module, linked to the course page.
- **Make it stick:** three steps split by hairlines, each with a stroke icon and an H3: day chips and time chips build an if-then sentence shown as a quote in a sunken box with a thin gold outline (the one gold accent in this panel), then "Add to my calendar (.ics)"; a message for one person in a sunken box with a copy button; a navy week meter. Each step closes with a one-line "Why:" and its study as a link. Buttons here are default, never primary: the next step keeps the one primary.
- **Pay on career cards:** a sunken box under the summary: a small label "Typical pay in <place>", the figure in `--type-xl` tabular, "a year" or "a month", then fine print naming the official occupation and the source link. When there is no official figure the card says so in one muted line.

### Growing Calendar (signature)
Inside the span band (`.packet` in the CSS). One row per week: a "WK n" label and a deep-navy track whose full width is the user's weekly hours, with one hairline per hour. Each task is a bar with flex-basis = its minutes ÷ weekly minutes, a 1.5px border in its kind colour, filled when done. The next bar gets a gold ring and a gold "Next" pin. Ticking a task animates its fill once (0.7s, expo-out); with reduced motion it fills instantly. Bars are buttons that jump to their task.

## Do's and Don'ts

### Do:
- **Do** show the next action before anything else on the roadmap.
- **Do** keep done tasks in place with a flat "Done" tag; nothing disappears.
- **Do** carry state by form first (outline, filled, ringed), colour second.
- **Do** label sample or AI-generated content where a visitor could mistake it.
- **Do** use the logo files from `brand/`; never redraw or retype the logo in CSS or a font.
- **Do** ask of every screen: what is the one thing it is for, and is that the most obvious thing on it?

### Don't:
- **Don't** put a small label or kicker above a heading; put the context inline or below.
- **Don't** add bridge illustrations or decorative arches; the world lives in type, palette, the logo and the calendar bars only.
- **Don't** use glass, glow or gradients outside the Liquid Glass material rules: glass for surfaces, gold glow for focus only, the gold fill on focus buttons. No decorative stripes; gridlines must measure something.
- **Don't** use gold for small text on ivory, or for anything but the logo and the next step.
- **Don't** use emoji or text glyphs as icons.
- **Don't** set two buttons of equal weight side by side; the second becomes subtle or a link.
- **Don't** animate for decoration or in a loop; every motion answers an action or guides the reading order.
- **Don't** grey out the final action; let it explain what is missing.
- **Don't** invent salaries, prices, durations or success scores to fill a panel.

### Calmer and roomier (Nov 15, judge feedback)
- **Layout:** page width 1200px (was 980), 32px side gutters on desktop, 48px between blocks, 32px between cards, body line height 1.6.
- **Career card:** title, then effort plus work modes as plain faint text ("Remote · Hybrid", no pills), summary, pay, up to three skills each, "Why it fits you", and the actions at the bottom. "Meet the job" is a solid light surface with real depth and a navy arrow circle (light grey surface with a white circle in dark mode); the plan is a quiet text row that turns solid navy once the job has been met.
- **Dark mode:** neutral graphite, Apple-like: background #0f0f10, surfaces #1c1c1e / #2c2c2e, borders #3a3a3c, text #f5f5f7 / #a1a1a6. No blue glow; the ambient light is a faint grey with a trace of gold.
- **Language:** English only.
