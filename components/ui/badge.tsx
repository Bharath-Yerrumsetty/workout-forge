import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Crimson is semantic here: `hard` is the only variant that earns it, and it
 * is applied to the three conditioning days the plan itself calls hard.
 */
const badgeVariants = cva(
  'label inline-flex items-center gap-2 whitespace-nowrap px-2 py-1 leading-none',
  {
    variants: {
      variant: {
        default: 'bg-[var(--surface-raised)] text-[var(--text-dim)]',
        outline: 'border-[length:var(--rule-thin)] border-[var(--hairline)] text-[var(--text-dim)]',
        hard: 'bg-[var(--accent)] text-[var(--text)]',
        recovery: 'hatch border-[length:var(--rule-thin)] border-[var(--hairline)] text-[var(--text-dim)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
