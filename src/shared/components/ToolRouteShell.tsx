import { useEffect } from 'react';
import { useUIStore } from '../../core/store/useUIStore';
import { ToolRouteProvider } from '../context/ToolRouteContext';
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
      <div className="flex flex-col flex-1 min-h-0 w-full self-stretch px-0 sm:px-1 md:px-1.5">
        <div className="zd-tool-fill min-h-0">{children}</div>
      </div>
    </ToolRouteProvider>
  );
}
