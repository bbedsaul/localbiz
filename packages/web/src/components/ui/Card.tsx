import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Surface card on the paper ground. */
export function Card({
  className,
  children,
  as: Tag = 'div',
}: {
  className?: string;
  children: ReactNode;
  as?: 'div' | 'article' | 'li';
}) {
  return (
    <Tag className={cn('rounded-2xl border border-line bg-surface shadow-card', className)}>
      {children}
    </Tag>
  );
}
