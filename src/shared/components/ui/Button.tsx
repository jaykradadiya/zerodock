import React from 'react';
import { cn } from './cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--zd-primary)] hover:bg-[var(--zd-primary-hover)] text-[var(--zd-primary-foreground,#FFFFFF)] border-transparent shadow-[var(--zd-shadow-sm)] hover:shadow-[var(--zd-shadow-glow)]',
  secondary:
    'bg-[var(--zd-surface)] text-[var(--zd-text-secondary)] border-[var(--zd-border)] hover:bg-[var(--zd-primary-soft)] hover:text-[var(--zd-primary)] hover:border-[var(--zd-border-glow)]',
  ghost:
    'bg-transparent text-[var(--zd-text-secondary)] border-transparent hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]',
  destructive:
    'bg-[var(--zd-surface)] text-[var(--zd-error)] border-[var(--zd-border)] hover:bg-[var(--zd-error)]/10 hover:border-[var(--zd-error)]/40',
  icon:
    'bg-transparent text-[var(--zd-text-muted)] border-transparent hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface-raised)] p-2',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className = '', children, type = 'button', ...props },
  ref
) {
  const isIcon = variant === 'icon';

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-xl border transition-[color,background-color,border-color,box-shadow,transform] duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-ring',
        !isIcon && sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
