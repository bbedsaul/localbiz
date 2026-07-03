import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'paper' | 'panel' | 'green';

const tones: Record<Tone, string> = {
  paper: 'bg-paper-50 text-ink',
  panel: 'bg-paper-100 text-ink',
  green: 'bg-green-900 text-paper-50',
};

/** Full-bleed vertical section shell with a tone. Pair with <Container>. */
export function Section({
  tone = 'paper',
  className,
  children,
  id,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cn('py-16 sm:py-24', tones[tone], className)}>
      {children}
    </section>
  );
}
