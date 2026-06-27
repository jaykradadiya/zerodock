import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  storageWarning: {
    isOpen: boolean;
    title: string;
    message: string;
    suggestions: string[];
  } | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  showStorageWarning: (title: string, message: string, suggestions?: string[]) => void;
  closeStorageWarning: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  commandPaletteOpen: false,
  storageWarning: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  showStorageWarning: (title, message, suggestions = []) => set({
    storageWarning: { isOpen: true, title, message, suggestions }
  }),
  closeStorageWarning: () => set({ storageWarning: null }),
}));
