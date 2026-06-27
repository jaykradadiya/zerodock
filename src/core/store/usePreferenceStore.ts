import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorage';

interface PreferenceState {
  theme: 'light' | 'dark';
  recentTools: string[];
  toggleTheme: () => void;
  addRecentTool: (toolId: string) => void;
}

export const usePreferenceStore = create<PreferenceState>()(
  persist(
    (set) => ({
      theme: 'dark',
      recentTools: [],
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      addRecentTool: (toolId) => set((state) => {
        const filtered = state.recentTools.filter(id => id !== toolId);
        return { recentTools: [toolId, ...filtered].slice(0, 10) };
      }),
    }),
    {
      name: 'zerodock-preferences',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
