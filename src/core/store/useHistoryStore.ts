import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from './idbStorage';

export interface HistoryItem {
  id: string;
  toolId: string;
  toolName: string;
  action: string;
  preview?: string;
  timestamp: number;
  urlState?: string; // Optional query params string to restore exact state
}

interface HistoryState {
  items: HistoryItem[];
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  removeHistoryItem: (id: string) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      items: [],
      addHistoryItem: (item) =>
        set((state) => {
          const newItem: HistoryItem = {
            ...item,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
          };
          // Filter out identical consecutive actions to avoid spamming the log
          if (
            state.items.length > 0 &&
            state.items[0].toolId === newItem.toolId &&
            state.items[0].action === newItem.action &&
            state.items[0].preview === newItem.preview
          ) {
            return { items: state.items };
          }
          // Keep top 50 history items
          return {
            items: [newItem, ...state.items].slice(0, 50),
          };
        }),
      removeHistoryItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
      clearHistory: () => set({ items: [] }),
    }),
    {
      name: 'zerodock-tool-history',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
