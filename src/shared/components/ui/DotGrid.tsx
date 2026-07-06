import { cn } from './cn';

interface DotGridProps {
  className?: string;
}

export function DotGrid({ className = '' }: DotGridProps) {
  return (
    <div
      className={cn('absolute inset-0 pointer-events-none zd-dot-grid', className)}
      aria-hidden
    />
  );
}
