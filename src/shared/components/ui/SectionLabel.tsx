import React from 'react';
import { cn } from './cn';

interface SectionLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  className?: string;
  as?: 'span' | 'label';
}

export function SectionLabel({ children, className = '', as: Tag = 'span', ...props }: SectionLabelProps) {
  return (
    <Tag className={cn('zd-mono-label', className)} {...props}>
      {children}
    </Tag>
  );
}
