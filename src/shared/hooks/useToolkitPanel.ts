import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';

export const TOOLKIT_PANELS = ['tree', 'table', 'yaml', 'types', 'path'] as const;
export type ToolkitPanel = (typeof TOOLKIT_PANELS)[number];
export type SidePanel = 'hidden' | ToolkitPanel;

export function isToolkitPanel(value: string | undefined): value is ToolkitPanel {
  return TOOLKIT_PANELS.includes(value as ToolkitPanel);
}

export function useToolkitPanel(defaultPanel: SidePanel = 'hidden'): [SidePanel, (panel: SidePanel) => void] {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { panel?: string };

  const urlPanel: SidePanel =
    search.panel && isToolkitPanel(search.panel) ? search.panel : defaultPanel;

  const [sidePanel, setSidePanelState] = useState<SidePanel>(urlPanel);

  useEffect(() => {
    setSidePanelState(urlPanel);
  }, [urlPanel]);

  const setSidePanel = useCallback(
    (panel: SidePanel) => {
      setSidePanelState(panel);
      navigate({
        to: '/json-toolkit',
        search: panel === 'hidden' ? {} : { panel },
        replace: true,
      });
    },
    [navigate]
  );

  return [sidePanel, setSidePanel];
}
