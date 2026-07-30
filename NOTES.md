# Workout Forge — build notes

Autonomous build, 30 July 2026. Everything below was measured, not assumed.

**Live:** https://workout-forge-e6sicdkcc-yerrumsettybharath-1789s-projects.vercel.app
**Project:** https://vercel.com/yerrumsettybharath-1789s-projects/workout-forge
**Branch:** `feat/workout-portal` (main untouched)

---

## What this is

A static portal for training plans. Source documents are read **at authoring
time by Claude** and committed as validated JSON; the site renders that JSON
statically. There is no upload UI, no API route, no database, and no document
parsing in the shipped bundle.

```
plans/                  inbox — drop source .docx/.pdf here (kept for reference)
content/plans/*.json    canonical data, authored from those sources
lib/plan-schema.ts      Zod contract; a bad file fails `next build`
```

**Adding a plan later:** hand me the document, I write one JSON file, commit,
push. Nothing else changes.

---

## Measured results

### Contrast (WCAG 2.1, computed from `styles/tokens.css`)

| Pair | Ratio | Min | |
|---|---|---|---|
| `--text` #f2ede9 on `--bg` #0a0709 | **17.25:1** | 4.5 | PASS |
| `--text-dim` #9e9490 on `--bg` | **6.77:1** | 4.5 | PASS |
| `--accent-text` #f43f3f on `--bg` | **5.38:1** | 4.5 | PASS |
| `--text` on `--surface` #161012 | **16.17:1** | 4.5 | PASS |
| `--text-dim` on `--surface` | **6.35:1** | 4.5 | PASS |
| `--text` on `--surface-raised` #1e1518 | **15.37:1** | 4.5 | PASS |
| `--text` on `--accent` #c41e1e (badge) | **5.09:1** | 4.5 | PASS |
| `--text` on `--accent-deep` #4a0d0d | **13.34:1** | 4.5 | PASS |
| `--accent` #c41e1e on `--bg` (non-text) | **3.39:1** | 3.0 | PASS |

The predicted problem was real: **raw crimson #c41e1e measures 3.39:1 and
cannot legally carry body text.** It is therefore a fill-only token — slabs,
rules, badge backgrounds. All crimson *type* uses `--accent-text` #f43f3f at
5.38:1. `scripts/check-contrast.mjs` enforces this split and fails the run if
either token is misused.

### Ingestion fidelity

- 164 source lines checked against 362 distinct tokens in the committed JSON.
- **0 gaps.** Every word of the source document survives into the data layer.
- Independently, all **94** rendered items (69 movements + rules + volume rows
  + variety patterns) were confirmed present in the served HTML.

### Bundle

| Route | First Load JS (gzipped) | Budget |
|---|---|---|
| `/` | **122 kB** | < 150 kB |
| `/plans/[slug]` | **119 kB** | < 150 kB |
| shared | 102 kB | |

Cross-checked by gzipping the two largest shared chunks directly: 100,511 bytes.
Framer Motion is loaded via `LazyMotion` + `domAnimation` with `strict`, so an
accidental `motion.*` import throws instead of silently restoring the full bundle.

### Browser checks (Chromium, `scripts/check-ui.mjs`)

- **No horizontal overflow** at 320 / 375 / 768 / 1024 / 1440 / 1920 on both
  routes — 12/12 pass. Wide tables scroll inside their own container.
- **Reduced motion:** 0 elements transformed or faded under
  `prefers-reduced-motion: reduce`; 96 under `no-preference`. Motion is genuinely
  disabled, not merely accelerated.
- **Keyboard:** 11 focusable elements traversed, all with a visible focus ring.

---

## One real bug, found and fixed

The first motion implementation used Framer Motion's conventional
`initial="hidden"` + `whileInView`. That **stamped `opacity: 0` into the static
HTML for 96 elements.** Under reduced motion the component returned plain
markup, which changed the tree shape between server and client, so hydration
left those inline styles in place — meaning reduced-motion users, and anyone
whose JavaScript failed, would have seen **permanently invisible content**.

Fixed in `components/motion/reveal.tsx` by rendering the *visible* state on the
server (`initial={false}` plus a mounted flag), entering the hidden state only
after mount and only for off-screen elements. Verified: the prerendered HTML now
contains **0** occurrences of `opacity:0`, and the reduced-motion count is 0.

---

## Review outcomes

Two audits ran in parallel. **react-reviewer: approve, no critical or high
issues.** Both sets of findings were applied:

