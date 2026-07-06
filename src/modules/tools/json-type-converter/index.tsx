import { useState, useEffect } from 'react';
import { CodeEditor } from '../../../shared/components/CodeEditor';
import { usePipelineStore } from '../../../core/store/usePipelineStore';
import { Code2, Copy, Sparkles, Trash2, ArrowRight } from 'lucide-react';

const SAMPLE_JSON = `{
  "id": 1,
  "name": "Leanne Graham",
  "username": "Bret",
  "email": "Sincere@april.biz",
  "address": {
    "street": "Kulas Light",
    "suite": "Apt. 556",
    "city": "Gwenborough",
    "zipcode": "92998-3874",
    "geo": {
      "lat": "-37.3159",
      "lng": "81.1496"
    }
  },
  "phone": "1-770-736-8031 x56442",
  "website": "hildegard.org",
  "company": {
    "name": "Romaguera-Crona",
    "catchPhrase": "Multi-layered client-server neural-net",
    "bs": "harness real-time e-markets"
  },
  "tags": ["developer", "customer"]
}`;

function jsonToTypeScript(obj: any, name: string = 'RootObject'): string {
  const interfaces: string[] = [];
  
  function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function generateInterface(val: any, interfaceName: string): string {
    if (typeof val !== 'object' || val === null) return '';
    if (Array.isArray(val)) {
      if (val.length > 0) {
        return generateInterface(val[0], interfaceName);
      }
      return '';
    }

    let fields = '';
    for (const key in val) {
      const fieldVal = val[key];
      const type = typeof fieldVal;
      let fieldType = '';

      if (fieldVal === null) {
        fieldType = 'any';
      } else if (type === 'object') {
        if (Array.isArray(fieldVal)) {
          if (fieldVal.length > 0) {
            const firstItem = fieldVal[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              const nestedName = capitalize(key) + 'Item';
              generateInterface(firstItem, nestedName);
              fieldType = `${nestedName}[]`;
            } else {
              fieldType = `${typeof firstItem}[]`;
            }
          } else {
            fieldType = 'any[]';
          }
        } else {
          const nestedName = capitalize(key);
          generateInterface(fieldVal, nestedName);
          fieldType = nestedName;
        }
      } else {
        fieldType = type;
      }

      fields += `  ${key}: ${fieldType};\n`;
    }

    const res = `export interface ${interfaceName} {\n${fields}}`;
    if (!interfaces.includes(res)) {
      interfaces.push(res);
    }
    return interfaceName;
  }

  generateInterface(obj, name);
  return interfaces.reverse().join('\n\n');
}

function jsonToGo(obj: any, name: string = 'RootObject'): string {
  const structs: string[] = [];
  
  function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function generateStruct(val: any, structName: string): string {
    if (typeof val !== 'object' || val === null) return '';
    if (Array.isArray(val)) {
      if (val.length > 0) {
        return generateStruct(val[0], structName);
      }
      return '';
    }

    let fields = '';
    for (const key in val) {
      const fieldVal = val[key];
      const type = typeof fieldVal;
      let fieldType = '';
      const fieldKey = capitalize(key);

      if (fieldVal === null) {
        fieldType = 'interface{}';
      } else if (type === 'object') {
        if (Array.isArray(fieldVal)) {
          if (fieldVal.length > 0) {
            const firstItem = fieldVal[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              const nestedName = capitalize(key) + 'Item';
              generateStruct(firstItem, nestedName);
              fieldType = `[]${nestedName}`;
            } else {
              const goType = typeof firstItem === 'number' ? 'float64' : typeof firstItem;
              fieldType = `[]${goType}`;
            }
          } else {
            fieldType = '[]interface{}';
          }
        } else {
          const nestedName = capitalize(key);
          generateStruct(fieldVal, nestedName);
          fieldType = nestedName;
        }
      } else {
        fieldType = type === 'number' ? 'float64' : type === 'boolean' ? 'bool' : 'string';
      }

      fields += `\t${fieldKey} ${fieldType} \`json:"${key}"\`\n`;
    }

    const res = `type ${structName} struct {\n${fields}}`;
    if (!structs.includes(res)) {
      structs.push(res);
    }
    return structName;
  }

  generateStruct(obj, name);
  return structs.reverse().join('\n\n');
}

function jsonToRust(obj: any, name: string = 'RootObject'): string {
  const structs: string[] = [];
  
  function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function generateStruct(val: any, structName: string): string {
    if (typeof val !== 'object' || val === null) return '';
    if (Array.isArray(val)) {
      if (val.length > 0) {
        return generateStruct(val[0], structName);
      }
      return '';
    }

    let fields = '';
    for (const key in val) {
      const fieldVal = val[key];
      const type = typeof fieldVal;
      let fieldType = '';

      if (fieldVal === null) {
        fieldType = 'Option<serde_json::Value>';
      } else if (type === 'object') {
        if (Array.isArray(fieldVal)) {
          if (fieldVal.length > 0) {
            const firstItem = fieldVal[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              const nestedName = capitalize(key) + 'Item';
              generateStruct(firstItem, nestedName);
              fieldType = `Vec<${nestedName}>`;
            } else {
              const rustType = typeof firstItem === 'number' ? 'f64' : typeof firstItem === 'boolean' ? 'bool' : 'String';
              fieldType = `Vec<${rustType}>`;
            }
          } else {
            fieldType = 'Vec<serde_json::Value>';
          }
        } else {
          const nestedName = capitalize(key);
          generateStruct(fieldVal, nestedName);
          fieldType = nestedName;
        }
      } else {
        fieldType = type === 'number' ? 'f64' : type === 'boolean' ? 'bool' : 'String';
      }

      fields += `    #[serde(rename = "${key}")]\n    pub ${key}: ${fieldType},\n`;
    }

    const res = `#[derive(Serialize, Deserialize, Debug)]\npub struct ${structName} {\n${fields}}`;
    if (!structs.includes(res)) {
      structs.push(res);
    }
    return structName;
  }

  generateStruct(obj, name);
  return structs.reverse().join('\n\n');
}

