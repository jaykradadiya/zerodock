import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GlobalState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  storageWarning: {
    isOpen: boolean;
    title: string;
    message: string;
    suggestions: string[];
  } | null;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  showStorageWarning: (title: string, message: string, suggestions?: string[]) => void;
  closeStorageWarning: () => void;
}

export const useGlobalStore = create<GlobalState>()(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarOpen: true,
      commandPaletteOpen: false,
      storageWarning: null,
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      showStorageWarning: (title, message, suggestions = []) => set({
        storageWarning: { isOpen: true, title, message, suggestions }
      }),
      closeStorageWarning: () => set({ storageWarning: null }),
    }),
    {
      name: 'zerodock-global-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
