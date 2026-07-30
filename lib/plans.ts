import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { planSchema, type Plan, type PlanDay } from './plan-schema';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'plans');

/**
 * Reads every committed plan and validates it against the schema.
 *
 * This runs at module scope so a malformed or drifted content file throws
 * during `next build` rather than rendering a broken page in production.
 * Dropping a new JSON file into content/plans/ is the only step needed to
 * register another plan — no code change.
 */
function loadPlans(): Plan[] {
  const files = readdirSync(CONTENT_DIR).filter((file) =>
    file.endsWith('.json'),
  );

  const plans = files.map((file) => {
    const source = readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const parsed = planSchema.safeParse(JSON.parse(source));

    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((issue) => `  · ${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('\n');
      throw new Error(`Invalid plan content in ${file}:\n${detail}`);
    }

    const expectedSlug = path.basename(file, '.json');
    if (parsed.data.slug !== expectedSlug) {
      throw new Error(
        `Slug mismatch in ${file}: filename implies "${expectedSlug}" but slug is "${parsed.data.slug}".`,
      );
    }

    return parsed.data;
  });

  return plans.sort((a, b) => a.title.localeCompare(b.title));
}

export const plans: readonly Plan[] = loadPlans();

export function getPlan(slug: string): Plan | undefined {
  return plans.find((plan) => plan.slug === slug);
}

/** A day counts as training when it prescribes something other than recovery. */
export function isTrainingDay(day: PlanDay): boolean {
  return day.focus.toLowerCase() !== 'recovery';
}

export function planStats(plan: Plan) {
  const trainingDays = plan.days.filter(isTrainingDay).length;
  const movements = plan.days.reduce(
    (total, day) =>
      total +
      day.sections.reduce((count, section) => count + section.exercises.length, 0),
    0,
  );

  return {
    trainingDays,
    hardDays: plan.hardDays.length,
    movements,
  };
}
