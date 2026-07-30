#!/usr/bin/env node
/**
 * Measures WCAG 2.1 contrast for every colour pair the UI actually renders,
 * reading the values straight out of styles/tokens.css so the check can never
 * drift from the design system.
 *
 * Exit 1 if any pair falls below its required ratio.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

const TOKENS = path.join(process.cwd(), 'styles', 'tokens.css');

/** AA thresholds: 4.5 for body text, 3.0 for large text and UI components. */
const PAIRS = [
  ['--text', '--bg', 4.5, 'body text on page'],
  ['--text-dim', '--bg', 4.5, 'secondary text on page'],
  ['--accent-text', '--bg', 4.5, 'crimson text on page'],
  ['--text', '--surface', 4.5, 'body text on raised surface'],
  ['--text-dim', '--surface', 4.5, 'secondary text on raised surface'],
  ['--text', '--surface-raised', 4.5, 'body text on badge surface'],
  ['--text', '--accent', 4.5, 'text on crimson badge'],
  ['--text', '--accent-deep', 4.5, 'text on deep crimson block'],
  ['--accent', '--bg', 3.0, 'crimson slab / rule (non-text)'],
  ['--hairline', '--bg', 1.0, 'hairline rule (decorative)'],
];

function readTokens() {
  const css = readFileSync(TOKENS, 'utf8');
  const tokens = new Map();

  for (const match of css.matchAll(/(--[a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens.set(match[1], match[2]);
  }

  return tokens;
}

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);

  return (
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  );
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];

  return (light + 0.05) / (dark + 0.05);
}

const tokens = readTokens();
const failures = [];
const rows = [];

for (const [fgToken, bgToken, required, label] of PAIRS) {
  const fg = tokens.get(fgToken);
  const bg = tokens.get(bgToken);

  if (!fg || !bg) {
    failures.push(`missing token: ${!fg ? fgToken : bgToken}`);
    continue;
  }

  const ratio = contrast(fg, bg);
  const pass = ratio >= required;

  rows.push(
    `${pass ? 'PASS' : 'FAIL'}  ${ratio.toFixed(2).padStart(6)}:1  (min ${required.toFixed(1)})  ${fgToken} ${fg} on ${bgToken} ${bg}  — ${label}`,
  );

  if (!pass) {
    failures.push(
      `${fgToken} on ${bgToken} is ${ratio.toFixed(2)}:1, needs ${required}:1`,
    );
  }
}

console.log('WCAG 2.1 contrast — measured from styles/tokens.css\n');
console.log(rows.join('\n'));

if (failures.length > 0) {
  console.error(`\n${failures.length} contrast failure(s):`);
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}

console.log('\nAll pairs meet their required ratio.');
