import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// We create a factory to generate a store for any tool state
export function createToolStore<T>(toolId: string, defaultState: T) {
  return create<T & { setValues: (values: Partial<T>) => void }>()(
    persist(
      (set) => ({
        ...defaultState,
        setValues: (values) => set((state) => ({ ...state, ...values })),
      }),
      {
        name: `zerodock-tool-${toolId}`,
        storage: createJSONStorage(() => sessionStorage),
      }
    )
  );
}
