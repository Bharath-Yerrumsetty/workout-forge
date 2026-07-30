import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn/ui table primitives, restyled onto the brutalist token system.
 * The container owns the horizontal scroll so a wide table never makes the
 * page itself scroll sideways.
 */

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto border-y-[length:var(--rule-thick)] border-[var(--text)]"
    >
      <table
        data-slot="table"
        className={cn('w-full min-w-[34rem] caption-bottom border-collapse', className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('border-b-[length:var(--rule-thin)] border-[var(--hairline)]', className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={className} {...props} />;
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b-[length:var(--rule-thin)] border-[var(--hairline)] last:border-b-0',
        'transition-colors duration-[var(--duration-fast)]',
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'label px-3 py-3 text-left align-bottom text-[var(--text-dim)] first:pl-0 last:pr-0',
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn('px-3 py-4 align-top first:pl-0 last:pr-0', className)}
      {...props}
    />
  );
}

/**
 * The identifying cell of a row. Visually identical to TableCell, but renders
 * `th[scope=row]` so assistive tech re-announces it as you move across the row.
 */
function TableRowHeader({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-row-header"
      scope="row"
      className={cn(
        'px-3 py-4 text-left align-top font-normal first:pl-0 last:pr-0',
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('label pt-4 text-left text-[var(--text-dim)]', className)}
      {...props}
    />
  );
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHeader,
};
