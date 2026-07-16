import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const variants = cva('inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:pointer-events-none disabled:opacity-50', {
  variants: {
    variant: { primary: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300', outline: 'border border-white/15 bg-white/5 text-white hover:bg-white/10', ghost: 'text-slate-200 hover:bg-white/8 hover:text-white' },
    size: { default: 'h-10', icon: 'size-10 p-0', sm: 'h-9 px-2.5' },
  }, defaultVariants: { variant: 'outline', size: 'default' },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof variants> { asChild?: boolean }
export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(variants({ variant, size }), className)} {...props} />;
}
