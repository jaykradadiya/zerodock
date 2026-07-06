import React from 'react';
import { cn } from './cn';
import { SectionLabel } from './SectionLabel';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  className?: string;
  wrapperClassName?: string;
}

export function Input({ label, className = '', wrapperClassName = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  const inputEl = (
    <input
      id={inputId}
      className={cn(
        'w-full bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-xl px-3 py-2 text-sm text-[var(--zd-text-primary)] outline-none focus:border-[var(--zd-primary)] focus:ring-2 focus:ring-[var(--zd-primary-soft)] transition-all font-mono',
        className
      )}
      {...props}
    />
  );

  if (!label) return inputEl;

  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      <SectionLabel as="label" htmlFor={inputId}>{label}</SectionLabel>
      {inputEl}
    </div>
  );
}
