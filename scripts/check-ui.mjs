#!/usr/bin/env node
/**
 * Browser-verified acceptance checks: horizontal overflow across breakpoints,
 * reduced-motion behaviour, and keyboard focus visibility.
 *
 * Dev-only. Requires a running server:
 *   PORT=3210 pnpm start   →   BASE_URL=http://localhost:3210 node scripts/check-ui.mjs
 */

import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:3210';
const PAGES = ['/', '/plans/hybrid-athlete'];
const WIDTHS = [320, 375, 768, 1024, 1440, 1920];

const failures = [];
const log = (line) => console.log(line);

const browser = await chromium.launch();

/* ---- 1. horizontal overflow ------------------------------------------- */
log('Horizontal overflow (document scrollWidth vs viewport)\n');

const context = await browser.newContext();
const page = await context.newPage();

for (const path of PAGES) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });

    const { scrollWidth, clientWidth, offenders } = await page.evaluate(() => {
      const doc = document.documentElement;
      const offenders = [];

      for (const el of document.querySelectorAll('body *')) {
        const rect = el.getBoundingClientRect();
        if (rect.right > doc.clientWidth + 1 && rect.width > 0) {
          const parent = el.closest('[data-slot="table-container"]');
          if (parent && parent !== el) continue; // scrolls in its own container
          offenders.push(
            `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} right=${Math.round(rect.right)}`,
          );
        }
      }

      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        offenders: offenders.slice(0, 3),
      };
    });

    const overflow = scrollWidth - clientWidth;
    const pass = overflow <= 1;
    log(
      `  ${pass ? 'PASS' : 'FAIL'}  ${String(width).padStart(4)}px  ${path.padEnd(24)} scrollWidth=${scrollWidth} clientWidth=${clientWidth}`,
    );

    if (!pass) {
      failures.push(
        `${path} overflows by ${overflow}px at ${width}px — ${offenders.join('; ') || 'no single offender identified'}`,
      );
    }
  }
}

await context.close();

/* ---- 2. reduced motion -------------------------------------------------- */
log('\nReduced motion\n');

async function hiddenElementCount(reducedMotion) {
  const ctx = await browser.newContext({ reducedMotion });
  const p = await ctx.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto(`${BASE}/plans/hybrid-athlete`, { waitUntil: 'networkidle' });

  const count = await p.evaluate(() => {
    let hidden = 0;
    for (const el of document.querySelectorAll('main *')) {
      const style = getComputedStyle(el);
      const transformed =
        style.transform !== 'none' && style.transform !== 'matrix(1, 0, 0, 1, 0, 0)';
      if (Number.parseFloat(style.opacity) < 1 || transformed) hidden += 1;
    }
    return hidden;
  });

  await ctx.close();
  return count;
}

const reduced = await hiddenElementCount('reduce');
const normal = await hiddenElementCount('no-preference');

log(`  prefers-reduced-motion: reduce         → ${reduced} element(s) offset or faded`);
log(`  prefers-reduced-motion: no-preference  → ${normal} element(s) offset or faded`);

if (reduced !== 0) {
  failures.push(
    `reduced motion still animates ${reduced} element(s); expected 0 transforms and full opacity`,
  );
} else {
  log('  PASS  no transform or opacity animation applied under reduce');
}

if (normal === 0) {
  failures.push(
    'no elements animate under no-preference — motion appears to be dead entirely',
  );
} else {
  log('  PASS  motion is active when the user has not asked for less of it');
}

/* ---- 3. keyboard focus visibility -------------------------------------- */
log('\nKeyboard focus\n');

const kbCtx = await browser.newContext();
const kbPage = await kbCtx.newPage();
await kbPage.setViewportSize({ width: 1440, height: 900 });
await kbPage.goto(`${BASE}/plans/hybrid-athlete`, { waitUntil: 'networkidle' });

let checked = 0;
let invisible = 0;

for (let i = 0; i < 12; i += 1) {
  await kbPage.keyboard.press('Tab');
  const info = await kbPage.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const style = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
    };
  });

  if (!info) continue;
  checked += 1;
  const visible =
    info.outlineStyle !== 'none' && Number.parseFloat(info.outlineWidth) > 0;
  if (!visible) invisible += 1;
}

log(`  ${checked} focusable element(s) traversed, ${invisible} without a visible outline`);
if (invisible > 0) {
  failures.push(`${invisible} focusable element(s) have no visible focus indicator`);
} else {
  log('  PASS  every traversed control shows a focus ring');
}

await kbCtx.close();
await browser.close();

/* ---- result ------------------------------------------------------------- */
if (failures.length > 0) {
  console.error(`\n${failures.length} UI failure(s):`);
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}

console.log('\nAll UI acceptance checks passed.');
