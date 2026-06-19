import type { WorkerMessage } from '../../../workers/base.worker';
import { parse as parseLossless, stringify as stringifyLossless } from 'lossless-json';

function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  if (obj && obj.isLosslessNumber) {
    return obj;
  }
  const sorted: Record<string, any> = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = sortObjectKeys(obj[key]);
  });
  return sorted;
}

self.onmessage = (event: MessageEvent<WorkerMessage<{ original: string; modified: string; sortKeys: boolean }>>) => {
  const { id, payload } = event.data;
  
  if (!payload) return;

  try {
    let origFormatted = payload.original;
    let modFormatted = payload.modified;

    try {
      let origObj = parseLossless(payload.original || '{}');
      let modObj = parseLossless(payload.modified || '{}');
      
      if (payload.sortKeys) {
        origObj = sortObjectKeys(origObj);
        modObj = sortObjectKeys(modObj);
      }
      origFormatted = stringifyLossless(origObj, undefined, 2) || '';
      modFormatted = stringifyLossless(modObj, undefined, 2) || '';
    } catch (e) {
      // If parsing fails, fallback to raw strings for text diffing
    }
      
    self.postMessage({ id, type: 'SUCCESS', payload: { original: origFormatted, modified: modFormatted } });
  } catch (error: any) {
    self.postMessage({ id, type: 'ERROR', payload: { message: `Invalid JSON: ${error.message}` } });
  }
};
