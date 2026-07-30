#!/usr/bin/env node
/**
 * Browser-verified acceptance checks.
 *
 * Dev-only. Requires a running server:
 *   PORT=3210 pnpm start   →   BASE_URL=http://localhost:3210 node scripts/check-ui.mjs
 *
 * 1. horizontal overflow across breakpoints
 * 2. reduced motion leaves nothing transformed or faded
 * 3. keyboard focus is always visible
 * 4. the skip link is first and actually lands on <main>
 * 5. every day anchor clears the sticky header
 * 6. text contrast measured from rendered pixels, not token pairs
 * 7. no long task while scrolling
 */

import { readdirSync } from 'node:fs';
import path from 'node:path';

import { chromium } from 'playwright';

import {
  contrastRatio,
  decodePng,
  modalColor,
  parseRgb,
} from './lib/png.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3210';

/** Derived from committed content so a new plan is covered automatically. */
const PLAN_PATHS = readdirSync(path.join(process.cwd(), 'content', 'plans'))
  .filter((file) => file.endsWith('.json'))
  .map((file) => `/plans/${path.basename(file, '.json')}`);

const PAGES = ['/', ...PLAN_PATHS];
const DEEPEST_PLAN = PLAN_PATHS.at(-1) ?? '/';
const WIDTHS = [320, 375, 768, 1024, 1440, 1920];

/** AA for body text. Large text would allow 3.0, but holding everything to
 *  the stricter bar removes the need to classify each sample by size. */
const MIN_CONTRAST = 4.5;
const LONG_TASK_MS = 50;
const SAMPLES_PER_PAGE = 12;

const failures = [];
const log = (line) => console.log(line);

const browser = await chromium.launch();

/* ---- 1. horizontal overflow ------------------------------------------- */
log('Horizontal overflow (document scrollWidth vs viewport)\n');

const context = await browser.newContext();
const page = await context.newPage();

