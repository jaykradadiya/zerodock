import { Suspense, type ReactNode } from 'react';
import { ToolPage, ToolHeader, ToolWorkspace, ToolToolbar } from '../../shared/components/ToolLayout';
import { ToolHubTabs, type HubTab } from '../../shared/components/ToolHubTabs';
import { ToolEmbedProvider } from '../../shared/context/ToolEmbedContext';
import { useHubTab } from '../../shared/hooks/useHubTab';
import type { LucideIcon } from 'lucide-react';

interface ToolHubShellProps {
  hubRoute: string;
  tabs: HubTab[];
  initialTab?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  toolId: string;
  fullWidth?: boolean;
  renderContent: (activeTab: string) => ReactNode;
}

export function ToolHubShell({
  hubRoute,
  tabs,
  initialTab,
  icon,
  title,
  description,
  toolId,
  fullWidth = false,
  renderContent,
}: ToolHubShellProps) {
  const activeTab = useHubTab(tabs, initialTab ?? tabs[0].id);

  return (
    <ToolPage fullWidth={fullWidth}>
      <ToolHeader
        icon={icon}
        title={title}
        description={description}
        toolId={toolId}
      />
      <ToolWorkspace
        toolbar={
          <ToolToolbar>
            <ToolHubTabs tabs={tabs} activeTab={activeTab} hubRoute={hubRoute} />
          </ToolToolbar>
        }
      >
        <ToolEmbedProvider embedded>
          <Suspense fallback={null}>
            <div className="zd-tool-fill">{renderContent(activeTab)}</div>
          </Suspense>
        </ToolEmbedProvider>
      </ToolWorkspace>
    </ToolPage>
  );
}
