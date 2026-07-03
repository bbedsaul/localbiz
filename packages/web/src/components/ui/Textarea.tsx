import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { fieldClass } from './Input';

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, 'min-h-[7rem] resize-y', className)} {...rest} />;
}
