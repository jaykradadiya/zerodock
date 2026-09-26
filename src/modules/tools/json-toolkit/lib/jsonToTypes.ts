function sanitizeTypeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, '_');
  if (/^[0-9]/.test(cleaned)) return '_' + cleaned;
  return cleaned || 'Type';
}

function toPascalCase(str: string): string {
  const sanitized = sanitizeTypeName(str);
  return sanitized
    .split('_')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join('') || 'Type';
}

function toSnakeCase(str: string): string {
  const sanitized = sanitizeTypeName(str);
  let snake = sanitized
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase();
  if (/^[0-9]/.test(snake)) snake = '_' + snake;

  const rustKeywords = new Set([
    'as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern', 'false',
    'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut',
    'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct', 'super', 'trait',
    'true', 'type', 'unsafe', 'use', 'where', 'while', 'async', 'await', 'dyn',
    'abstract', 'become', 'box', 'do', 'final', 'macro', 'override', 'priv',
    'typeof', 'unsized', 'virtual', 'yield',
  ]);

  if (rustKeywords.has(snake)) {
    return 'r#' + snake;
  }
  return snake || 'field';
}

function isValidTSIdentifier(key: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
}

function formatTSKey(key: string): string {
  return isValidTSIdentifier(key) ? key : JSON.stringify(key);
}

export function jsonToTypeScript(obj: unknown, name = 'RootObject'): string {
  const interfaces: string[] = [];
  const rootName = toPascalCase(name);

  if (obj === null) {
    return `export type ${rootName} = any;`;
  }
  if (typeof obj !== 'object') {
    return `export type ${rootName} = ${typeof obj};`;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return `export type ${rootName} = any[];`;
    const firstItem = obj[0];
    if (typeof firstItem !== 'object' || firstItem === null) {
      return `export type ${rootName} = ${typeof firstItem}[];`;
    }
  }

  function generateInterface(val: unknown, rawInterfaceName: string): string {
    const interfaceName = toPascalCase(rawInterfaceName);
    if (typeof val !== 'object' || val === null) return '';
    if (Array.isArray(val)) {
      if (val.length > 0) return generateInterface(val[0], interfaceName);
      return '';
    }

    let fields = '';
    const keys = Object.keys(val as Record<string, unknown>);
    for (const key of keys) {
      const fieldVal = (val as Record<string, unknown>)[key];
      const type = typeof fieldVal;
      let fieldType = '';

      if (fieldVal === null) {
        fieldType = 'any';
      } else if (type === 'object') {
        if (Array.isArray(fieldVal)) {
          if (fieldVal.length > 0) {
            const firstItem = fieldVal[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              const nestedName = toPascalCase(key) + 'Item';
              generateInterface(firstItem, nestedName);
              fieldType = `${nestedName}[]`;
            } else {
              fieldType = `${typeof firstItem}[]`;
            }
          } else {
            fieldType = 'any[]';
          }
        } else {
          const nestedName = toPascalCase(key);
          generateInterface(fieldVal, nestedName);
          fieldType = nestedName;
        }
      } else {
        fieldType = type;
      }

      fields += `  ${formatTSKey(key)}: ${fieldType};\n`;
    }

    const res = `export interface ${interfaceName} {\n${fields}}`;
    if (!interfaces.includes(res)) interfaces.push(res);
    return interfaceName;
  }

  generateInterface(obj, rootName);
  return interfaces.reverse().join('\n\n');
}

