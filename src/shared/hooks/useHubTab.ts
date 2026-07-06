import { useSearch } from '@tanstack/react-router';
import type { HubTab } from '../components/ToolHubTabs';

export function useHubTab(tabs: HubTab[], defaultTab: string) {
  const search = useSearch({ strict: false }) as { tab?: string };
  const tabIds = tabs.map((t) => t.id);
  const resolved = search.tab && tabIds.includes(search.tab) ? search.tab : defaultTab;
  return resolved;
}
