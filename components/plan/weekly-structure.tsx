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
  hardDayLabel: string;
  /** Days that have their own detailed block to jump to. */
  linkedDays: readonly Day[];
};

/**
 * Columns come from the data, so each plan keeps the headings its source
 * document used rather than being forced into a fixed set.
 */
export function WeeklyStructure({
  rows,
  hardDays,
  hardDayLabel,
  linkedDays,
}: WeeklyStructureProps) {
  const columns = rows[0]?.cells.map((cell) => cell.label) ?? [];

  return (
    <Table aria-labelledby="weekly-structure">
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Day</TableHead>
          {columns.map((column) => (
            <TableHead key={column} scope="col">
              {column}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const isHard = hardDays.includes(row.day);
          const isLinked = linkedDays.includes(row.day);
          const qualifier = isHard ? (
            <span className="sr-only"> ({hardDayLabel.toLowerCase()} day)</span>
          ) : null;

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
                    The qualifier lives inside the anchor so it becomes part of
                    the link's accessible name — otherwise a rotor/link list
                    would announce only "Monday".
                  */}
                  {isLinked ? (
                    <a
                      href={`#${row.day.toLowerCase()}`}
                      className="underline decoration-[var(--hairline)] decoration-2 underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:decoration-[var(--accent-text)]"
                    >
                      {row.day}
                      {qualifier}
                    </a>
                  ) : (
                    <span>
                      {row.day}
                      {qualifier}
                    </span>
                  )}
                </span>
              </TableRowHeader>

              {row.cells.map((cell, index) => (
                <TableCell
                  key={cell.label}
                  className={index === 0 ? undefined : 'text-[var(--text-dim)]'}
                >
                  {cell.value}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
