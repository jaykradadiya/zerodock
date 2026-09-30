import { create, type StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ToolStoreOptions<T> {
  storageType?: 'session' | 'memory' | 'local';
  omitKeys?: (keyof T)[];
}

export type ToolStoreActions<T> = {
  setValues: (values: Partial<T>) => void;
  reset: () => void;
};

/**
 * Factory to generate a Zustand store for any tool state.
 * Supports:
 * - memory-only (ephemeral, zero persistence)
 * - session / local storage
 * - key omission (to avoid storing sensitive data like secrets or credentials)
 */
export function createToolStore<T extends Record<string, unknown>>(
  toolId: string,
  defaultState: T,
  options?: ToolStoreOptions<T>
) {
  type FullState = T & ToolStoreActions<T>;

  const storeInitializer: StateCreator<FullState> = (set) => ({
    ...defaultState,
    setValues: (values: Partial<T>) => set((state) => ({ ...state, ...values })),
    reset: () => set((state) => ({ ...state, ...defaultState })),
  });

  if (options?.storageType === 'memory') {
    return create<FullState>()(storeInitializer);
  }

  const storageBackend = options?.storageType === 'local' ? localStorage : sessionStorage;

  return create<FullState>()(
    persist(storeInitializer, {
      name: `zerodock-tool-${toolId}`,
      storage: createJSONStorage(() => storageBackend),
      partialize: (state) => {
        if (!options?.omitKeys || options.omitKeys.length === 0) return state;
        const copy = { ...state };
        for (const k of options.omitKeys) {
          delete copy[k];
        }
        return copy;
      },
    })
  );
}
