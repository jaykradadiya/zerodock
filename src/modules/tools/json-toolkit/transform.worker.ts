import type { WorkerMessage } from '../../../workers/base.worker';
import { evaluateQuery, type FilterType } from './lib/queryEngine';

type TransformPayload = {
  document: string;
  query: string;
  type: FilterType;
};

self.onmessage = (event: MessageEvent<WorkerMessage<TransformPayload>>) => {
  const { id, payload } = event.data;
  if (!payload) return;

  try {
    const data = JSON.parse(payload.document);
    const queryRes = evaluateQuery(data, payload.query, payload.type);

    if (!queryRes.success) {
      throw new Error(queryRes.error || 'Evaluation failed');
    }

    if (queryRes.result === undefined) {
      throw new Error('Query returned undefined');
    }

    self.postMessage({
      id,
      type: 'SUCCESS',
      payload: JSON.stringify(queryRes.result, null, 2),
    });
  } catch (error: any) {
    self.postMessage({
      id,
      type: 'ERROR',
      payload: { message: error.message },
    });
  }
};
