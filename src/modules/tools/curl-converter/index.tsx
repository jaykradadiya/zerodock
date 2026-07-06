import { TerminalSquare } from 'lucide-react';
import { CodePanel } from '../../../shared/components/CodePanel';
import { ToolPage, ToolHeader, ToolWorkspace, SplitPanels, ToolSelect, ToolToolbar, ToolEmbedFrame } from '../../../shared/components/ToolLayout';
import { useToolEmbed } from '../../../shared/context/ToolEmbedContext';
import { createToolStore } from '../../../core/store/useToolState';
import { useConverterShortcuts } from '../../../shared/hooks/useConverterShortcuts';
import { useSyncToolUrl } from '../../../shared/hooks/useSyncToolUrl';

const useCurlStore = createToolStore('curl-converter', {
  curlString: 'curl -X POST https://api.example.com/v1/users \\\n  -H "Authorization: Bearer token123" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"name": "Alice"}\'',
  targetLang: 'javascript' as 'javascript' | 'python' | 'go',
});

function parseCurl(curl: string) {
  const methodMatch = curl.match(/-X\s+([A-Z]+)/);
  const method = methodMatch ? methodMatch[1] : 'GET';

  const urlMatch = curl.match(/curl\s+(?:-X\s+[A-Z]+\s+)?['"]?(https?:\/\/[^\s'"]+)['"]?/);
  const url = urlMatch ? urlMatch[1] : '';

  const headerMatches = [...curl.matchAll(/-H\s+['"]([^'"]+)['"]/g)];
  const headers = headerMatches.map(m => {
    const split = m[1].split(':');
    return { key: split[0].trim(), value: split.slice(1).join(':').trim() };
  });

  const dataMatch = curl.match(/-d\s+(['"])(.*?)\1/s);
  const data = dataMatch ? dataMatch[2] : null;

  return { method, url, headers, data };
}

function convertToFetch({ method, url, headers, data }: any) {
  let js = `fetch('${url}', {\n`;
  js += `  method: '${method}',\n`;
  if (headers.length > 0) {
    js += `  headers: {\n`;
    headers.forEach((h: any) => {
      js += `    '${h.key}': '${h.value}',\n`;
    });
    js += `  },\n`;
  }
  if (data) {
    js += `  body: JSON.stringify(${data}),\n`;
  }
  js += `});`;
  return js;
}

function convertToPython({ method, url, headers, data }: any) {
  let py = `import requests\n\n`;
  if (headers.length > 0) {
    py += `headers = {\n`;
    headers.forEach((h: any) => {
      py += `    '${h.key}': '${h.value}',\n`;
    });
    py += `}\n\n`;
  }
  if (data) {
    py += `json_data = ${data}\n\n`;
  }
  
  py += `response = requests.${method.toLowerCase()}('${url}'`;
  if (headers.length > 0) py += `, headers=headers`;
  if (data) py += `, json=json_data`;
  py += `)\n`;
  return py;
}

function convertToGo({ method, url, headers, data }: any) {
  let go = `package main\n\nimport (\n\t"fmt"\n\t"net/http"\n\t"io/ioutil"\n\t"strings"\n)\n\nfunc main() {\n`;
  if (data) {
    go += `\tpayload := strings.NewReader(\`${data}\`)\n`;
  }
  go += `\treq, err := http.NewRequest("${method}", "${url}", ${data ? 'payload' : 'nil'})\n`;
  go += `\tif err != nil {\n\t\tpanic(err)\n\t}\n\n`;
  
  headers.forEach((h: any) => {
    go += `\treq.Header.Add("${h.key}", "${h.value}")\n`;
  });
  
  go += `\n\tres, err := http.DefaultClient.Do(req)\n`;
  go += `\tif err != nil {\n\t\tpanic(err)\n\t}\n\tdefer res.Body.Close()\n\n`;
  go += `\tbody, _ := ioutil.ReadAll(res.Body)\n`;
  go += `\tfmt.Println(string(body))\n}`;
  return go;
}

const LANG_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  python: 'Python',
  go: 'Go',
};

export default function CurlConverter() {
  const { curlString, targetLang, setValues } = useCurlStore();
  const setCurlString = (val: string) => setValues({ curlString: val });
  const setTargetLang = (val: 'javascript' | 'python' | 'go') => setValues({ targetLang: val });

  useSyncToolUrl(() => useCurlStore.getState(), setValues, [curlString, targetLang]);

  const parsed = parseCurl(curlString);
  let converted = '';
  if (targetLang === 'javascript') converted = convertToFetch(parsed);
  else if (targetLang === 'python') converted = convertToPython(parsed);
  else if (targetLang === 'go') converted = convertToGo(parsed);

  useConverterShortcuts({
    onClear: () => setCurlString(''),
    output: converted,
  });

  const embedded = useToolEmbed();

  const langSelect = (
    <ToolSelect
      value={targetLang}
      onChange={(e) => setTargetLang(e.target.value as 'javascript' | 'python' | 'go')}
    >
      <option value="javascript">JavaScript (fetch)</option>
      <option value="python">Python (requests)</option>
      <option value="go">Go (net/http)</option>
    </ToolSelect>
  );

  const toolToolbar = embedded ? (
    <ToolToolbar>{langSelect}</ToolToolbar>
  ) : null;

  const panels = (
    <SplitPanels>
      <CodePanel
        title="cURL Command"
        language="shell"
        value={curlString}
        onChange={(val) => setCurlString(val || '')}
        onClear={() => setCurlString('')}
        borderRight
      />
      <CodePanel
        title="Generated Code"
        badge={LANG_LABELS[targetLang]}
        language={targetLang}
        value={converted}
        readOnly
        downloadFileName={`request.${targetLang === 'javascript' ? 'js' : targetLang}`}
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
        icon={TerminalSquare}
        title="cURL Converter"
        description="Convert cURL commands to modern code snippets"
        actions={langSelect}
      />
      <ToolWorkspace>{panels}</ToolWorkspace>
    </ToolPage>
  );
}
