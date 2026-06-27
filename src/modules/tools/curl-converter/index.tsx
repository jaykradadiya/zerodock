import { useState } from 'react';
import { TerminalSquare, ArrowRight, Copy, Check } from 'lucide-react';
import { CodeEditor } from '../../../shared/components/CodeEditor';
import { createToolStore } from '../../../core/store/useToolState';

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
    js += `  body: JSON.stringify(${data}),\n`; // Assuming JSON
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

export default function CurlConverter() {
  const { curlString, targetLang, setValues } = useCurlStore();
  const setCurlString = (val: string) => setValues({ curlString: val });
  const setTargetLang = (val: 'javascript' | 'python' | 'go') => setValues({ targetLang: val });

  const [copied, setCopied] = useState(false);

  const parsed = parseCurl(curlString);
  let converted = '';
  if (targetLang === 'javascript') converted = convertToFetch(parsed);
  else if (targetLang === 'python') converted = convertToPython(parsed);
  else if (targetLang === 'go') converted = convertToGo(parsed);

  const triggerCopy = () => {
    navigator.clipboard.writeText(converted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col items-center p-4 xl:p-8 w-full h-[calc(100vh-96px)] xl:h-[calc(100vh-128px)] min-h-0 relative">
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)] shrink-0">
            <TerminalSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">cURL Converter</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Convert cURL commands to modern code snippets</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          <select 
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value as any)}
            className="text-sm border border-[var(--zd-border)] rounded-xl bg-[var(--zd-surface)] text-slate-800 dark:text-slate-200 px-3 py-2 outline-none focus:border-[var(--zd-primary)] transition-all font-semibold"
          >
            <option value="javascript">JavaScript (fetch)</option>
            <option value="python">Python (requests)</option>
            <option value="go">Go (net/http)</option>
          </select>
          <button
            onClick={triggerCopy}
            disabled={!converted}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--zd-primary)] hover:bg-[var(--zd-primary)]/90 text-white rounded-xl text-sm font-semibold transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>
      </div>

      <div className="w-full flex-1 min-h-0 bg-[var(--zd-surface)] rounded-2xl border border-[var(--zd-border)] shadow-[var(--zd-shadow-md)] overflow-hidden flex flex-col md:flex-row relative">
        <div className="flex-1 flex flex-col min-w-0 border-b md:border-b-0 md:border-r border-[var(--zd-border)]">
          <div className="px-4 py-2 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] shrink-0 flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>cURL Command</span>
          </div>
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <CodeEditor
                value={curlString}
                onChange={(val) => setCurlString(val || '')}
                language="shell"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-2 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] shrink-0 flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Generated Code</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[var(--zd-primary)]">{targetLang}</span>
          </div>
          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <CodeEditor
                value={converted}
                readOnly
                language={targetLang}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
