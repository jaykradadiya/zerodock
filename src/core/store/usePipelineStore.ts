import { create } from 'zustand';

export interface PipelinePayload {
  data: string;
  sourceToolId?: string;
  sourceToolName?: string;
  createdAt: number;
}

interface PipelineState {
  payload: PipelinePayload | null;
  setPipelineData: (data: string, meta?: { sourceToolId?: string; sourceToolName?: string }) => void;
  consumePipelineData: () => string | null;
  consumePipelinePayload: () => PipelinePayload | null;
  peekPipelineData: () => string | null;
  clearPipeline: () => void;
}

export const usePipelineStore = create<PipelineState>((set, get) => ({
  payload: null,
  setPipelineData: (data, meta) =>
    set({
      payload: {
        data,
        sourceToolId: meta?.sourceToolId,
        sourceToolName: meta?.sourceToolName,
        createdAt: Date.now(),
      },
    }),
  consumePipelineData: () => {
    const payload = get().payload;
    if (payload !== null) {
      set({ payload: null });
      return payload.data;
    }
    return null;
  },
  consumePipelinePayload: () => {
    const payload = get().payload;
    if (payload !== null) {
      set({ payload: null });
      return payload;
    }
    return null;
  },
  peekPipelineData: () => get().payload?.data ?? null,
  clearPipeline: () => set({ payload: null }),
}));
