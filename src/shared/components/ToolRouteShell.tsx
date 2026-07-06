import { useEffect } from 'react';
import { useUIStore } from '../../core/store/useUIStore';
import { ToolRouteProvider } from '../context/ToolRouteContext';
import { ToolTipBanner } from './ToolTipBanner';
import { useGlobalToolShortcuts } from '../hooks/useToolShortcuts';

interface ToolRouteShellProps {
  toolId: string;
  children: React.ReactNode;
}

export function ToolRouteShell({ toolId, children }: ToolRouteShellProps) {
  const setZenMode = useUIStore((s) => s.setZenMode);
  const setToolActions = useUIStore((s) => s.setToolActions);

  useGlobalToolShortcuts();

  useEffect(() => {
    setZenMode(false);
    setToolActions({});
    return () => {
      setToolActions({});
    };
  }, [toolId, setZenMode, setToolActions]);

  return (
    <ToolRouteProvider toolId={toolId}>
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-[1600px] mx-auto self-stretch">
        <ToolTipBanner toolId={toolId} />
        <div className="zd-tool-fill">{children}</div>
      </div>
    </ToolRouteProvider>
  );
}
