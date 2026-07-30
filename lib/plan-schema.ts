import { z } from 'zod';

/**
 * The canonical shape of an ingested training plan.
 *
 * Source documents (PDF / DOCX / anything) are read at authoring time and
 * transcribed into JSON that satisfies this schema. Nothing parses documents
 * at runtime — the schema is the contract between ingestion and rendering,
 * and `pnpm build` fails if committed content drifts from it.
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

/**
 * `prescription` is nullable because source documents legitimately contain
 * standalone instructions ("No hard conditioning or lifting") alongside
 * conventional "movement — sets × reps" lines. Both are transcribed as-is.
 */
export const exerciseSchema = z.object({
  name: z.string().min(1),
  prescription: z.string().min(1).nullable(),
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
  conditioningFocus: z.string().min(1),
  sections: z.array(sectionSchema).min(1),
});

export const weeklyStructureRowSchema = z.object({
  day: z.enum(DAYS),
  muscleGroups: z.string().min(1),
  conditioning: z.string().min(1),
  primaryGoal: z.string().min(1),
});

export const volumeTargetSchema = z.object({
  muscleGroup: z.string().min(1),
  weeklySets: z.string().min(1),
});

export const varietyPatternSchema = z.object({
  pattern: z.string().min(1),
  rotation: z.string().min(1),
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
  goal: z.string().min(1),
  /** Sourced verbatim from the plan's own programming rules, never inferred. */
  hardDays: z.array(z.enum(DAYS)),
  weeklyStructure: z.array(weeklyStructureRowSchema).length(7),
  programmingRules: z.array(z.string().min(1)).min(1),
  days: z.array(daySchema).length(7),
  volumeTargets: z.array(volumeTargetSchema).min(1),
  varietyFramework: z.object({
    note: z.string().min(1),
    patterns: z.array(varietyPatternSchema).min(1),
  }),
  progressionRules: z.array(z.string().min(1)).min(1),
  intent: z.string().min(1),
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
    {
      path: ['days'],
      label: 'day',
      values: plan.days.map((day) => day.day),
    },
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
      path: ['varietyFramework', 'patterns'],
      label: 'pattern',
      values: plan.varietyFramework.patterns.map((entry) => entry.pattern),
    },
  ];

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
});

export type Exercise = z.infer<typeof exerciseSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type PlanDay = z.infer<typeof daySchema>;
export type WeeklyStructureRow = z.infer<typeof weeklyStructureRowSchema>;
export type VolumeTarget = z.infer<typeof volumeTargetSchema>;
export type VarietyPattern = z.infer<typeof varietyPatternSchema>;
export type Plan = z.infer<typeof planSchema>;
