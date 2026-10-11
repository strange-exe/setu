# Design System: Setu

Governance console for BRICS+ infrastructure allocation. This file is the single source of
truth for generating or editing any Setu screen, including via Google Stitch.

**Project classification:** public-sector analytics console · audience is national and
sub-national policymakers · primary job is deciding where capital goes · desired feeling is
*instrument, not dashboard* — calm, exact, auditable.

**Taste coordinates:** Density 8 (Cockpit Dense) · Variance 4 (Offset, not artsy) ·
Motion 3 (Restrained). A tool that moves public money should feel still. High variance and
cinematic motion are deliberately rejected here; they read as flippant on this subject.

---

## 1. Visual Theme & Atmosphere

A machined instrument panel rendered in jade and slate. Surfaces sit on a strict elevation
ladder — ground, plane, raised, sunk — and depth comes from that ladder plus hairline borders,
never from gradients or glow. The atmosphere is a ministry operations room at night: dark by
default, quiet, every number legible at a glance, nothing competing for attention except the
one figure that should change a decision.

Content density is deliberately high. This is read and operated, not browsed. Whitespace is
spent on separating *groups*, not on making the page feel spacious.

## 2. Color Palette & Roles

A tinted-slate monochrome with one jade accent. Neutrals carry a green bias so they read as
part of the same system rather than as default grey.

**Dark (primary surface)**
- **Void Ground** (`#080E0D`) — app background, the plane everything sits on
- **Panel** (`#111917`) — section and card fill
- **Raised** (`#16201E`) — elevated rows, active navigation, anything that reads as touchable
- **Sunk** (`#0A1110`) — inset wells: inputs, code, the pipeline trace
- **Hairline** (`#24322F`) — structural 1px borders and separators
- **Signal Ink** (`#E7EFEC`) — primary text
- **Muted Steel** (`#A6B8B2`) — secondary text, descriptions
- **Quiet Steel** (`#7B918A`) — captions, axis labels, metadata (4.5:1 verified on Panel)
- **Jade** (`#4FC3AE`) — the single accent: primary action, active state, focus ring, key figure
- **Jade Deep** (`#3AA894`) — accent pressed state and borders on accent fills

**Light**
- **Paper** (`#EEF1F0`) · **Plane** (`#FFFFFF`) · **Sunk** (`#E4E9E7`) · **Hairline** (`#CFD8D5`)
- **Ink** (`#11201C`) · **Muted** (`#44554F`) · **Quiet** (`#5A6B65`)
- **Jade** (`#0E6E63`) — the same accent, darkened to hold contrast on light surfaces

Every light-theme value above is set by the *worst* surface it lands on, which is Sunk
(`#E4E9E7`), not white. Measured against Sunk: Quiet 4.54:1, Jade 4.99:1, Warning 5.18:1. The
earlier values (`#64766F`, `#0F766A`, `#9A5B12`) each passed on white and failed on Sunk at
3.87, 4.42 and 4.40 — an axe run over the built page is what caught all three.

**Semantic (separate from the accent, never used decoratively)**
- **Warning / Imputed** (`#E0A43B` dark · `#8A5210` light) — an imputed or uplifted value
- **Critical** (`#C9402F` dark · `#A8372B` light) — severity bands, worst-deficit units
- **Good** (`#6FBF83` dark · `#2F6B40` light) — live status, healthy state

**Demand severity ramp** (five steps, used on the globe and the intensity matrix):

| Band | Dark | Light | Text |
|---|---|---|---|
| 0 | `#3A7C8E` | `#2F6F7E` | white |
| 1 | `#8FB56A` | `#6F9150` | ink `#0B1210` |
| 2 | `#E0A43B` | `#C08A22` | ink `#0B1210` |
| 3 | `#DE7B45` | `#D2733E` | ink `#0B1210` |
| 4 | `#C9402F` | `#A8372B` | white |

Fill and text are chosen as a pair: white on the amber band measures 2.20:1. All ten
combinations clear AA. **Bands are quintiles of the cohort, never a linear min–max ramp** —
request rates are right-skewed, and a linear scale put four fifths of the matrix in band 0,
leaving the hotspot view carrying no information at all.

**Banned:** pure black `#000000`. Purple, violet, or neon-blue of any kind. Any gradient as a
surface treatment. Glow as a primary affordance. A second accent hue. Warm/cool grey drift —
every neutral comes from the green-biased scale above.

## 3. Typography Rules

Sans and mono only. This is a dashboard, so serif is banned outright.

- **Display:** `Archivo` — weights 500/600/700. Track-tight (`-0.011em`), hierarchy driven by
  weight and color step rather than size. Used for headings, wordmark, and any figure that is
  the point of its panel.
