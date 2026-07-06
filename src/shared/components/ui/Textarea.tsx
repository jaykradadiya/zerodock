import React from 'react';
import { cn } from './cn';
import { SectionLabel } from './SectionLabel';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  className?: string;
  wrapperClassName?: string;
}

export function Textarea({ label, className = '', wrapperClassName = '', id, ...props }: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

  const textareaEl = (
    <textarea
      id={textareaId}
      spellCheck={false}
      className={cn(
        'w-full bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm font-mono text-[var(--zd-text-primary)] leading-relaxed whitespace-pre placeholder:text-[var(--zd-text-muted)]',
        className
      )}
      {...props}
    />
  );

  if (!label) return textareaEl;

  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      <SectionLabel as="label" htmlFor={textareaId}>{label}</SectionLabel>
      {textareaEl}
    </div>
  );
}