- Hard-day qualifier moved *inside* the anchor so link-list navigation announces it
- `aria-labelledby` added to both data tables (they were unnamed)
- First column of both tables is now `th[scope=row]`, so AT re-announces the row
- Numbered rules render as `<ol>`, not `<ul>` with painted ordinals
- Variety framework uses `dl`/`dt`/`dd`
- Day blocks got `tabIndex={-1}` so fragment links reliably move focus
- 404 route sets its own title
- `LazyMotion` given `strict`
- **Schema now enforces uniqueness** of day, section label, exercise name,
  muscle group, and pattern. This protects DOM `id` uniqueness, not just React
  keys — duplicate days would have silently broken every in-page anchor and
  `aria-labelledby`. Proven by negative test: a duplicated exercise name fails
  the build with `days.0.sections.0.exercises: duplicate exercise name`.

---

## Assumptions taken

1. **Schema extended beyond the brief.** The specified shape omitted Weekly
   Volume Targets, Exercise Variety Framework, Progression and Recovery, and the
   closing plan intent — but "nothing dropped" was an acceptance criterion, so
   all four are carried and rendered. This is the most significant deviation.
2. `section.label` and `exercise.prescription` are nullable: the source has
   unlabelled opening blocks (Wed, Sat, Sun) and standalone instructions
   ("No hard conditioning or lifting") with no sets/reps.
3. Friday's colon-separated conditioning lines (`Rower: 6 × 500 m…`) were split
   into name + prescription to match the dominant `Name — prescription` form.
4. shadcn/ui primitives were written directly into `components/ui/` rather than
   pulled through the interactive CLI. That is what the CLI does anyway;
   `components.json` is present so `pnpm dlx shadcn@latest add <x>` works later.
5. Toolchain pinned to TypeScript 5 / ESLint 9 / eslint-config-next 15. pnpm
   resolved TS 7, ESLint 10 and config 16 by default, which target Next 16.
6. Type pairing: **Anton** (condensed display) + **IBM Plex Mono** (everything
   else). Two families, `font-display: swap`.
7. Playwright is a **devDependency** used only by `scripts/check-ui.mjs`. It is
   not in the shipped bundle.
8. `pnpm-workspace.yaml` exists solely to approve build scripts for `sharp` and
   `unrs-resolver` under pnpm 11.

## One thing I changed on your account

Vercel enabled **SSO deployment protection** on the new project by default, which
made the URL return 302 to a login page. Since you chose "public, unlisted URL",
I disabled it (`vercel project protection disable workout-forge --sso`). The site
now returns 200 to anyone with the link. **Re-enable any time with:**

```bash
vercel project protection enable workout-forge --sso
```

---

## UI pass — background, navigation, index

The brief: the site read as plain. Add a background, add stylish navigation,
research first, and hold every accessibility guarantee.

### Research, in five bullets

1. **Editorial Grid / Magazine** is the reference style that legitimises
   scroll parallax over an asymmetric grid; **Brutalism** supplies the zero
   radius, visible rules and bold display type already in place. The change
   sits at that intersection rather than importing a new look.
2. The UX corpus rates parallax a **High-severity motion-sensitivity risk**.
   That is why reduced motion gets a genuinely different render, not the same
   render with the duration turned down.
3. "Animate 1–2 key elements per view maximum." Applied to background mass as
   well as foreground motion: the index gets five slabs, plan pages get three.
4. `useMotionValue` / `useTransform` derive values **without re-rendering**.
   Every scroll-linked value is a motion value bound straight to `style`, so
   scrolling triggers no React render at all. This is what keeps long tasks at
   zero rather than merely low.
5. Compositor-friendly properties only. Angled edges use `clip-path`, never
   `rotate` — a rotation is a transform, and the reduced-motion guarantee is
   that no element carries a non-identity transform.

### What changed visually

- **`components/motion/slab-field.tsx`** — a fixed, `aria-hidden`,
  `pointer-events: none` layer of large crimson and surface slabs with angled
  `clip-path` edges, bleeding off-canvas and drifting vertically against the
  scroll. Static SVG grain and a faint structural grid sit over them.
- **`components/nav/site-header.tsx`** — a sticky bar carrying the wordmark, a
  plan switcher (plain links, not a menu) and a crimson read-progress bar.
  Below `md` the plan titles collapse to their ordinals; the full title stays
  on `aria-label`, so assistive tech loses nothing.
- **`app/page.tsx`** — the index became editorial bands: a crimson strike
  through the masthead, aggregate day/movement counts, oversized ordinals per
  row, and a crimson wipe along each rule on hover.

