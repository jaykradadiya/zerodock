import { cn } from './cn';

interface GlowOrbProps {
  className?: string;
  color?: 'primary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-[280px] h-[280px] blur-[60px]',
  md: 'w-[420px] h-[420px] blur-[80px]',
  lg: 'w-[560px] h-[560px] blur-[90px]',
};

export function GlowOrb({ className = '', color = 'primary', size = 'md' }: GlowOrbProps) {
  const gradient =
    color === 'accent'
      ? 'bg-[radial-gradient(circle,var(--zd-accent)_0%,transparent_70%)]'
      : 'bg-[radial-gradient(circle,var(--zd-primary)_0%,transparent_70%)]';

  return (
    <div
      className={cn('absolute rounded-full pointer-events-none', gradient, sizeClasses[size], className)}
      aria-hidden
    />
  );
}
