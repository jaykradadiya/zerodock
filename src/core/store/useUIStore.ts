import { create } from 'zustand';

export interface ContextCommand {
  id: string;
  name: string;
  description?: string;
  icon?: any;
  action: () => void;
}

interface UIState {
  sidebarOpen: boolean;
  historyDrawerOpen: boolean;
  commandPaletteOpen: boolean;
  zenMode: boolean;
  contextCommands: ContextCommand[];
  storageWarning: {
    isOpen: boolean;
    title: string;
    message: string;
    suggestions: string[];
  } | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setHistoryDrawerOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setZenMode: (open: boolean) => void;
  setContextCommands: (commands: ContextCommand[]) => void;
  showStorageWarning: (title: string, message: string, suggestions?: string[]) => void;
  closeStorageWarning: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  historyDrawerOpen: false,
  commandPaletteOpen: false,
  zenMode: false,
  contextCommands: [],
  storageWarning: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setHistoryDrawerOpen: (historyDrawerOpen) => set({ historyDrawerOpen }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setZenMode: (zenMode) => set({ zenMode }),
  setContextCommands: (contextCommands) => set({ contextCommands }),
  showStorageWarning: (title, message, suggestions = []) => set({
    storageWarning: { isOpen: true, title, message, suggestions }
  }),
  closeStorageWarning: () => set({ storageWarning: null }),
}));
