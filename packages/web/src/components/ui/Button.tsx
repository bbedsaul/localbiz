import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50 disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<Variant, string> = {
  // Brick is the CTA color (Section 0 brand doc); green is structural.
  primary: 'bg-brick-600 text-paper-50 hover:bg-brick-700 focus-visible:ring-brick-600',
  secondary: 'bg-green-900 text-paper-50 hover:bg-green-800 focus-visible:ring-green-900',
  outline:
    'border border-green-900/25 bg-transparent text-green-900 hover:bg-green-900/[0.06] focus-visible:ring-green-900',
  ghost: 'text-charcoal-700 hover:bg-paper-100 focus-visible:ring-green-900',
};

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-3 text-base',
  lg: 'px-6 py-3.5 text-lg',
};

export function buttonClass(opts: { variant?: Variant; size?: Size; className?: string } = {}) {
  const { variant = 'primary', size = 'md', className } = opts;
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** When set, renders a Next <Link> styled as a button. */
  href?: string;
  children: ReactNode;
};

export function Button({ variant, size, href, className, children, ...rest }: ButtonProps) {
  const classes = buttonClass({ variant, size, className });
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
