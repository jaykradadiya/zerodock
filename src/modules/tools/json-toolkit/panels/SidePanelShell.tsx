import { X } from 'lucide-react';
import { Button, SectionLabel, cn } from '../../../../shared/components/ui';

interface SidePanelShellProps {
  title: string;
  onClose: () => void;
  badge?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SidePanelShell({ title, onClose, badge, toolbar, children, className }: SidePanelShellProps) {
  return (
    <div
      className={cn(
        'zd-tool-fill border-t md:border-t-0 md:border-l border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/20',
        className
      )}
    >
      <div className="px-4 py-2.5 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)] shrink-0 flex items-center gap-2 min-h-[42px]">
        <SectionLabel className="truncate">{title}</SectionLabel>
        {badge}
        <div className="flex-1 min-w-0">{toolbar}</div>
        <Button variant="ghost" size="sm" onClick={onClose} title="Close panel" aria-label="Close panel">
          <X className="w-4 h-4" />
        </Button>
      </div>
      <div className="zd-tool-fill overflow-hidden">{children}</div>
    </div>
  );
}
