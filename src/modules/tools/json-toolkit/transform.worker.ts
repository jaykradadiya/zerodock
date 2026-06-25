import type { WorkerMessage } from '../../../workers/base.worker';
import jmespath from 'jmespath';

type TransformPayload = {
  document: string;
  query: string;
  type: 'jmespath' | 'javascript';
};

self.onmessage = (event: MessageEvent<WorkerMessage<TransformPayload>>) => {
  const { id, payload } = event.data;
  if (!payload) return;

  try {
    const data = JSON.parse(payload.document);
    let result: any;

    if (payload.type === 'jmespath') {
      result = jmespath.search(data, payload.query);
    } else if (payload.type === 'javascript') {
      // Create a sandbox-like function
      // The user code should return the new object, e.g. `return data.map(x => x.id)`
      const fn = new Function('data', payload.query);
      result = fn(data);
    }

    if (result === undefined) {
      throw new Error('Query returned undefined');
    }

    self.postMessage({ 
      id, 
      type: 'SUCCESS', 
      payload: JSON.stringify(result, null, 2) 
    });
  } catch (error: any) {
    self.postMessage({ 
      id, 
      type: 'ERROR', 
      payload: { message: error.message } 
    });
  }
};
