import Ajv from 'ajv';
import type { WorkerMessage } from '../../../workers/base.worker';

const ajv = new Ajv({ allErrors: true });

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
}

self.onmessage = (event: MessageEvent<WorkerMessage<{ document: string; schema: string }>>) => {
  const { id, payload } = event.data;
  
  if (!payload || !payload.document || !payload.schema) {
    self.postMessage({ id, type: 'ERROR', payload: { message: 'Empty input' } });
    return;
  }

  try {
    const schemaObj = JSON.parse(payload.schema);
    const docObj = JSON.parse(payload.document);
    
    let validate;
    try {
      validate = ajv.compile(schemaObj);
    } catch (err: any) {
      self.postMessage({ id, type: 'ERROR', payload: { message: `Invalid Schema: ${err.message}` } });
      return;
    }

    const valid = validate(docObj);
    if (valid) {
      self.postMessage({ id, type: 'SUCCESS', payload: [] }); // Empty array means valid
    } else {
      const errors: ValidationError[] = (validate.errors || []).map(err => ({
        path: err.instancePath || '/',
        message: err.message || 'Validation error',
        keyword: err.keyword,
      }));
      self.postMessage({ id, type: 'SUCCESS', payload: errors });
    }
  } catch (error: any) {
    self.postMessage({ id, type: 'ERROR', payload: { message: `Parse Error: ${error.message}` } });
  }
};
