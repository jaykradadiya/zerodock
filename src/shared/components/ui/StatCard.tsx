import type { ReactNode } from 'react';
import { CopyButton } from '../CopyButton';
import { Card } from './Card';
import { SectionLabel } from './SectionLabel';
import { cn } from './cn';

interface StatCardProps {
  label: string;
  value: string;
  copyable?: boolean;
  className?: string;
  children?: ReactNode;
}

export function StatCard({ label, value, copyable = false, className = '', children }: StatCardProps) {
  return (
    <Card className={cn('flex flex-col gap-2', className)} glow>
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>{label}</SectionLabel>
        {copyable && value && <CopyButton value={value} />}
      </div>
      <p className="text-lg sm:text-xl font-mono font-semibold text-[var(--zd-text-primary)] break-all">
        {value || '—'}
      </p>
      {children}
    </Card>
  );
}