for (const pagePath of PAGES) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}${pagePath}`, { waitUntil: 'networkidle' });

    const { scrollWidth, clientWidth, offenders } = await page.evaluate(() => {
      const doc = document.documentElement;
      const offenders = [];

      for (const el of document.querySelectorAll('body *')) {
        const rect = el.getBoundingClientRect();
        if (rect.right > doc.clientWidth + 1 && rect.width > 0) {
          const parent = el.closest('[data-slot="table-container"]');
          if (parent && parent !== el) continue; // scrolls in its own container
          // The slab layer is intentionally wider than the viewport; it lives
          // inside a fixed, overflow-hidden parent and cannot scroll the page.
          if (el.closest('[aria-hidden="true"].fixed')) continue;
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
      `  ${pass ? 'PASS' : 'FAIL'}  ${String(width).padStart(4)}px  ${pagePath.padEnd(26)} scrollWidth=${scrollWidth} clientWidth=${clientWidth}`,
    );

    if (!pass) {
      failures.push(
        `${pagePath} overflows by ${overflow}px at ${width}px — ${offenders.join('; ') || 'no single offender identified'}`,
      );
    }
  }
}

await context.close();

/* ---- 2. reduced motion -------------------------------------------------- */
log('\nReduced motion\n');

/**
 * Scans `body *`, not `main *`.
 *
 * The background slab layer and the sticky header both live outside <main>.
 * Scoping this to main would have skipped exactly the elements this change
 * introduced and reported a false pass on the one guarantee that is not
 * negotiable.
 *
 * Elements are keyed by structural path and compared across both motion
 * preferences, rather than simply counted under `reduce`. The bug worth
 * catching is content left hidden because its entrance animation never ran —
 * that is, hidden under `reduce` but visible under `no-preference`. A layer
 * that is translucent by design (grain, grid) is equally translucent in both
 * modes and is correctly not a finding. This distinction is made by
 * measurement, not by an allowlist.
 */
async function motionSnapshot(reducedMotion, pagePath) {
  const ctx = await browser.newContext({ reducedMotion });
  const p = await ctx.newPage();
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.goto(`${BASE}${pagePath}`, { waitUntil: 'networkidle' });
  // Let any post-mount motion upgrade actually apply before measuring.
  await p.waitForTimeout(500);

  const snapshot = await p.evaluate(() => {
    const pathOf = (el) => {
      const parts = [];
      let node = el;
      while (node && node !== document.body) {
        const parent = node.parentElement;
        if (!parent) break;
        parts.push(
          `${node.tagName}:${[...parent.children].indexOf(node)}`,
        );
        node = parent;
      }
      return parts.reverse().join('/');
    };

    const entries = {};
    for (const el of document.querySelectorAll('body *')) {
      const style = getComputedStyle(el);
      const transform = style.transform;
      entries[pathOf(el)] = {
        opacity: Number.parseFloat(style.opacity),
        transformed:
          transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)',
        transform,
        label: `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`,
      };
    }
    return entries;
  });

  await ctx.close();
  return snapshot;
}

for (const pagePath of PAGES) {
  const reduced = await motionSnapshot('reduce', pagePath);
  const normal = await motionSnapshot('no-preference', pagePath);

  const offenders = [];
  let animatedUnderNormal = 0;

  for (const state of Object.values(normal)) {
    if (state.opacity < 1 || state.transformed) animatedUnderNormal += 1;
  }

  for (const [key, state] of Object.entries(reduced)) {
    const hidden = state.opacity < 1 || state.transformed;
    if (!hidden) continue;

    const counterpart = normal[key];
    // Visible without the preference but hidden with it → motion left it behind.
    const regression =
      !counterpart ||
      counterpart.opacity > state.opacity ||
      (counterpart.transformed === false && state.transformed);

    if (regression) {
      offenders.push(
        `${state.label} opacity=${state.opacity} transform=${state.transform}`,
      );
    }
  }

  log(
    `  ${pagePath.padEnd(30)} ${offenders.length === 0 ? 'PASS' : 'FAIL'}  ${offenders.length} element(s) hidden only under reduce; ${animatedUnderNormal} animated under no-preference`,
  );

  if (offenders.length > 0) {
    failures.push(
      `${pagePath}: reduced motion leaves ${offenders.length} element(s) hidden — ${offenders.slice(0, 5).join('; ')}`,
    );
  }

  if (animatedUnderNormal === 0) {
    failures.push(
      `${pagePath}: nothing animates under no-preference — motion appears dead`,
    );
  }
}

/* ---- 3. keyboard focus visibility -------------------------------------- */
log('\nKeyboard focus\n');

const kbCtx = await browser.newContext();
const kbPage = await kbCtx.newPage();
await kbPage.setViewportSize({ width: 1440, height: 900 });
await kbPage.goto(`${BASE}${DEEPEST_PLAN}`, { waitUntil: 'networkidle' });

let checked = 0;
let invisible = 0;

for (let i = 0; i < 14; i += 1) {
  await kbPage.keyboard.press('Tab');
  const info = await kbPage.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const style = getComputedStyle(el);
    return {
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

/* ---- 4. skip link ------------------------------------------------------- */
log('\nSkip link\n');

await kbPage.goto(`${BASE}${DEEPEST_PLAN}`, { waitUntil: 'networkidle' });
await kbPage.keyboard.press('Tab');

const firstStop = await kbPage.evaluate(() => {
  const el = document.activeElement;
  return el ? { tag: el.tagName.toLowerCase(), text: el.textContent?.trim() ?? '' } : null;
});

if (firstStop?.tag !== 'a' || !/skip/i.test(firstStop.text)) {
  failures.push(
    `skip link is not the first tab stop — got ${firstStop?.tag ?? 'nothing'} "${firstStop?.text ?? ''}"`,
  );
} else {
  await kbPage.keyboard.press('Enter');
  await kbPage.waitForTimeout(300);

  const landed = await kbPage.evaluate(() => document.activeElement?.id ?? '');
  if (landed !== 'main') {
    failures.push(`skip link did not move focus to <main> — focus is on "${landed}"`);
  } else {
    log('  PASS  first tab stop is the skip link, and it moves focus to <main>');
  }
}

await kbCtx.close();

/* ---- 5. day anchors clear the sticky header ---------------------------- */
log('\nDay anchors vs sticky header\n');

const anchorCtx = await browser.newContext();
const anchorPage = await anchorCtx.newPage();
await anchorPage.setViewportSize({ width: 1440, height: 900 });

for (const planPath of PLAN_PATHS) {
  await anchorPage.goto(`${BASE}${planPath}`, { waitUntil: 'networkidle' });

  const ids = await anchorPage.evaluate(() =>
    [...document.querySelectorAll('article[id]')].map((el) => el.id),
  );

  let worst = Number.POSITIVE_INFINITY;
  let worstId = '';

  for (const id of ids) {
    await anchorPage.evaluate((target) => {
      window.location.hash = target;
    }, id);
    await anchorPage.waitForTimeout(700); // smooth scroll settle

    const gap = await anchorPage.evaluate((target) => {
      const article = document.getElementById(target);
      const heading = article?.querySelector('h3');
      const header = document.querySelector('header.sticky');
      if (!heading || !header) return null;
      return (
        heading.getBoundingClientRect().top -
        header.getBoundingClientRect().bottom
      );
    }, id);

    if (gap === null) continue;
    if (gap < worst) {
      worst = gap;
      worstId = id;
    }
  }

  const pass = worst >= 0;
  log(
    `  ${pass ? 'PASS' : 'FAIL'}  ${planPath.padEnd(26)} ${ids.length} anchors, tightest clearance ${Math.round(worst)}px (#${worstId})`,
  );

  if (!pass) {
    failures.push(
      `${planPath}: #${worstId} lands ${Math.abs(Math.round(worst))}px underneath the sticky header`,
    );
  }
}

