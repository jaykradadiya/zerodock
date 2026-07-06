import type { WorkerMessage, WorkerError } from '../../../workers/base.worker';
import { parse as parseLossless, stringify as stringifyLossless } from 'lossless-json';

function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  // LosslessJSON parses large numbers as LosslessNumber objects
  if (obj && typeof obj === 'object' && obj.isLosslessNumber === true && 'value' in obj) {
    return obj;
  }
  const sorted: Record<string, any> = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = sortObjectKeys(obj[key]);
  });
  return sorted;
}

self.onmessage = (event: MessageEvent<WorkerMessage<{ 
  code: string; 
  action: 'format' | 'minify';
  indent?: number | 'tab';
  sortKeys?: boolean;
  smartFormat?: boolean;
}>>) => {
  const { id, payload } = event.data;
  
  if (!payload || !payload.code) {
    self.postMessage({ id, type: 'ERROR', payload: { message: 'Empty input' } });
    return;
  }

  try {
    let parsed = parseLossless(payload.code);
    
    if (payload.sortKeys) {
      parsed = sortObjectKeys(parsed);
    }

    let result = '';
    
    if (payload.action === 'minify') {
      result = stringifyLossless(parsed) || '';
    } else {
      const space = payload.indent === 'tab' ? '\t' : (payload.indent || 2);
      result = stringifyLossless(parsed, undefined, space) || '';
      
      if (payload.smartFormat) {
        // Collapse simple arrays (containing only primitives) into a single line safely without regex catastrophic backtracking
        const lines = result.split('\n');
        const formattedLines: string[] = [];
        let inSimpleArray = false;
        let currentArrayBuffer: string[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (!inSimpleArray && trimmed === '[') {
            inSimpleArray = true;
            currentArrayBuffer = [line];
          } else if (inSimpleArray) {
            currentArrayBuffer.push(line);
            if (trimmed.startsWith(']')) {
              inSimpleArray = false;
              const isOnlyPrimitives = currentArrayBuffer.slice(1, -1).every(l => {
                const t = l.trim();
                return !t.startsWith('{') && !t.startsWith('[') && !t.endsWith('{') && !t.endsWith('[');
              });
              const collapsed = currentArrayBuffer.map(l => l.trim()).join(' ').replace(/\[\s+/, '[').replace(/\s+\]$/, ']').replace(/,\s+/g, ', ');
              if (isOnlyPrimitives && collapsed.length < 80) {
                const indentStr = currentArrayBuffer[0].slice(0, currentArrayBuffer[0].indexOf('['));
                formattedLines.push(indentStr + collapsed);
              } else {
                formattedLines.push(...currentArrayBuffer);
              }
              currentArrayBuffer = [];
            } else if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              inSimpleArray = false;
              formattedLines.push(...currentArrayBuffer);
              currentArrayBuffer = [];
            }
          } else {
            formattedLines.push(line);
          }
        }
        if (currentArrayBuffer.length > 0) {
          formattedLines.push(...currentArrayBuffer);
        }
        result = formattedLines.join('\n');
      }
    }
      
    self.postMessage({ id, type: 'SUCCESS', payload: result });
  } catch (error: any) {
    const workerError: WorkerError = {
      message: error.message || 'Invalid JSON format',
    };
    
    // Attempt to extract line/col from standard JSON error strings (e.g. "Unexpected token } in JSON at position 123")
    const match = error.message.match(/at position (\d+)/);
    if (match) {
      const position = parseInt(match[1], 10);
      const lines = payload.code.substring(0, position).split('\n');
      workerError.line = lines.length;
      workerError.column = lines[lines.length - 1].length + 1;
    }
    
    self.postMessage({ id, type: 'ERROR', payload: workerError });
  }
};
