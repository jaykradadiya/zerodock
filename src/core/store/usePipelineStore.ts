import { create } from 'zustand';

interface PipelineState {
  payload: string | null;
  sourceToolId: string | null;
  setPipelineData: (payload: string, sourceToolId: string) => void;
  clearPipelineData: () => void;
}

export const usePipelineStore = create<PipelineState>((set) => ({
  payload: null,
  sourceToolId: null,
  setPipelineData: (payload, sourceToolId) => set({ payload, sourceToolId }),
  clearPipelineData: () => set({ payload: null, sourceToolId: null }),
}));