await anchorCtx.close();

/* ---- 6. contrast against rendered pixels ------------------------------- */
log('\nText contrast — sampled from rendered pixels\n');

const pxCtx = await browser.newContext();
const pxPage = await pxCtx.newPage();
await pxPage.setViewportSize({ width: 1440, height: 900 });

for (const pagePath of PAGES) {
  await pxPage.goto(`${BASE}${pagePath}`, { waitUntil: 'networkidle' });
  await pxPage.waitForTimeout(300);

  const sampleCount = await pxPage.evaluate((limit) => {
    const candidates = [
      ...document.querySelectorAll(
        'p, li, dd, dt, h1, h2, h3, header a, main a span',
      ),
    ].filter((el) => {
      const text = el.textContent?.trim() ?? '';
      const rect = el.getBoundingClientRect();
      return (
        text.length > 6 &&
        rect.width > 24 &&
        rect.height > 8 &&
        rect.height < 400 &&
        getComputedStyle(el).visibility !== 'hidden'
      );
    });

    const step = Math.max(1, Math.floor(candidates.length / limit));
    let taken = 0;
    for (let i = 0; i < candidates.length && taken < limit; i += step) {
      candidates[i].setAttribute('data-contrast-sample', String(taken));
      taken += 1;
    }
    return taken;
  }, SAMPLES_PER_PAGE);

  let worst = Number.POSITIVE_INFINITY;
  let worstDetail = '';
  let measured = 0;

  for (let i = 0; i < sampleCount; i += 1) {
    const locator = pxPage.locator(`[data-contrast-sample="${i}"]`);

    try {
      await locator.scrollIntoViewIfNeeded({ timeout: 3000 });
      const color = await locator.evaluate((el) => getComputedStyle(el).color);
      const fg = parseRgb(color);
      if (!fg) continue;

      /*
       * Hide the glyphs, then shoot. Taking the modal colour of a box that
       * still contains text works for body copy but inverts on display type,
       * where the letterforms are the most common colour in their own box and
       * the sampler reports 1:1 against itself. Removing the ink first makes
       * the measured background exact rather than inferred.
       */
      await locator.evaluate((el) => {
        for (const node of [el, ...el.querySelectorAll('*')]) {
          node.dataset.inkStash = node.style.webkitTextFillColor ?? '';
          node.style.webkitTextFillColor = 'transparent';
        }
      });

      const shot = await locator.screenshot({ timeout: 5000 });

      await locator.evaluate((el) => {
        for (const node of [el, ...el.querySelectorAll('*')]) {
          node.style.webkitTextFillColor = node.dataset.inkStash ?? '';
          delete node.dataset.inkStash;
        }
      });

      const bg = modalColor(decodePng(shot));
      const ratio = contrastRatio(fg, bg);
      measured += 1;

      if (ratio < worst) {
        worst = ratio;
        const hex = `#${[bg.r, bg.g, bg.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
        worstDetail = `${color} on ${hex} (${Math.round(bg.share * 100)}% of box)`;
      }

      if (ratio < MIN_CONTRAST) {
        const hex = `#${[bg.r, bg.g, bg.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
        failures.push(
          `${pagePath}: sampled text ${color} renders on ${hex} at ${ratio.toFixed(2)}:1, needs ${MIN_CONTRAST}:1`,
        );
      }
    } catch {
      // A sample that cannot be scrolled to or shot is skipped rather than
      // silently counted as a pass; the measured count below shows the gap.
    }
  }

  const pass = measured > 0 && worst >= MIN_CONTRAST;
  log(
    `  ${pass ? 'PASS' : 'FAIL'}  ${pagePath.padEnd(26)} ${measured}/${sampleCount} samples measured, worst ${worst === Number.POSITIVE_INFINITY ? 'n/a' : `${worst.toFixed(2)}:1`}  ${worstDetail}`,
  );

  if (measured === 0) {
    failures.push(`${pagePath}: no text samples could be measured`);
  }
}

