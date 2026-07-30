import { StaggerItem, StaggerList } from '@/components/motion/reveal';
import type { Section } from '@/lib/plan-schema';

/**
 * Renders one titled block of work. Exercise names carry the emphasis;
 * prescriptions sit dimmed and right-aligned so a day scans as a column of
 * movements first and numbers second.
 */
export function ExerciseList({ section }: { section: Section }) {
  return (
    <div className="mt-[var(--space-block)]">
      {section.label ? (
        <h4 className="label mb-[var(--space-tight)] text-[var(--text-dim)]">
          {section.label}
        </h4>
      ) : null}

      <StaggerList className="border-t-[length:var(--rule-thin)] border-[var(--hairline)]">
        {section.exercises.map((exercise) => (
          <StaggerItem
            key={`${section.label ?? 'main'}-${exercise.name}`}
            className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-[length:var(--rule-thin)] border-[var(--hairline)] py-[var(--space-row)]"
          >
            <span className="max-w-[42ch] text-[var(--text)]">
              {exercise.name}
            </span>
            {exercise.prescription ? (
              <span className="text-[var(--text-dim)] tabular-nums">
                {exercise.prescription}
              </span>
            ) : null}
          </StaggerItem>
        ))}
      </StaggerList>
    </div>
  );
}
