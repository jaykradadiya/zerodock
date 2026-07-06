import YAML from 'yaml';

self.onmessage = (e) => {
  const { input, mode } = e.data;
  
  if (!input.trim()) {
    self.postMessage({ type: 'success', output: '' });
    return;
  }

  try {
    let result = '';
    if (mode === 'yaml2json') {
      const parsed = YAML.parse(input);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Valid YAML required (must parse to an object/array).');
      }
      result = JSON.stringify(parsed, null, 2);
    } else {
      const parsed = JSON.parse(input);
      result = YAML.stringify(parsed, { indent: 2 });
    }
    
    self.postMessage({ type: 'success', output: result });
  } catch (err: any) {
    self.postMessage({ type: 'error', error: err.message || 'Invalid format' });
  }
};
