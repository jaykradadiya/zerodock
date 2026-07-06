import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';

interface IconBoxProps {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-9 h-9 [&_svg]:w-4 [&_svg]:h-4',
  md: 'w-12 h-12 [&_svg]:w-6 [&_svg]:h-6',
  lg: 'w-14 h-14 [&_svg]:w-7 [&_svg]:h-7',
};

export function IconBox({ icon: Icon, size = 'md', className = '' }: IconBoxProps) {
  return (
    <div
      className={cn(
        'zd-icon-ring flex items-center justify-center text-[var(--zd-primary)] shrink-0',
        sizeClasses[size],
        className
      )}
    >
      <Icon />
    </div>
  );
}
