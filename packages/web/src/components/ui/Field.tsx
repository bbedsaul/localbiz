import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Label + control + optional hint/error. Wire htmlFor/id at the call site. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('w-full', className)}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink-soft">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-brick-700">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}
