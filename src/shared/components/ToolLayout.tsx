import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useUIStore } from '../../core/store/useUIStore';
import { cn } from './ui';
import { MobileSwapBar } from './MobileSwapBar';

interface ToolPageProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
  compact?: boolean;
}

export function ToolPage({
  children,
  className = '',
  fullWidth = false,
  compact = false,
}: ToolPageProps) {
  const zenMode = useUIStore((s) => s.zenMode);
  const isCompact = compact || zenMode;
  const padding = isCompact ? 'p-1.5 sm:p-2.5' : 'p-3 sm:p-4 md:p-6 xl:p-8';
  const maxWidth = fullWidth ? 'h-full flex-1 flex flex-col min-h-0' : 'max-w-7xl 2xl:max-w-[1440px] mx-auto h-full flex-1 flex flex-col min-h-0';

  return (
    <div
      id="main-content"
      className={cn('zd-tool-fill relative h-full flex-1 min-h-0', padding, maxWidth, className)}
    >
      {children}
    </div>
  );
}

interface ToolHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  toolId?: string;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
  className?: string;
  showStandardActions?: boolean;
  compact?: boolean;
}

export function ToolHeader(_props: ToolHeaderProps) {
  return null;
}

interface ToolWorkspaceProps {
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function ToolWorkspace({ children, toolbar, className = '', compact = false }: ToolWorkspaceProps) {
  const zenMode = useUIStore((s) => s.zenMode);
  const isCompact = compact || zenMode;

  return (
    <div
      className={cn(
        'w-full flex flex-col flex-1 min-h-0 zd-workspace zd-panel-min-h',
        isCompact ? 'rounded-lg' : 'rounded-xl',
        className
      )}
    >
      {toolbar}
      <div className="zd-tool-fill overflow-hidden">{children}</div>
    </div>
  );
}

interface ToolEmbedFrameProps {
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Wraps hub-embedded tool content so panels stretch to the workspace bottom */
export function ToolEmbedFrame({ toolbar, children, className }: ToolEmbedFrameProps) {
  return (
    <div className={cn('zd-tool-fill', className)}>
      {toolbar}
      <div className="zd-tool-fill min-w-0">{children}</div>
    </div>
  );
}

interface ToolToolbarProps {
  children: React.ReactNode;
  className?: string;
  center?: boolean;
}

export function ToolToolbar({ children, className = '', center = false }: ToolToolbarProps) {
  return (
    <div
      className={cn(
        'px-3 sm:px-4 py-2.5 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shrink-0 flex items-center gap-2 sm:gap-3 flex-wrap',
        center ? 'justify-center' : 'justify-between',
        className
      )}
    >
      {children}
    </div>
  );
}

interface ModeToggleGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function ModeToggleGroup({ children, className = '' }: ModeToggleGroupProps) {
  return (
    <div className={cn('flex items-center gap-0.5 bg-[var(--zd-surface)] border border-[var(--zd-border)] p-0.5 rounded-lg', className)}>
      {children}
    </div>
  );
}

interface ModeToggleProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export function ModeToggle({ active, onClick, children, className = '' }: ModeToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 focus-ring',
        active
          ? 'bg-[var(--zd-surface-raised)] text-[var(--zd-primary)] shadow-sm'
          : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]',
        className
      )}
    >
      {children}
    </button>
  );
}

export { ToolSelect } from './ui';

interface SplitPanelsProps {
  children: React.ReactNode;
  className?: string;
  mobileSwap?: {
    onSwap: () => void;
    onFocusInput?: () => void;
    onFocusOutput?: () => void;
    activePanel?: 'input' | 'output';
  };
}

export function SplitPanels({ children, className = '', mobileSwap }: SplitPanelsProps) {
  return (
    <div className={cn('zd-tool-fill relative', className)}>
      {mobileSwap && (
        <MobileSwapBar
          onSwap={mobileSwap.onSwap}
          onFocusInput={mobileSwap.onFocusInput}
          onFocusOutput={mobileSwap.onFocusOutput}
          activePanel={mobileSwap.activePanel}
        />
      )}
      <div className="flex flex-col md:flex-row zd-tool-fill md:items-stretch">{children}</div>
    </div>
  );
}

interface SwapButtonProps {
  onClick: () => void;
  title?: string;
  className?: string;
}

export function SwapButton({ onClick, title = 'Swap input and output', className = '' }: SwapButtonProps) {
  return (
    <>
      <div className={cn('hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none', className)}>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClick}
          title={title}
          aria-label={title}
          className="!rounded-full !p-2 pointer-events-auto"
          style={{ pointerEvents: 'auto' }}
        >
          <ArrowRightLeft className="w-4 h-4" />
        </Button>
      </div>
      <div className="hidden">
        <MobileSwapBar onSwap={onClick} swapLabel="Swap panels" />
      </div>
    </>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <IconBox icon={icon} size="lg" className="!rounded-full mb-4" />
      <h3 className="text-[var(--zd-text-primary)] font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-[var(--zd-text-muted)] text-sm max-w-[280px] mb-6 leading-relaxed">{description}</p>
      )}
      {action}
    </div>
  );
}

export { MobileSwapBar } from './MobileSwapBar';