- **Body:** `Source Sans 3` — weights 400/600, line-height 1.5, measure capped near 65ch.
- **Data:** `IBM Plex Mono` — every number, identifier, code, axis label, and status chip.
  `font-variant-numeric: tabular-nums` is mandatory wherever digits stack in a column.
- **Eyebrows / status chips:** mono, 9.5–11px, uppercase, letter-spacing `0.1`–`0.16em`.

**Banned:** `Inter` (the default-looking face this system exists to avoid). All serifs —
`Times New Roman`, `Georgia`, `Garamond`, `Palatino` included — in any console screen.
Headline sizes above 32px in the console; this is an instrument, not a hero.

**Density override (active):** density is 8, so all numeric output is monospace with tabular
figures. No proportional digits in a table, a ranking row, or a readout.

## 4. Component Stylings

* **Buttons:** flat jade fill, 1px `Jade Deep` border, 1px inset top highlight, small shadow.
  Hover lifts `-1px` and deepens the shadow; active returns to `0` and inverts to an inset
  shadow, so the control reads as physically pressed. Radius 5px. No outer glow, ever.
  Secondary is the same geometry on `Raised` with a hairline border.
* **Navigation:** grouped under mono section labels (Signal / Decision / Platform). The active
  item is a *raised surface* — its own fill, border, shadow, and a 3px jade rail on the leading
  edge — not merely a tint. 18px line icons at 0.75 opacity, full opacity when active.
* **Cards:** radius 8px, `Raised` fill, hairline border, one-step shadow. Used only where
  elevation encodes hierarchy: KPI tiles, ranking rows, architecture layers. In the densest
  regions (the intensity matrix, the pipeline trace) cards are replaced by hairline dividers
  and inset wells, per the high-density rule.
* **Inputs:** label above in mono eyebrow style, inset well fill, hairline border, 2px jade
  focus ring at 20% alpha. Error text below the field. No floating labels.
* **Sliders:** native range with `accent-color`, recomputation coalesced to one frame so
  dragging never stutters.
* **Data viewport (the globe):** a bezel — deep shadow outside, 1px inner highlight — framing a
  canvas that stays dark in both themes. It is an instrument reading, not a page surface.
* **Status:** a live pulse ring on the ingest readout, 2.4s, disabled entirely under reduced
  motion. State is encoded in form (chip, rail, severity stripe) as well as in color.
* **Empty / fallback states:** the no-WebGL state names what is missing *and* points at the
  analytic table that carries the same data. Never a bare "No data".

## 5. Layout Principles

CSS Grid throughout; no `calc()` percentage math. A fixed 244px instrument rail beside a
scrolling console capped at 1280px. Spacing comes from a 4/8/12/16/24/32/44px token scale —
arbitrary values need a reason. Spacing inside a group is at least 2× tighter than spacing
between groups, so proximity does the grouping before any label is read.

Every element occupies its own spatial zone; nothing overlaps except the globe's own overlay
chrome, which is explicitly layered on a fixed z-scale (base → raise → label → panel → rail →
skip). Full-height panes use `100dvh`, never `100vh`.

**Responsive:** below 980px the rail becomes a horizontal strip, group labels and the live
readout drop out, and every multi-column region collapses to one column. Below 460px the KPI
strip goes single-column. No horizontal page scroll at any width; wide tables and charts scroll
inside their own container.

**Banned:** three equal cards in a row as a default layout. A centered hero. Any element with a
`min-width` wider than the viewport.

## 6. Motion & Interaction

Interaction feedback is 150ms, `ease-out`, and never exceeds 200ms. Only `transform`, `opacity`
and `box-shadow` are animated — never `width`, `height`, `top`, or `left`. The globe's render
loop pauses when its canvas is offscreen or the tab is hidden. The live counter and the pulse
stop under `prefers-reduced-motion`, as does the intake pipeline's staggered reveal.

Motion sequences attention; it never carries information on its own. There is no scroll-driven
choreography, no pinning, no cascade reveal on content — those belong to marketing pages and
would misrepresent what this tool is.

## 7. Anti-Patterns (Banned)

- No emojis, anywhere, in UI or source
- No `Inter`; no serif of any kind in console screens
- No pure black `#000000`
- No purple, violet, or neon-blue; no neon or outer-glow shadows
- No gradients as surface treatment; no gradient text
- No second accent hue — semantic colors are not accents
- No custom mouse cursors
- No overlapping text or elements outside the declared z-scale
- No three-equal-card feature rows; no centered hero
- No cheap meta-labels used as decoration — a number appears only where it encodes real order
- No generic placeholder names, no fake round figures, no invented citations or datasets
- No AI copywriting: "Elevate", "Seamless", "Unleash", "Next-Gen", "Streamline your workflow"
- No filler UI text: "Scroll to explore", bouncing chevrons, scroll arrows
- No circular spinners; skeletal states matching real layout dimensions instead
- No color as the only signal for state
