import { useNavigate } from '@tanstack/react-router';
import { cn } from './ui';

export interface HubTab {
  id: string;
  label: string;
}

interface ToolHubTabsProps {
  tabs: HubTab[];
  activeTab: string;
  hubRoute: string;
  className?: string;
}

export function ToolHubTabs({ tabs, activeTab, hubRoute, className }: ToolHubTabsProps) {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1 w-full',
        className
      )}
      role="tablist"
      aria-label="Tool modes"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => navigate({ to: hubRoute, search: { tab: tab.id } })}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors duration-150 focus-ring',
              isActive
                ? 'bg-[var(--zd-surface)] text-[var(--zd-primary)] shadow-sm border border-[var(--zd-border)]'
                : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