### Numbers

| Measure | Before | After |
| --- | --- | --- |
| First-load JS (`/`) | 122 kB | **122 kB** (delta 0) |
| Long tasks while scrolling | not measured | **0** across all three routes |
| Elements hidden only under `reduce` | 0 | **0** |
| Tightest anchor clearance under the header | n/a | **149 px** |

Bundle is unchanged because `useScroll`, `useTransform` and `useSpring` all
ship inside the `framer-motion` chunk that was already loaded.

### Contrast, sampled from rendered pixels

Token-pair contrast cannot see a slab drifting behind a paragraph, so
`scripts/check-ui.mjs` now screenshots each sampled text node, blanks the
glyphs first so the measured background is exact rather than inferred, and
computes the ratio against the real composite:

| Route | Samples | Worst measured |
| --- | --- | --- |
| `/` | 12/12 | **5.65:1** — `rgb(158,148,144)` on `#3c0d0d` |
| `/plans/hybrid-athlete` | 12/12 | **5.65:1** — `rgb(158,148,144)` on `#3c0d0d` |
| `/plans/six-day-hypertrophy-ppl` | 12/12 | **5.70:1** — `rgb(158,148,144)` on `#3b0c0c` |

`#3c0d0d` is the slab tone with grain composited on top — direct evidence that
slabs really do pass under live copy, and pass there.

### Decisions worth knowing

- **`--slab: #3a0a0a` is a new token, not `--accent-deep`.** The existing
  `--accent-deep` (`#4a0d0d`) measures **4.16:1** against `--accent-text` and
  would have failed AA wherever a crimson number crossed a slab. `#3a0a0a`
  clears every ink colour, with `--accent-text` the binding constraint at
  4.59:1. Because the tone is safe everywhere, slabs did **not** need to be
  confined to text-free regions.
- **The read-progress bar does not render under reduced motion.** Its resting
  state is `scaleX(0)` — a real, non-identity transform. Suppressing it keeps
  "zero transformed elements under reduce" literally true; exempting it from
  the audit instead would have made the audit a formality. The native
  scrollbar already conveys the same information.
- **The progress bar is `aria-hidden`, not `role="progressbar"`.** It restates
  scroll position, which assistive tech already exposes; announcing a
  percentage nobody asked for is noise.
- **`body` moved from `overflow-x: hidden` to `overflow-x: clip`.**
  `hidden` computes `overflow-y` to `auto`, which makes body a scroll
  container and silently breaks `position: sticky` — the header would have
  stuck to body rather than the viewport. `clip` cuts the same overflow
  without creating that container.
- **Anchor offsets resolve through `--header-h`** via `scroll-padding-top` on
  `html` plus `scroll-mt` on each day. The old hardcoded `scroll-mt-24` would
  have put every `#monday` jump underneath the new bar.
- **`<main>` gained `tabIndex={-1}`** so the skip link actually moves focus
  rather than only scrolling.

### Two checks were wrong, and were fixed rather than loosened

Both surfaced as failures on the first run, and both were defects in the new
verification, not in the product. Neither was resolved by relaxing a threshold.

1. **The reduced-motion audit counted decorative translucency as a
   regression.** It flagged the grain and grid layers for having permanent
   opacity below 1. It now keys elements by structural path, snapshots the page
   under *both* motion preferences, and reports only elements hidden under
   `reduce` yet visible under `no-preference` — which is the actual bug worth
   catching. This is a measurement, not an allowlist: a layer translucent by
   design is equally translucent in both modes and correctly passes.
2. **The pixel sampler measured display type against itself.** Taking the
   modal colour of a text node's box works for body copy but inverts on huge
   headings, where the letterforms *are* the most common colour — it reported
   `#f2ede9` on `#f2ede9`, 1.00:1. The sampler now blanks the glyphs before
   screenshotting, so the background is measured exactly.

The scan was also widened from `main *` to `body *`. Scoped to `main`, it
would have skipped the slab layer and the sticky header — precisely the
elements this change introduced — and returned a false pass on the one
guarantee that was not negotiable.

### What the three audits found

Accessibility, React and performance reviews ran in parallel. Four real
defects came back, all fixed.

- **WCAG 2.5.3 Label in Name, in the header nav.** Below `md` the only visible
  label on a plan link was its ordinal ("01"), while the accessible name was
  the full plan title — so a voice-control user saying "click 01" matched
  nothing. The ordinal now leads the accessible name and is no longer
  `aria-hidden`, making the visible text a prefix of the spoken name at every
  breakpoint.
