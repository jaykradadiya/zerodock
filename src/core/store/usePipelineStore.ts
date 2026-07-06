import { create } from 'zustand';

interface PipelineState {
  pipelineData: string | null;
  setPipelineData: (data: string) => void;
  consumePipelineData: () => string | null;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  pipelineData: null,
  setPipelineData: (data) => set({ pipelineData: data }),
  consumePipelineData: () => {
    const data = get().pipelineData;
    if (data !== null) {
      set({ pipelineData: null });
    }
    return data;
  },
}));
