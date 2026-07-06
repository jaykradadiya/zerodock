import { createContext, useContext } from 'react';

const ToolEmbedContext = createContext(false);

export function ToolEmbedProvider({
  embedded,
  children,
}: {
  embedded: boolean;
  children: React.ReactNode;
}) {
  return (
    <ToolEmbedContext.Provider value={embedded}>{children}</ToolEmbedContext.Provider>
  );
}

export function useToolEmbed() {
  return useContext(ToolEmbedContext);
}
