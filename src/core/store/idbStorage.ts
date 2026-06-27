import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';
import { useUIStore } from './useUIStore';

export const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await set(name, value);
    } catch (e: any) {
      if (e?.name === 'QuotaExceededError') {
        useUIStore.getState().showStorageWarning(
          "Browser Storage Full",
          "Your browser's IndexedDB storage is full. We cannot save any more preferences or recent tools until you clear some space.",
          ["Clear site data in your browser settings", "Delete unused files in the JSON Formatter workspace"]
        );
      } else {
        console.error('IDB setItem error:', e);
      }
    }
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};
