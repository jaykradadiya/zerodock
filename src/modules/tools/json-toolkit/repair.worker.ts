import { jsonrepair } from 'jsonrepair';
import type { WorkerMessage, WorkerError } from '../../../workers/base.worker';

self.onmessage = (event: MessageEvent<WorkerMessage<{ code: string }>>) => {
  const { id, payload } = event.data;
  
  if (!payload || !payload.code) {
    self.postMessage({ id, type: 'ERROR', payload: { message: 'Empty input' } });
    return;
  }

  try {
    const repaired = jsonrepair(payload.code);
    self.postMessage({ id, type: 'SUCCESS', payload: repaired });
  } catch (error: unknown) {
    const workerError: WorkerError = {
      message: error instanceof Error ? error.message : 'Could not auto-repair JSON',
    };
    self.postMessage({ id, type: 'ERROR', payload: workerError });
  }
};
