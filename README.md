# Setu — citizen signal to national capital plan

A multilingual **Digital Public Good** that turns citizen development requests into a ranked,
auditable national investment order — and corrects for the citizens who never get heard.

Built for **Hack2Skill · Build with AI: Code for Communities**
→ Track 1, *AI for Digital Public Infrastructure & Governance* · BRICS Theme: **Innovation**

| | |
|---|---|
| **Live prototype** | https://abhinesh.codes/setu |
| **Deck** | [`Setu-deck.pptx`](Setu-deck.pptx) (14 slides) |
| **Licence** | AGPL-3.0 (platform) · CC-BY-4.0 (schema & taxonomy) |
| **Status** | Working prototype on a synthetic cohort. Not production. |

---

## The problem, and the trap inside it

Governments collect citizen feedback in fragments — helplines, petitions, ward meetings, a
dozen apps — and none of it reaches the spreadsheet where capital is actually allocated. That
much is in the brief.

The trap is subtler. **The obvious fix makes the problem worse.** Build a platform that ranks
districts by request volume and you build a machine that reliably funds the connected and
starves the silent, because a district with poor connectivity, low literacy and no smartphone
penetration files fewer requests *regardless of how bad its infrastructure is*. Participation is
not need. A naive feedback platform becomes a new source of inequity wearing the language of
participation.

Setu measures that gap explicitly instead of assuming it away. It is the central design
decision in this repository.

---

## What it does

**1 · Intake — 8 languages, 4 channels.**
A citizen speaks to an IVR line, types on WhatsApp, sends an SMS, or walks up to a panchayat
kiosk. Setu detects the language, translates to an English pivot, classifies sector, secondary
sector and urgency, geotags the record, strips PII, and appends it to a district ledger.
Confidence below 0.60 routes to a human review queue rather than silently entering the index.

Languages working today: **Hindi, Portuguese (BR), Russian, Mandarin, isiZulu, Arabic, Bahasa
Indonesia, English.**

**2 · Demand map.**
A live 3D globe places each sub-national unit at its true geographic centroid, extruded to its
priority score. Select a member state to fly to it — this is the per-nation policymaker lens.
Beneath it, a 16 × 8 intensity matrix of requests per 100,000 residents: a **rate**, never a raw
count, so a metro of 12 million cannot drown out a district of 900,000.

**3 · Priority engine.**

```
Priority = ( 40·Demand* + 25·Deficit + 20·Equity + 15·FundingGap ) ÷ 100

Demand*  = 0.6 · observed requests per capita
         + 0.4 · expected demand from (population × infrastructure deficit)
```

All terms min–max normalised to 0–100 across the cohort. Every weight is a slider on the
console — a government encodes its stated doctrine and the citizen reads the same numbers.
Each unit is ranked a second time by committed capital per capita; **the difference between the
two ranks is the misalignment**, and it is the number worth a cabinet conversation.

**4 · Voice gap.**
Expected demand minus observed demand, published as its own table and quadrant plot. Units in
the *silent and underserved* quadrant are where a naive ranking fails. The imputation is bounded
at 40%, carries an `imputed: true` flag on the record, shows the uplift in amber in the ranking,
and triggers an outbound IVR survey before capital is released. **It is never silent.**

**5 · Impact.**
A matched-control design: units funded in the top decile of Setu's ranking, paired against units
of similar baseline deficit, population band and sector mix that were not funded. Pairs are
fixed and published *before* allocation, which is the only thing that stops a ministry choosing
flattering controls afterwards.

---

## Running it

The prototype is a **single dependency-free HTML page** — no framework, no bundler at runtime.
Everything executes client-side. Three.js loads from cdnjs; without it the globe degrades to the
analytic table and the rest of the console is unaffected.

```bash
npm install
npm run build        # -> dist/index.html  (self-contained, open it directly)
```

Then open `dist/index.html`, or serve `dist/` with any static host.

**Build `dist/` rather than opening `index.html` directly.** The source is authored in Claude
Artifact format — no doctype and no `<head>`, because the artifact host supplies that wrapper.
Opened any other way it carries no charset declaration, so every non-ASCII character (the rupee
sign, the Devanagari and Arabic samples, en dashes) decodes as Latin-1 and renders as mojibake.
`npm run build` wraps it in a real document with `<meta charset="utf-8">`, minifies it, and
emits a Content-Security-Policy.

### Verifying it

```bash
npm test             # Playwright: desktop + mobile x light + dark, all six panels
```

The suite is the design and accessibility gate, not a smoke test. It asserts no console errors
or failed requests, no horizontal overflow, the primary action above the fold on both
viewports, **axe-core WCAG 2.2 A/AA with zero violations** on every panel in both themes,
that reduced motion stops the globe and the live counter, that a device without WebGL falls
back to the data table rather than an empty box, and that LCP stays inside budget. It also
captures grayscale and blurred screenshots so the intended reading order can be checked with
hue and detail removed.

### Repository layout

```
index.html           the prototype source — markup, tokens, scoring engine, 3D scene
build.js             production build: standalone document, minify, CSP, security headers
DESIGN.md            the design system: palette, type, components, motion, banned patterns
e2e/design.spec.ts   the design + accessibility gate
playwright.config.ts runs the suite against dist/, owns the test server
Setu-deck.pptx       pitch deck, 14 slides
dist/                build output (gitignored)
```

### Production build

`npm run build` does four things, and is honest about what it does not do:

- **Standalone document** with UTF-8 charset, viewport, and `color-scheme` metadata.
- **Minified** HTML, CSS and JS, with `console.*` and `debugger` stripped. ~11% smaller.
- **Content-Security-Policy** with `default-src 'none'`. `script-src` is hash-locked to the one
  inline block plus cdnjs, with no `'unsafe-inline'`. `style-src` *does* allow inline: CSP
  hashes never apply to `style="..."` attributes, and the globe computes element geometry at
  runtime, so those values cannot be known at build time. The residual risk is nil here, since
  the console renders no user-supplied or remote content.
