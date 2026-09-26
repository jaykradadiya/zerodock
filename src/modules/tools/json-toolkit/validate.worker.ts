import Ajv from 'ajv';
import type { WorkerMessage } from '../../../workers/base.worker';
import { buildJsonPathMap, locateError } from './lib/jsonPathLocation';

const ajv = new Ajv({ allErrors: true, strict: false, strictSchema: false });

const formats: Record<string, RegExp> = {
  'date-time': /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/,
  'date': /^\d{4}-\d{2}-\d{2}$/,
  'time': /^\d{2}:\d{2}:\d{2}(?:\.\d+)?$/,
  'email': /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  'uri': /^(?:[a-z0-9+-.]+):\/\/[^\s]*$/i,
  'uuid': /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  'ipv4': /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  'ipv6': /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/
};

Object.entries(formats).forEach(([name, regex]) => {
  ajv.addFormat(name, regex);
});

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
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
      let pathMap: Map<string, any>;
      try {
        pathMap = buildJsonPathMap(payload.document);
      } catch {
        pathMap = new Map();
      }

      const errors: ValidationError[] = (validate.errors || []).map(err => {
        const missingProp = err.params?.missingProperty as string | undefined;
        const loc = locateError(pathMap, err.instancePath || '/', missingProp);

        let formattedMessage = err.message || 'Validation error';
        if (err.keyword === 'required' && missingProp) {
          formattedMessage = `Missing required property '${missingProp}'`;
        } else if (err.keyword === 'additionalProperties' && err.params?.additionalProperty) {
          formattedMessage = `Unexpected property '${err.params.additionalProperty}'`;
        }

        return {
          path: err.instancePath || '/',
          message: formattedMessage,
          keyword: err.keyword,
          line: loc.startLineNumber,
          column: loc.startColumn,
          endLine: loc.endLineNumber,
          endColumn: loc.endColumn,
        };
      });

      self.postMessage({ id, type: 'SUCCESS', payload: errors });
    }
  } catch (error: any) {
    let line = 1;
    let column = 1;
    const match = error.message?.match(/line (\d+) column (\d+)/i) || error.message?.match(/position (\d+)/i);
    if (match) {
      if (match[2]) {
        line = parseInt(match[1], 10);
        column = parseInt(match[2], 10);
      } else {
        const pos = parseInt(match[1], 10);
        const lines = payload.document.slice(0, pos).split('\n');
        line = lines.length;
        column = lines[lines.length - 1].length + 1;
      }
    }

    self.postMessage({
      id,
      type: 'ERROR',
      payload: {
        message: `Parse Error: ${error.message}`,
        line,
        column,
      }
    });
  }
};
