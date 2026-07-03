import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const fieldClass =
  'w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-faint focus:border-green-900 focus:outline-none focus:ring-2 focus:ring-green-900/20';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, className)} {...rest} />;
}

export { fieldClass };
