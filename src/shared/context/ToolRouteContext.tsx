import { createContext, useContext } from 'react';
import { toolRegistry } from '../../core/registry/tools';
import { getToolSample } from '../data/toolSamples';
import { getPipelineTargets } from '../data/pipelineTargets';

interface ToolRouteContextValue {
  toolId: string;
  supportsShare: boolean;
  getSample: () => string | undefined;
  pipelineTargets: { id: string; name: string; route: string }[];
}

const ToolRouteContext = createContext<ToolRouteContextValue | null>(null);

export function ToolRouteProvider({
  toolId,
  children,
}: {
  toolId: string;
  children: React.ReactNode;
}) {
  return (
    <ToolRouteContext.Provider
      value={{
        toolId,
        supportsShare: toolRegistry.find((t) => t.id === toolId)?.metadata.supportsShare ?? false,
        getSample: () => getToolSample(toolId),
        pipelineTargets: getPipelineTargets(toolId),
      }}
    >
      {children}
    </ToolRouteContext.Provider>
  );
}

export function useToolRoute() {
  return useContext(ToolRouteContext);
}
