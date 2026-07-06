import { DotGrid } from './DotGrid';
import { GlowOrb } from './GlowOrb';
import { cn } from './cn';

interface BackgroundShellProps {
  children: React.ReactNode;
  className?: string;
  /** Landing only — tool pages should skip BackgroundShell for speed */
  showOrbs?: boolean;
  showGrid?: boolean;
}

export function BackgroundShell({
  children,
  className = '',
  showOrbs = true,
  showGrid = true,
}: BackgroundShellProps) {
  return (
    <div className={cn('relative flex-1 flex flex-col min-h-0', className)}>
      {showGrid && <DotGrid />}
      {showOrbs && (
        <>
          <GlowOrb className="top-[8%] left-1/2 -translate-x-1/2 opacity-[0.06]" color="primary" size="md" />
          <GlowOrb className="bottom-[5%] right-[8%] opacity-[0.05]" color="accent" size="sm" />
        </>
      )}
      <div className="relative z-10 flex-1 flex flex-col min-h-0">{children}</div>
    </div>
  );
}