function jsonToSchema(obj: any): string {
  function generateSchema(val: any): any {
    if (val === null) return { type: 'null' };
    const type = typeof val;
    if (type !== 'object') {
      return { type: type === 'number' ? 'number' : type === 'boolean' ? 'boolean' : 'string' };
    }
    if (Array.isArray(val)) {
      if (val.length > 0) {
        return {
          type: 'array',
          items: generateSchema(val[0])
        };
      }
      return { type: 'array', items: {} };
    }

    const properties: any = {};
    for (const key in val) {
      properties[key] = generateSchema(val[key]);
    }
    return {
      type: 'object',
      properties,
      required: Object.keys(val)
    };
  }

  const schemaObj = {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "GeneratedSchema",
    ...generateSchema(obj)
  };

  return JSON.stringify(schemaObj, null, 2);
}

export default function JsonTypeConverter() {
  const [inputText, setInputText] = useState('');
  const [targetLang, setTargetLang] = useState<'typescript' | 'go' | 'rust' | 'schema'>('typescript');
  const [outputText, setOutputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Consume transit pipelines
  useEffect(() => {
    const pipedData = usePipelineStore.getState().consumePipelineData();
    if (pipedData !== null) {
      setInputText(pipedData);
    }
  }, []);

  // Handle conversion trigger
  useEffect(() => {
    const cleanInput = inputText.trim();
    if (!cleanInput) {
      setOutputText('');
      setError(null);
      return;
    }

    try {
      const parsed = JSON.parse(cleanInput);
      setError(null);
      
      let converted = '';
      if (targetLang === 'typescript') {
        converted = jsonToTypeScript(parsed);
      } else if (targetLang === 'go') {
        converted = jsonToGo(parsed);
      } else if (targetLang === 'rust') {
        converted = jsonToRust(parsed);
      } else if (targetLang === 'schema') {
        converted = jsonToSchema(parsed);
      }
      setOutputText(converted);
    } catch (e: any) {
      setError(`Invalid JSON Input: ${e.message}`);
      setOutputText('');
    }
  }, [inputText, targetLang]);

  const loadSample = () => {
    setInputText(SAMPLE_JSON);
  };

  const clearAll = () => {
    setInputText('');
    setOutputText('');
    setError(null);
  };

  const triggerCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex-1 flex flex-col items-center p-3 sm:p-4 xl:p-8 2xl:p-10 3xl:p-12 w-full min-h-0 relative">
      
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)] shrink-0">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)]">JSON to Types Converter</h1>
            <p className="text-[var(--zd-text-secondary)] mt-1 text-sm">Convert JSON structures into TypeScript Interfaces, Go Structs, Rust Structs, or JSON Schema.</p>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2.5">
          {/* Target Language Dropdown */}
          <select 
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value as any)}
            className="text-sm border border-[var(--zd-border)] rounded-xl bg-[var(--zd-surface)] text-[var(--zd-text-primary)] px-3 py-2 outline-none focus:border-[var(--zd-primary)] focus:ring-2 focus:ring-[var(--zd-primary-soft)] transition-all font-semibold"
          >
            <option value="typescript">TypeScript Interfaces</option>
            <option value="go">Go Structs</option>
            <option value="rust">Rust Structs</option>
            <option value="schema">JSON Schema</option>
          </select>

          {/* Copy Result */}
          <button
            onClick={triggerCopy}
            disabled={!outputText}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--zd-primary)] hover:bg-[var(--zd-primary)]/90 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          >
            <Copy className="w-4 h-4" />
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>

          {/* Sample */}
          <button
            onClick={loadSample}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Sample</span>
          </button>

          {/* Clear */}
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Main Workspace split */}
      <div className="w-full flex-1 min-h-0 bg-[var(--zd-surface)] rounded-2xl border border-[var(--zd-border)] shadow-[var(--zd-shadow-md)] overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Left Side: Input JSON */}
        <div className="flex-1 flex flex-col min-w-0 border-b md:border-b-0 md:border-r border-[var(--zd-border)]">
          <div className="px-4 py-2 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] shrink-0 flex items-center justify-between text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">
            <span>JSON Input</span>
            {error && <span className="text-red-500 font-medium normal-case">{error}</span>}
          </div>
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <CodeEditor
                value={inputText}
                onChange={(val) => setInputText(val || '')}
                language="json"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Converted Output */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-2 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] shrink-0 flex items-center gap-2 text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">
            <span>Generated Code</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[var(--zd-primary)]">{targetLang === 'schema' ? 'json' : targetLang}</span>
          </div>
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <CodeEditor
                value={outputText}
                readOnly
                language={targetLang === 'go' ? 'go' : targetLang === 'rust' ? 'rust' : 'typescript'}
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
