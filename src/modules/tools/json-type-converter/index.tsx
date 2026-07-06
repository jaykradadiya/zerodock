import { useState, useEffect } from 'react';
import { Code2 } from 'lucide-react';
import { CodePanel } from '../../../shared/components/CodePanel';
import { ToolPage, ToolHeader, ToolWorkspace, SplitPanels, ToolSelect, ToolToolbar, ToolEmbedFrame } from '../../../shared/components/ToolLayout';
import { useToolEmbed } from '../../../shared/context/ToolEmbedContext';
import { usePipelineStore } from '../../../core/store/usePipelineStore';
import { useConverterShortcuts } from '../../../shared/hooks/useConverterShortcuts';
import { createToolStore } from '../../../core/store/useToolState';
import { useSyncToolUrl } from '../../../shared/hooks/useSyncToolUrl';

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

const LANG_LABELS: Record<string, string> = {
  typescript: 'TypeScript',
  go: 'Go',
  rust: 'Rust',
  schema: 'JSON Schema',
};

const useJsonTypeStore = createToolStore('json-type-converter', {
  inputText: '',
  targetLang: 'typescript' as 'typescript' | 'go' | 'rust' | 'schema',
});

export default function JsonTypeConverter() {
  const { inputText, targetLang, setValues } = useJsonTypeStore();
  const setInputText = (val: string) => setValues({ inputText: val });
  const setTargetLang = (val: 'typescript' | 'go' | 'rust' | 'schema') => setValues({ targetLang: val });

  useSyncToolUrl(() => useJsonTypeStore.getState(), setValues, [inputText, targetLang]);

  const [outputText, setOutputText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pipedData = usePipelineStore.getState().consumePipelineData();
    if (pipedData !== null) {
      setValues({ inputText: pipedData });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const editorLang = targetLang === 'go' ? 'go' : targetLang === 'rust' ? 'rust' : targetLang === 'schema' ? 'json' : 'typescript';

  useConverterShortcuts({
    onClear: () => { setInputText(''); setOutputText(''); setError(null); },
    output: outputText,
  });

  const embedded = useToolEmbed();

  const langSelect = (
    <ToolSelect
      value={targetLang}
      onChange={(e) => setTargetLang(e.target.value as 'typescript' | 'go' | 'rust' | 'schema')}
    >
      <option value="typescript">TypeScript Interfaces</option>
      <option value="go">Go Structs</option>
      <option value="rust">Rust Structs</option>
      <option value="schema">JSON Schema</option>
    </ToolSelect>
  );

  const toolToolbar = embedded ? (
    <ToolToolbar>{langSelect}</ToolToolbar>
  ) : null;

  const panels = (
    <SplitPanels>
      <CodePanel
        title="JSON Input"
        language="json"
        value={inputText}
        onChange={(val) => setInputText(val || '')}
        onSample={() => setInputText(SAMPLE_JSON)}
        onClear={() => { setInputText(''); setOutputText(''); setError(null); }}
        error={error}
        borderRight
      />
      <CodePanel
        title="Generated Code"
        badge={LANG_LABELS[targetLang]}
        language={editorLang}
        value={outputText}
        readOnly
        downloadFileName={`types.${targetLang === 'schema' ? 'json' : targetLang}`}
      />
    </SplitPanels>
  );

  if (embedded) {
    return (
      <ToolEmbedFrame toolbar={toolToolbar}>
        {panels}
      </ToolEmbedFrame>
    );
  }

  return (
    <ToolPage fullWidth>
      <ToolHeader
        icon={Code2}
        title="JSON to Types Converter"
        description="Convert JSON structures into TypeScript Interfaces, Go Structs, Rust Structs, or JSON Schema."
        actions={langSelect}
      />
      <ToolWorkspace>{panels}</ToolWorkspace>
    </ToolPage>
  );
}
