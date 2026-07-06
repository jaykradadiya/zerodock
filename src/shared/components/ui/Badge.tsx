import React from 'react';
import { cn } from './cn';

type BadgeVariant = 'default' | 'primary' | 'accent' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[var(--zd-surface-raised)] text-[var(--zd-text-secondary)] border-[var(--zd-border)]',
  primary: 'bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] border-[var(--zd-primary)]/20',
  accent: 'bg-[var(--zd-accent-soft)] text-[var(--zd-accent)] border-[var(--zd-accent)]/20',
  outline: 'bg-transparent text-[var(--zd-text-muted)] border-[var(--zd-border)]',
};

export function Badge({ children, variant = 'primary', className = '' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wider rounded-md border',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