export function jsonToGo(obj: unknown, name = 'RootObject'): string {
  const structs: string[] = [];
  const rootName = toPascalCase(name);

  if (obj === null) {
    return `type ${rootName} interface{}`;
  }
  if (typeof obj !== 'object') {
    const goType = typeof obj === 'number' ? 'float64' : typeof obj === 'boolean' ? 'bool' : 'string';
    return `type ${rootName} ${goType}`;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return `type ${rootName} []interface{}`;
    const firstItem = obj[0];
    if (typeof firstItem !== 'object' || firstItem === null) {
      const goType = typeof firstItem === 'number' ? 'float64' : typeof firstItem === 'boolean' ? 'bool' : 'string';
      return `type ${rootName} []${goType}`;
    }
  }

  function generateStruct(val: unknown, rawStructName: string): string {
    const structName = toPascalCase(rawStructName);
    if (typeof val !== 'object' || val === null) return '';
    if (Array.isArray(val)) {
      if (val.length > 0) return generateStruct(val[0], structName);
      return '';
    }

    let fields = '';
    const keys = Object.keys(val as Record<string, unknown>);
    for (const key of keys) {
      const fieldVal = (val as Record<string, unknown>)[key];
      const type = typeof fieldVal;
      let fieldType = '';
      const fieldKey = toPascalCase(key);

      if (fieldVal === null) {
        fieldType = 'interface{}';
      } else if (type === 'object') {
        if (Array.isArray(fieldVal)) {
          if (fieldVal.length > 0) {
            const firstItem = fieldVal[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              const nestedName = toPascalCase(key) + 'Item';
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
          const nestedName = toPascalCase(key);
          generateStruct(fieldVal, nestedName);
          fieldType = nestedName;
        }
      } else {
        fieldType = type === 'number' ? 'float64' : type === 'boolean' ? 'bool' : 'string';
      }

      fields += `\t${fieldKey} ${fieldType} \`json:"${key}"\`\n`;
    }

    const res = `type ${structName} struct {\n${fields}}`;
    if (!structs.includes(res)) structs.push(res);
    return structName;
  }

  generateStruct(obj, rootName);
  return structs.reverse().join('\n\n');
}

export function jsonToRust(obj: unknown, name = 'RootObject'): string {
  const structs: string[] = [];
  const rootName = toPascalCase(name);

  if (obj === null) {
    return `pub type ${rootName} = Option<serde_json::Value>;`;
  }
  if (typeof obj !== 'object') {
    const rustType = typeof obj === 'number' ? 'f64' : typeof obj === 'boolean' ? 'bool' : 'String';
    return `pub type ${rootName} = ${rustType};`;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) return `pub type ${rootName} = Vec<serde_json::Value>;`;
    const firstItem = obj[0];
    if (typeof firstItem !== 'object' || firstItem === null) {
      const rustType = typeof firstItem === 'number' ? 'f64' : typeof firstItem === 'boolean' ? 'bool' : 'String';
      return `pub type ${rootName} = Vec<${rustType}>;`;
    }
  }

  function generateStruct(val: unknown, rawStructName: string): string {
    const structName = toPascalCase(rawStructName);
    if (typeof val !== 'object' || val === null) return '';
    if (Array.isArray(val)) {
      if (val.length > 0) return generateStruct(val[0], structName);
      return '';
    }

    let fields = '';
    const keys = Object.keys(val as Record<string, unknown>);
    for (const key of keys) {
      const fieldVal = (val as Record<string, unknown>)[key];
      const type = typeof fieldVal;
      let fieldType = '';
      const fieldName = toSnakeCase(key);

      if (fieldVal === null) {
        fieldType = 'Option<serde_json::Value>';
      } else if (type === 'object') {
        if (Array.isArray(fieldVal)) {
          if (fieldVal.length > 0) {
            const firstItem = fieldVal[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
              const nestedName = toPascalCase(key) + 'Item';
              generateStruct(firstItem, nestedName);
              fieldType = `Vec<${nestedName}>`;
            } else {
              const rustType =
                typeof firstItem === 'number' ? 'f64' : typeof firstItem === 'boolean' ? 'bool' : 'String';
              fieldType = `Vec<${rustType}>`;
            }
          } else {
            fieldType = 'Vec<serde_json::Value>';
          }
        } else {
          const nestedName = toPascalCase(key);
          generateStruct(fieldVal, nestedName);
          fieldType = nestedName;
        }
      } else {
        fieldType = type === 'number' ? 'f64' : type === 'boolean' ? 'bool' : 'String';
      }

      fields += `    #[serde(rename = "${key}")]\n    pub ${fieldName}: ${fieldType},\n`;
    }

    const res = `#[derive(Serialize, Deserialize, Debug)]\npub struct ${structName} {\n${fields}}`;
    if (!structs.includes(res)) structs.push(res);
    return structName;
  }

  generateStruct(obj, rootName);
  return structs.reverse().join('\n\n');
}

export function jsonToSchema(obj: unknown): string {
  function inferScalarType(val: unknown): string {
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    const t = typeof val;
    if (t === 'number') {
      return Number.isInteger(val) ? 'integer' : 'number';
    }
    if (t === 'boolean') return 'boolean';
    if (t === 'string') return 'string';
    if (t === 'object') return 'object';
    return 'string';
  }

  function mergeSchemas(schemas: Record<string, unknown>[]): Record<string, unknown> {
    if (schemas.length === 0) return {};
    if (schemas.length === 1) return schemas[0];

    const types = new Set<string>();
    for (const s of schemas) {
      if (Array.isArray(s.type)) {
        s.type.forEach((t) => types.add(String(t)));
      } else if (typeof s.type === 'string') {
        types.add(s.type);
      }
    }

    if (types.has('integer') && types.has('number')) {
      types.delete('integer');
    }

    const typeArr = Array.from(types);
    const resultType = typeArr.length === 1 ? typeArr[0] : typeArr.length > 1 ? typeArr : 'string';

    const merged: Record<string, unknown> = {
      type: resultType,
    };

    // If objects are present, merge properties
    const objectSchemas = schemas.filter((s) => {
      if (Array.isArray(s.type)) return s.type.includes('object');
      return s.type === 'object';
    });

    if (objectSchemas.length > 0) {
      const allPropKeys = new Set<string>();
      const keyCount = new Map<string, number>();

      for (const os of objectSchemas) {
        const props = (os.properties as Record<string, Record<string, unknown>>) || {};
        for (const k of Object.keys(props)) {
          allPropKeys.add(k);
          keyCount.set(k, (keyCount.get(k) || 0) + 1);
        }
      }

      const mergedProps: Record<string, unknown> = {};
      const requiredKeys: string[] = [];

      for (const k of allPropKeys) {
        const propSchemas: Record<string, unknown>[] = [];
        for (const os of objectSchemas) {
          const props = (os.properties as Record<string, Record<string, unknown>>) || {};
          if (props[k]) {
            propSchemas.push(props[k]);
          }
        }
        mergedProps[k] = mergeSchemas(propSchemas);

        // Required only if present in ALL object schemas
        if (keyCount.get(k) === objectSchemas.length) {
          requiredKeys.push(k);
        }
      }

      merged.properties = mergedProps;
      if (requiredKeys.length > 0) {
        merged.required = requiredKeys;
      }
    }

    // If arrays are present, merge items
    const arraySchemas = schemas.filter((s) => {
      if (Array.isArray(s.type)) return s.type.includes('array');
      return s.type === 'array';
    });

    if (arraySchemas.length > 0) {
      const itemSchemas = arraySchemas
        .map((as) => as.items as Record<string, unknown>)
        .filter(Boolean);
      if (itemSchemas.length > 0) {
        merged.items = mergeSchemas(itemSchemas);
      }
    }

    return merged;
  }

  function generateSchema(val: unknown): Record<string, unknown> {
    if (val === null) {
      return { type: ['string', 'null'] };
    }

    if (Array.isArray(val)) {
      if (val.length === 0) {
        return { type: 'array', items: {} };
      }
      const itemSchemas = val.map((item) => generateSchema(item));
      return {
        type: 'array',
        items: mergeSchemas(itemSchemas),
      };
    }

    if (typeof val === 'object' && val !== null) {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      const keys = Object.keys(val as Record<string, unknown>);

      for (const key of keys) {
        const propVal = (val as Record<string, unknown>)[key];
        properties[key] = generateSchema(propVal);
        required.push(key);
      }

      return {
        type: 'object',
        properties,
        required,
      };
    }

    return { type: inferScalarType(val) };
  }

  const schemaObj = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'GeneratedSchema',
    ...generateSchema(obj),
  };

  return JSON.stringify(schemaObj, null, 2);
}

export type TargetLang = 'typescript' | 'go' | 'rust' | 'schema';

export const LANG_LABELS: Record<TargetLang, string> = {
  typescript: 'TypeScript',
  go: 'Go',
  rust: 'Rust',
  schema: 'JSON Schema',
};

export function convertJsonToTypes(json: string, targetLang: TargetLang): { output: string; error: string | null } {
  const cleanInput = json.trim();
  if (!cleanInput) return { output: '', error: null };

  try {
    const parsed = JSON.parse(cleanInput);
    let converted = '';
    if (targetLang === 'typescript') converted = jsonToTypeScript(parsed);
    else if (targetLang === 'go') converted = jsonToGo(parsed);
    else if (targetLang === 'rust') converted = jsonToRust(parsed);
    else if (targetLang === 'schema') converted = jsonToSchema(parsed);
    return { output: converted, error: null };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Invalid JSON';
    return { output: '', error: `Invalid JSON: ${message}` };
  }
}
