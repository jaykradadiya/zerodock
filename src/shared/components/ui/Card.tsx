import React from 'react';
import { cn } from './cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  padding?: boolean;
}

export function Card({ children, className = '', glow = false, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--zd-border)] bg-[var(--zd-surface)] shadow-[var(--zd-shadow-sm)]',
        glow && 'zd-glow-border',
        padding && 'p-4',
        className
      )}
    >
      {children}
    </div>
  );
}
