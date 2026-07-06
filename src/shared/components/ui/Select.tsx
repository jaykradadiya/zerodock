import React from 'react';
import { cn } from './cn';
import { SectionLabel } from './SectionLabel';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  className?: string;
  wrapperClassName?: string;
}

export function Select({ label, className = '', wrapperClassName = '', id, children, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

  const selectEl = (
    <select
      id={selectId}
      className={cn(
        'text-sm border border-[var(--zd-border)] rounded-xl bg-[var(--zd-surface)] text-[var(--zd-text-primary)] px-3 py-2 outline-none focus:border-[var(--zd-primary)] focus:ring-2 focus:ring-[var(--zd-primary-soft)] transition-all font-semibold',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );

  if (!label) return selectEl;

  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      <SectionLabel as="label" htmlFor={selectId}>{label}</SectionLabel>
      {selectEl}
    </div>
  );
}

/** Alias for tool headers — same as Select */
export const ToolSelect = Select;
