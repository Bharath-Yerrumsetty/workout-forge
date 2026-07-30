import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHeader,
} from '@/components/ui/table';
import type { Day, WeeklyStructureRow } from '@/lib/plan-schema';
import { cn } from '@/lib/utils';

type WeeklyStructureProps = {
  rows: readonly WeeklyStructureRow[];
  hardDays: readonly Day[];
};

export function WeeklyStructure({ rows, hardDays }: WeeklyStructureProps) {
  return (
    <Table aria-labelledby="weekly-structure">
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Day</TableHead>
          <TableHead scope="col">Muscle groups</TableHead>
          <TableHead scope="col">Conditioning</TableHead>
          <TableHead scope="col">Primary goal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const isHard = hardDays.includes(row.day);

          return (
            <TableRow key={row.day} className="hover:bg-[var(--surface)]">
              <TableRowHeader className="whitespace-nowrap">
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'inline-block h-3 w-3 shrink-0',
                      isHard ? 'bg-[var(--accent)]' : 'bg-[var(--hairline)]',
                    )}
                  />
                  {/*
                    The hard-day qualifier lives inside the anchor so it becomes
                    part of the link's accessible name — otherwise a rotor/link
                    list would announce only "Monday".
                  */}
                  <a
                    href={`#${row.day.toLowerCase()}`}
                    className="underline decoration-[var(--hairline)] decoration-2 underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:decoration-[var(--accent-text)]"
                  >
                    {row.day}
                    {isHard ? (
                      <span className="sr-only"> (hard conditioning day)</span>
                    ) : null}
                  </a>
                </span>
              </TableRowHeader>
              <TableCell>{row.muscleGroups}</TableCell>
              <TableCell className="text-[var(--text-dim)]">
                {row.conditioning}
              </TableCell>
              <TableCell className="text-[var(--text-dim)]">
                {row.primaryGoal}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