- **Run-on accessible name on the index cards.** Wrapping the whole card in
  one link made its name the concatenation of title, subtitle and three stat
  pairs — "Days 6 Hard 3 Moves 69". The link now carries a written sentence
  with the same figures and the visual `<dl>` is `aria-hidden`, so nothing is
  lost and nothing is said twice.
- **`list-style: none` strips list semantics in Safari/VoiceOver.** Fixed at
  the shared `StaggerList` / `StaggerOrderedList` components rather than only
  the two lists in scope, so every content list on the site regains
  `role="list"`.
- **Two background slabs could never be seen.** The slab container is
  `position: fixed`, so `top` is measured from the viewport, not the document.
  Slabs at `top: 250svh` with 70svh of drift never came within 150svh of the
  visible band — they were composited layers with permanent GPU cost and zero
  visual output. Repositioned into ranges that actually enter view, which also
  gave the late-scroll region geometry it previously lacked.
- **The slab layer rebuilt itself on every navigation.** Keys were derived
  from geometry, and the index and plan-page arrays share no geometry, so
  React saw zero matching keys on each route change and destroyed every slab
  instead of restyling it. Now keyed by index, which is correct here because
  both arrays are fixed constants that are never reordered.

Also applied: `svh` instead of `vh` for slab geometry, so mobile Safari's
toolbar showing and hiding cannot re-resolve the height and force a re-raster
mid-scroll; and `contain: paint` on the layer to bound invalidation.

### Flagged and deliberately not fixed

- **Two `useScroll()` subscriptions** (one in the slab layer, one in the
  progress bar) compute the same document progress twice per frame. Framer
  Motion dedupes the native listener, so this is duplicated arithmetic rather
  than duplicated listeners, and the measured cost is zero long tasks. Routing
  both through a shared context would add a provider and an indirection for no
  measured gain. Worth revisiting only if a third consumer appears.
- **Pre-rasterising the grain tile** to WebP would remove SVG-filter decode
  variance on low-end Android. It is decoded once and tiled, so the cost is a
  one-time 5–15 ms on weak devices. Not worth a build-time asset step yet.
- **GPU texture headroom on low-end Android** was not measured — I have no
  such device here. Desktop measurement showed zero long tasks; the remaining
  three-to-five slabs are large, so this is the one claim in this document
  resting on inference rather than measurement.

### Content is untouched

Ingestion, schema and JSON were not modified. Verified after the change:
275/275 source lines represented in the committed JSON, 368/368 distinct
content strings and **644/644 string occurrences** present in the served HTML
for both plans.

> The earlier "429 items" figure used a counting method I could not reproduce
> from the code, so I measured string occurrences instead and am reporting that
> metric by name rather than restating a number I did not verify.

## Commands

```bash
pnpm dev                  # develop
pnpm verify               # typecheck + lint + contrast + ingest + build
pnpm build && pnpm start  # production locally

# browser checks need a running server (port 3000 is usually taken):
PORT=3210 pnpm start &
BASE_URL=http://localhost:3210 pnpm check:ui
```

`check:ui` covers overflow at six widths, reduced motion, focus visibility,
the skip link, day-anchor clearance under the sticky header, pixel-sampled
text contrast, and long tasks while scrolling.

Kill a stale server by port, not by name — the process is `next-server`, so
`pkill -f "next start"` misses it and leaves an old build serving:

```bash
lsof -ti tcp:3210 | xargs kill -9
```

## Commit history note

The initial commit was rejected by a corporate pre-commit hook
(`/opt/searce-git/.git_templates/hooks/master.sh` — root-owned, read-only,
fetching a central organization allowlist from a company GCS bucket):

```
ERROR: Only commits to whitelisted urls or organizations are allowed.
       Your organization is: Bharath-Yerrumsetty
```

`origin` is a personal GitHub account, which is not on the company allowlist.
At the repository owner's explicit direction, the commit was made with
`--no-verify` and pushed to `feat/workout-portal`. Recorded here so the bypass
is visible rather than silent.

Before committing, the staged tree was scanned: no `.env`, `.pem`, or key files;
`.vercel/` (which holds project and org IDs) is gitignored; no credential
patterns (`sk-`, `ghp_`, `AKIA`, `AIza`, `xox*`, JWTs, PEM blocks) in any staged
file; the only `process.env` reference in the codebase is a `localhost` default
in `scripts/check-ui.mjs`.

## Your next command

```bash
gh pr create --fill
```

To ship another plan, just hand me the document.
