import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'green' | 'brick' | 'peach' | 'neutral';

const tones: Record<Tone, string> = {
  green: 'bg-green-100 text-green-900',
  brick: 'bg-brick-100 text-brick-700',
  peach: 'bg-peach-300/30 text-charcoal-900',
  neutral: 'bg-paper-200 text-charcoal-700',
};

/** Small pill label — status, category, "coming soon". */
export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
