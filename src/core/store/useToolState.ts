import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ToolStoreOptions<T> {
  storageType?: 'session' | 'memory' | 'local';
  omitKeys?: (keyof T)[];
}

/**
 * Factory to generate a Zustand store for any tool state.
 * Supports:
 * - memory-only (ephemeral, zero persistence)
 * - session / local storage
 * - key omission (to avoid storing sensitive data like secrets or credentials)
 */
export function createToolStore<T extends Record<string, any>>(
  toolId: string,
  defaultState: T,
  options?: ToolStoreOptions<T>
) {
  const storeInitializer = (set: any) => ({
    ...defaultState,
    setValues: (values: Partial<T>) => set((state: any) => ({ ...state, ...values })),
    reset: () => set(defaultState),
  });

  if (options?.storageType === 'memory') {
    return create<T & { setValues: (values: Partial<T>) => void; reset: () => void }>()(
      storeInitializer
    );
  }

  const storageBackend = options?.storageType === 'local' ? localStorage : sessionStorage;

  return create<T & { setValues: (values: Partial<T>) => void; reset: () => void }>()(
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