await pxCtx.close();

/* ---- 7. long tasks while scrolling ------------------------------------- */
log('\nScroll performance (PerformanceObserver longtask)\n');

const perfCtx = await browser.newContext();
const perfPage = await perfCtx.newPage();
await perfPage.setViewportSize({ width: 1440, height: 900 });

for (const pagePath of PAGES) {
  await perfPage.goto(`${BASE}${pagePath}`, { waitUntil: 'networkidle' });

  await perfPage.evaluate(() => {
    window.__longTasks = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__longTasks.push(entry.duration);
      }
    }).observe({ type: 'longtask', buffered: false });
  });

  // Step down the page one third-viewport at a time, yielding a frame each
  // step so the compositor and any scroll-linked work actually run.
  await perfPage.evaluate(async () => {
    const step = Math.round(window.innerHeight / 3);
    const end = document.documentElement.scrollHeight - window.innerHeight;

    for (let top = 0; top <= end; top += step) {
      window.scrollTo({ top, behavior: 'instant' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
  });

  await perfPage.waitForTimeout(200);
  const tasks = await perfPage.evaluate(() => window.__longTasks ?? []);
  const longest = tasks.length > 0 ? Math.max(...tasks) : 0;
  const pass = longest <= LONG_TASK_MS;

  log(
    `  ${pass ? 'PASS' : 'FAIL'}  ${pagePath.padEnd(26)} ${tasks.length} long task(s), longest ${longest.toFixed(1)}ms`,
  );

  if (!pass) {
    failures.push(
      `${pagePath}: scrolling produced a ${longest.toFixed(1)}ms long task, over the ${LONG_TASK_MS}ms budget`,
    );
  }
}

await perfCtx.close();
await browser.close();

/* ---- result ------------------------------------------------------------- */
if (failures.length > 0) {
  console.error(`\n${failures.length} UI failure(s):`);
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}

console.log('\nAll UI acceptance checks passed.');
