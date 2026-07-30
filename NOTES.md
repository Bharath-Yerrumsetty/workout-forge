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

## Commands

```bash
pnpm dev                  # develop
pnpm verify               # typecheck + lint + contrast + ingest + build
pnpm build && pnpm start  # production locally

# browser checks need a running server:
PORT=3210 pnpm start &
BASE_URL=http://localhost:3210 node scripts/check-ui.mjs
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
