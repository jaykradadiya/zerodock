import React from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { toolRegistry } from '../../core/registry/tools';
import { useUIStore } from '../../core/store/useUIStore';
import { useToolRoute } from '../context/ToolRouteContext';
import { cn, IconBox } from './ui';
import { ToolStandardActions } from './ToolStandardActions';
import { PrivacyBadge } from './PrivacyBadge';

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
  const padding = isCompact ? 'p-0 sm:p-1 md:p-1.5' : 'p-3 sm:p-4 md:p-6 xl:p-8';
  const maxWidth = fullWidth ? 'h-full flex-1 flex flex-col min-h-0' : 'max-w-7xl 2xl:max-w-[1440px] mx-auto h-full flex-1 flex flex-col min-h-0';

  return (
    <div
      id="main-content"
      className={cn('zd-tool-fill relative h-full flex-1 min-h-0 scroll-mt-14', padding, maxWidth, className)}
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

export function ToolHeader({
  icon,
  title,
  description,
  toolId,
  actions,
  badges,
  className = '',
  showStandardActions = false,
  compact = false,
}: ToolHeaderProps) {
  const zenMode = useUIStore((s) => s.zenMode);
  const routeContext = useToolRoute();
  const resolvedToolId = toolId ?? routeContext?.toolId;
  if (zenMode) return null;

  // Compact: actions-only strip — navbar already shows the tool name
  if (compact) {
    return (
      <div className={cn('w-full flex items-center justify-end gap-2 mb-1.5 shrink-0', className)}>
        {badges}
        {showStandardActions && <ToolStandardActions />}
        {actions}
      </div>
    );
  }

  const tool = resolvedToolId ? toolRegistry.find((t) => t.id === resolvedToolId) : undefined;
  const category = tool?.category;

  return (
    <div className={cn('w-full flex flex-col gap-3 mb-4 sm:mb-5 shrink-0', className)}>
      {resolvedToolId && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--zd-text-muted)]">
          <Link to="/" className="hover:text-[var(--zd-primary)] transition-colors no-underline">
            Home
          </Link>
          {category && (
            <>
              <ChevronRight className="w-3 h-3 shrink-0" aria-hidden />
              <span>{category}</span>
            </>
          )}
          <ChevronRight className="w-3 h-3 shrink-0" aria-hidden />
          <span className="text-[var(--zd-text-secondary)] font-medium truncate">{title}</span>
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <IconBox icon={icon} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--zd-text-primary)] tracking-tight">{title}</h1>
              {tool && <PrivacyBadge processing={tool.metadata.processing} />}
              {badges}
            </div>
            {description && (
              <p className="text-[var(--zd-text-secondary)] mt-0.5 text-sm leading-relaxed max-w-2xl">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {showStandardActions && <ToolStandardActions />}
          {actions}
        </div>
      </div>
    </div>
  );
}

interface ToolWorkspaceProps {
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function ToolWorkspace({ children, toolbar, footer, className = '', compact = false }: ToolWorkspaceProps) {
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
      {footer}
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
export { MobileSwapBar } from './MobileSwapBar';
export { PrivacyBadge } from './PrivacyBadge';
