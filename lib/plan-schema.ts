import { z } from 'zod';

/**
 * The canonical shape of an ingested training plan.
 *
 * Source documents (PDF / DOCX / Markdown / anything) are read at authoring
 * time and transcribed into JSON that satisfies this schema. Nothing parses
 * documents at runtime — the schema is the contract between ingestion and
 * rendering, and `pnpm build` fails if committed content drifts from it.
 *
 * The model is deliberately generic in two places, because real plans differ
 * more than a fixed set of columns can absorb:
 *
 *   · `Metric` ({ label, value }) carries arbitrary labelled columns, so one
 *     plan can prescribe "4 × 4–6" while another prescribes sets, RIR and rest
 *     as separate columns — without either losing its own column headings.
 *   · `extraSections` carries whole document sections (execution rules,
 *     nutrition, contraindications) that only some plans have.
 */

export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export type Day = (typeof DAYS)[number];

/** A labelled value. The atom for any tabular data a source document carries. */
export const metricSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

/**
 * `prescription` is nullable because source documents legitimately contain
 * standalone instructions ("No hard conditioning or lifting") alongside
 * conventional "movement — sets × reps" lines.
 *
 * `metrics` carries any additional prescribed columns (RIR, rest, tempo).
 */
export const exerciseSchema = z.object({
  name: z.string().min(1),
  prescription: z.string().min(1).nullable(),
  metrics: z.array(metricSchema).default([]),
});

/**
 * `label` is nullable because some training days open with an unlabelled
 * block of main work before the first named section.
 */
export const sectionSchema = z.object({
  label: z.string().min(1).nullable(),
  exercises: z.array(exerciseSchema).min(1),
});

export const daySchema = z.object({
  day: z.enum(DAYS),
  focus: z.string().min(1),
  type: z.string().min(1).nullable(),
  /** Only conditioning-oriented plans carry this. */
  conditioningFocus: z.string().min(1).nullable(),
  /** Per-day commentary, e.g. "19 sets · ~65 min. Bench goes first…". */
  summary: z.string().min(1).nullable(),
  sections: z.array(sectionSchema).min(1),
});

/**
 * Columns are data rather than fixed fields so each plan keeps its own
 * headings. Every row must expose the same labels in the same order.
 */
export const weeklyStructureRowSchema = z.object({
  day: z.enum(DAYS),
  cells: z.array(metricSchema).min(1),
});

export const volumeTargetSchema = z.object({
  muscleGroup: z.string().min(1),
  weeklySets: z.string().min(1),
  /** Some plans append an assessment ("Highest-cost block"). */
  note: z.string().min(1).nullable().default(null),
});

export const varietyPatternSchema = z.object({
  pattern: z.string().min(1),
  rotation: z.string().min(1),
});

/** A whole document section that only some plans carry. */
export const extraSectionSchema = z.object({
  title: z.string().min(1),
  /** Renders as `ol` when the source numbered its items. */
  ordered: z.boolean().default(false),
  items: z.array(z.string().min(1)).min(1),
});

/**
 * Reports the first duplicate in a list of identifiers, or null when unique.
 * `null` labels are allowed at most once, since a day may open with a single
 * unlabelled block of main work.
 */
function firstDuplicate(values: readonly (string | null)[]): string | null {
  const seen = new Set<string>();

  for (const value of values) {
    const key = value ?? '<unlabelled>';
    if (seen.has(key)) return key;
    seen.add(key);
  }

  return null;
}

const basePlanSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be kebab-case'),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  goal: z.string().min(1).nullable(),
  /** Sourced verbatim from the plan's own text, never inferred. */
  hardDays: z.array(z.enum(DAYS)),
  /** The label shown against `hardDays` in the UI, e.g. "Hard" or "Heavy". */
  hardDayLabel: z.string().min(1).default('Hard'),
  weeklyStructure: z.array(weeklyStructureRowSchema).length(7),
  /** Footnotes attached to the schedule table. */
  scheduleNotes: z.array(z.string().min(1)).default([]),
  programmingRules: z.array(z.string().min(1)).default([]),
  /** Not every plan documents all seven days; rest days may exist only in the schedule. */
  days: z.array(daySchema).min(1).max(7),
  volumeTargets: z.array(volumeTargetSchema).default([]),
  varietyFramework: z
    .object({
      note: z.string().min(1),
      patterns: z.array(varietyPatternSchema).min(1),
    })
    .nullable()
    .default(null),
  progressionRules: z.array(z.string().min(1)).default([]),
  extraSections: z.array(extraSectionSchema).default([]),
  intent: z.string().min(1).nullable(),
});

/**
 * Uniqueness is enforced here rather than left to chance because the rendered
 * page derives DOM ids and React keys from this data. A content file with two
 * `Monday` entries would otherwise build cleanly and emit duplicate element
 * ids, silently breaking the in-page anchors and every `aria-labelledby` that
 * points at them.
 */
export const planSchema = basePlanSchema.superRefine((plan, ctx) => {
  const collections: {
    path: (string | number)[];
    label: string;
    values: readonly (string | null)[];
  }[] = [
    { path: ['days'], label: 'day', values: plan.days.map((d) => d.day) },
    {
      path: ['weeklyStructure'],
      label: 'day',
      values: plan.weeklyStructure.map((row) => row.day),
    },
    {
      path: ['volumeTargets'],
      label: 'muscle group',
      values: plan.volumeTargets.map((target) => target.muscleGroup),
    },
    {
      path: ['extraSections'],
      label: 'section title',
      values: plan.extraSections.map((section) => section.title),
    },
  ];

  if (plan.varietyFramework) {
    collections.push({
      path: ['varietyFramework', 'patterns'],
      label: 'pattern',
      values: plan.varietyFramework.patterns.map((entry) => entry.pattern),
    });
  }

  plan.days.forEach((day, dayIndex) => {
    collections.push({
      path: ['days', dayIndex, 'sections'],
      label: 'section label',
      values: day.sections.map((section) => section.label),
    });

    day.sections.forEach((section, sectionIndex) => {
      collections.push({
        path: ['days', dayIndex, 'sections', sectionIndex, 'exercises'],
        label: 'exercise name',
        values: section.exercises.map((exercise) => exercise.name),
      });
    });
  });

  for (const collection of collections) {
    const duplicate = firstDuplicate(collection.values);
    if (duplicate !== null) {
      ctx.addIssue({
        code: 'custom',
        path: collection.path,
        message: `duplicate ${collection.label}: "${duplicate}"`,
      });
    }
  }

  // Every schedule row must expose the same columns, or the table would render
  // values under the wrong headings.
  const [firstRow, ...restRows] = plan.weeklyStructure;
  if (firstRow) {
    const expected = firstRow.cells.map((cell) => cell.label).join('|');
    restRows.forEach((row, index) => {
      const actual = row.cells.map((cell) => cell.label).join('|');
      if (actual !== expected) {
        ctx.addIssue({
          code: 'custom',
          path: ['weeklyStructure', index + 1, 'cells'],
          message: `schedule columns must match row 0 ("${expected}"), got "${actual}"`,
        });
      }
    });
  }

  // hardDays must reference days the plan actually schedules.
  const scheduled = new Set(plan.weeklyStructure.map((row) => row.day));
  for (const day of plan.hardDays) {
    if (!scheduled.has(day)) {
      ctx.addIssue({
        code: 'custom',
        path: ['hardDays'],
        message: `"${day}" is marked hard but is not in the weekly structure`,
      });
    }
  }
});

export type Metric = z.infer<typeof metricSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type PlanDay = z.infer<typeof daySchema>;
export type WeeklyStructureRow = z.infer<typeof weeklyStructureRowSchema>;
export type VolumeTarget = z.infer<typeof volumeTargetSchema>;
export type VarietyPattern = z.infer<typeof varietyPatternSchema>;
export type ExtraSection = z.infer<typeof extraSectionSchema>;
export type Plan = z.infer<typeof planSchema>;
