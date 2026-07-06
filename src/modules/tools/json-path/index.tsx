import { useState, useEffect } from 'react';
import { Filter, Play, Copy, Check, Download } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';
import { exportToFile } from '../../../shared/utils/export';
import jmespath from 'jmespath';

interface JsonPathState {
  input: string;
  query: string;
}

const useJsonPathStore = createToolStore<JsonPathState>('json-path', {
  input: '{\n  "users": [\n    {"name": "Alice", "age": 25},\n    {"name": "Bob", "age": 30}\n  ]\n}',
  query: 'users[?age > `25`].name',
});

export default function JsonPathPlayground() {
  const { input, query, setValues } = useJsonPathStore();
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const urlState = getStateFromURL<JsonPathState>();
    if (urlState && urlState.query !== undefined) {
      setValues(urlState);
    }
  }, []);

  const updateState = (updates: Partial<JsonPathState>) => {
    setValues(updates);
    updateURLWithState({ input, query, ...updates });
  };

  useEffect(() => {
    if (!input.trim() || !query.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    try {
      const parsedJson = JSON.parse(input);
      const result = jmespath.search(parsedJson, query);
      setOutput(JSON.stringify(result, null, 2));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Invalid JSON or Query');
      setOutput('');
    }
  }, [input, query]);

  const copyToClipboard = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-4 sm:p-6 md:p-8 xl:p-10 2xl:p-12 3xl:p-16 w-full max-w-6xl 2xl:max-w-7xl 3xl:max-w-[1440px] mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] flex items-center justify-center text-[var(--zd-primary)]">
          <Filter className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)]">JSON Path (JMESPath)</h1>
          <p className="text-[var(--zd-text-secondary)]">Query and filter massive JSON payloads</p>
        </div>
      </div>

      <div className="w-full flex flex-col flex-1 min-h-0 bg-[var(--zd-bg)] rounded-2xl border border-[var(--zd-border)] shadow-sm overflow-hidden">
        
        {/* Query Input */}
        <div className="p-4 border-b border-[var(--zd-border)] flex items-center gap-4 bg-[var(--zd-surface)] shrink-0">
          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-[var(--zd-primary)] shrink-0">
            <Play className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => updateState({ query: e.target.value })}
            placeholder="users[?age > `25`].name"
            className="flex-1 px-4 py-2 bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-lg text-sm font-mono focus:outline-none focus:border-[var(--zd-primary)] text-[var(--zd-text-primary)]"
          />
        </div>

        {/* Workspace */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          
          {/* JSON Input */}
          <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-[var(--zd-border)] relative min-h-[200px]">
            <div className="px-4 py-2 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
              <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Input JSON</span>
            </div>
            <textarea
              value={input}
              onChange={(e) => updateState({ input: e.target.value })}
              placeholder="Paste massive JSON here..."
              className="flex-1 w-full p-4 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm font-mono text-[var(--zd-text-primary)] whitespace-pre"
              spellCheck={false}
            />
          </div>

          {/* Filtered Output */}
          <div className="flex-1 flex flex-col relative bg-[var(--zd-bg)] min-h-[200px]">
            <div className="px-4 py-2 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
              <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Result</span>
              {output && (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => exportToFile(output, 'filtered.json', 'application/json')}
                    className="text-xs text-[var(--zd-primary)] hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                  <button onClick={copyToClipboard} className="text-xs text-[var(--zd-primary)] hover:underline flex items-center gap-1">
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
            {error ? (
              <div className="flex-1 p-4 flex flex-col">
                <p className="text-sm text-red-500 dark:text-red-400 font-medium">Invalid Query or JSON</p>
                <p className="text-xs text-red-400 dark:text-red-300 mt-2 font-mono whitespace-pre-wrap">{error}</p>
              </div>
            ) : (
              <textarea
                value={output}
                readOnly
                placeholder="Filtered result will appear here..."
                className="flex-1 w-full p-4 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm font-mono text-[var(--zd-text-primary)] whitespace-pre"
                spellCheck={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
