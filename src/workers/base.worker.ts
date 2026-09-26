export type WorkerMessageType = 'PROCESS' | 'SUCCESS' | 'ERROR';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface WorkerMessage<T = any> {
  type: WorkerMessageType;
  payload: T;
  id: string;
}

export interface WorkerError {
  message: string;
  line?: number;
  column?: number;
}