- **`dist/_headers`** carries what a `<meta>` CSP cannot — `frame-ancestors`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy` — plus `Cache-Control: no-cache` on the HTML. A
  single-document build has no content-hashed assets to cache immutably.

This removes readable structure. It does not create secrecy: everything in `dist/` is readable
by any visitor. That is fine — the console holds no secrets, all figures are synthetic, and the
scoring weights are published on purpose.

---

## Architecture

| Layer | Production stack |
|---|---|
| **Channel** | Asterisk IVR · WhatsApp Business API · SMS gateway · kiosk PWA |
| **Understanding** | Whisper-large-v3 ASR · IndicTrans2 / NLLB-200 pivot translation · fine-tuned XLM-R classifier |
| **Record** | Append-only district ledger · open JSON schema · per-record provenance · PII split at ingest |
| **Fusion** | Census · national infrastructure deficit index · published capital budgets · near-duplicate clustering |
| **Decision** | Transparent weighted scoring · latent-demand correction · plan-divergence reporting |
| **Console** | React 19 + Next.js with React Three Fiber, as a PWA against the same open API |

Every model in the understanding layer is **open-weights and self-hostable**, so a ministry can
run the stack inside its own sovereign cloud. That is a DPG requirement, not a preference.

The prototype ships as one HTML file deliberately: it opens instantly from a link on any device,
with no dependency that can fail during a demo. The React console is the maintained form.

### Why the classifier is a lexicon matcher

The in-browser classifier is a multilingual lexicon matcher, not a transformer. It is weaker,
and it is honest about the deployment story: **it runs entirely offline**, which is what a
district office with no connectivity actually needs, and it can be audited line by line by the
people it governs. Production swaps a fine-tuned encoder in behind the identical interface.

---

## Digital Public Good compliance

- **Open licence** — AGPL-3.0 platform, CC-BY-4.0 schema and sector taxonomy
- **Open standards** — OpenAPI, ISO 3166-2 sub-national codes, SDG-aligned sector families
- **Platform independence** — no managed-cloud primitives; Postgres, object storage, containers
- **Do no harm by design** — PII separated at ingest, data-minimised aggregation store, published scoring weights
- **SDG relevance** — targets 6.1, 7.1, 9.1 and **16.7** (responsive, participatory decision-making)
- **Adoptable by any member state** — language packs and deficit indices are configuration, not a rewrite

## Accessibility

Treated as a DPG requirement rather than polish — a platform that non-sighted citizens and
officials cannot operate is not a public good.

- WCAG 2.2 AA contrast verified on every text token in both themes
- Full WAI-ARIA tabs pattern: labelled panels, roving tabindex, arrow / Home / End navigation
- **The 3D globe is keyboard-operable** — focusable and labelled, arrows rotate and tilt, Enter
  steps through units, and it names the data table below as its text equivalent
- `role="status"` live region announces ranking changes that are otherwise silent
- `prefers-reduced-motion` respected by the globe, the intake pipeline and the live counter
- Skip link, visible focus rings, semantic landmarks

## Performance

- Slider input is rAF-coalesced: **30 input events collapse to 1 recompute** (measured)
- Invariant cohort extents hoisted out of the scoring pass
- The WebGL loop **pauses when the canvas is offscreen or the tab is hidden** (verified)
- Device pixel ratio capped at 1 on mobile, 2 on desktop

---

## Honest status

**Working:** multilingual triage across 8 languages · sector, secondary-sector and urgency
tagging · confidence routing to human review · geotagged PII-stripped records · demand
aggregation as rates per 100k · weighted priority engine with live weights · latent-demand
correction · voice-gap reporting · plan-divergence Δ · keyboard-accessible 3D globe · six-currency
display defaulting to INR.

**Stubbed or absent:** ASR (samples are pre-transcribed) · translation (pivot strings are fixed) ·
near-duplicate clustering · live FX rates · authentication and multi-tenancy.

### About the data

**All figures are synthetic.** Populations, deficit indices, committed capital and request counts
are invented for demonstration and labelled as such in the interface.

The 16 sub-national units are **real administrative divisions** — Jhabua, Koraput, Sitapur and
Bengaluru Urban (India); Marajó, Sertão Alagoano and Guarulhos (Brazil); Tuva Republic and Sakha
Republic (Russia); Liangshan and Dingxi (China); OR Tambo and Vhembe (South Africa); Asyut
(Egypt); Afar (Ethiopia); Nusa Tenggara Timur (Indonesia) — at approximate real centroids. The
places are real; the numbers attached to them are not.

The impact curves are an **evaluation design, not observed results**. No real programme has run
through Setu.

---

## Roadmap — next 30 days

1. Wire Whisper and NLLB behind the existing interface; the contract exists, only the
   implementation is stubbed.
2. Validate the classifier against 2,000 hand-labelled real grievances, reporting **per-language
   F1 separately** — an aggregate score would hide failure in low-resource languages. Floor of
   0.75 on the weakest language before any recommendation ships.
3. Back-test the ranking against three years of completed projects: did high-scoring units
   actually show larger outcome gains?
4. Pilot with one district administration on real intake, with the voice-gap table public from
   day one.

### Known limitations

Imputation assumes deficit indices are themselves unbiased. Where a census under-counts informal
settlements, Setu inherits that error. The mitigation is ground-truthing against satellite-derived
built-up area, which this prototype does not implement.

---

## Licence

Platform: **AGPL-3.0**. Schema, sector taxonomy and documentation: **CC-BY-4.0**.
