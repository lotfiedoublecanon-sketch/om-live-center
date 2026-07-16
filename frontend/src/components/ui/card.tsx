import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) { return <section className={cn('surface', className)} {...props} />; }
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('surface-header', className)} {...props} />; }
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('surface-content', className)} {...props} />; }
