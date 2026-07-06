import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorage';

interface PreferenceState {
  theme: 'light' | 'dark';
  viewMode: 'grid' | 'list';
  soundEnabled: boolean;
  recentTools: string[];
  favoriteTools: string[];
  toggleTheme: () => void;
  toggleSound: () => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  addRecentTool: (toolId: string) => void;
  toggleFavoriteTool: (toolId: string) => void;
}

export const usePreferenceStore = create<PreferenceState>()(
  persist(
    (set) => ({
      theme: 'dark',
      viewMode: 'grid',
      soundEnabled: true,
      recentTools: [],
      favoriteTools: [],
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      setViewMode: (mode) => set({ viewMode: mode }),
      addRecentTool: (toolId) => set((state) => {
        const filtered = state.recentTools.filter(id => id !== toolId);
        return { recentTools: [toolId, ...filtered].slice(0, 10) };
      }),
      toggleFavoriteTool: (toolId) => set((state) => {
        const isFavorite = state.favoriteTools.includes(toolId);
        return {
          favoriteTools: isFavorite
            ? state.favoriteTools.filter(id => id !== toolId)
            : [...state.favoriteTools, toolId]
        };
      }),
    }),
    {
      name: 'zerodock-preferences',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
