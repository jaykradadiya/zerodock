import { useState, useEffect } from 'react';
import { ArrowRightLeft, Copy, Check, FileJson } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import YAML from 'yaml';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';

type Mode = 'yaml2json' | 'json2yaml';

interface YamlJsonState {
  input: string;
  mode: Mode;
}

const useYamlJsonStore = createToolStore<YamlJsonState>('yaml-json-converter', {
  input: '',
  mode: 'yaml2json',
});

export default function YamlJsonConverter() {
  const { input, mode, setValues } = useYamlJsonStore();
  
  const setInput = (val: string) => {
    setValues({ input: val });
    updateURLWithState({ input: val, mode });
  };
  const setMode = (val: Mode) => {
    setValues({ mode: val });
    updateURLWithState({ input, mode: val });
  };

  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Restore state from URL on mount
  useEffect(() => {
    const urlState = getStateFromURL<YamlJsonState>();
    if (urlState) {
      setValues(urlState);
    }
  }, []);

  useEffect(() => {
    setError(null);
    if (!input.trim()) {
      setOutput('');
      return;
    }

    try {
      if (mode === 'yaml2json') {
        const parsed = YAML.parse(input);
        setOutput(JSON.stringify(parsed, null, 2));
      } else {
        const parsed = JSON.parse(input);
        setOutput(YAML.stringify(parsed));
      }
    } catch (err: any) {
      setError(err.message || 'Invalid format');
      setOutput('');
    }
  }, [input, mode]);

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
    <div className="flex-1 flex flex-col items-center p-6 md:p-12 w-full max-w-6xl mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
          <FileJson className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">YAML ↔ JSON Converter</h1>
          <p className="text-slate-500 dark:text-slate-400">Convert between YAML and JSON instantly</p>
        </div>
      </div>

      <div className="w-full flex flex-col flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => { setMode('yaml2json'); setInput(output); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'yaml2json' 
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              YAML to JSON
            </button>
            <button
              onClick={() => { setMode('json2yaml'); setInput(output); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'json2yaml' 
                  ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              JSON to YAML
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          {/* Input */}
          <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 relative min-h-[200px]">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {mode === 'yaml2json' ? 'YAML' : 'JSON'}
              </span>
              {input && (
                <button onClick={() => setInput('')} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">Clear</button>
              )}
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'yaml2json' ? 'Enter YAML here...' : 'Enter JSON here...'}
              className="flex-1 w-full p-4 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm font-mono text-slate-800 dark:text-slate-200 whitespace-pre"
              spellCheck={false}
            />
          </div>

          {/* Swap Button (Desktop) */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <button
              onClick={() => {
                setMode(mode === 'yaml2json' ? 'json2yaml' : 'yaml2json');
                setInput(output);
              }}
              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm text-slate-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
              title="Swap"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Output */}
          <div className="flex-1 flex flex-col relative bg-slate-50/30 dark:bg-slate-900/30 min-h-[200px]">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {mode === 'yaml2json' ? 'JSON' : 'YAML'}
              </span>
              {output && (
                <button onClick={copyToClipboard} className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
            {error ? (
              <div className="flex-1 p-4 flex flex-col">
                <p className="text-sm text-red-500 dark:text-red-400 font-medium">Error Parsing Input</p>
                <p className="text-xs text-red-400 dark:text-red-300 mt-2 font-mono whitespace-pre-wrap">{error}</p>
              </div>
            ) : (
              <textarea
                value={output}
                readOnly
                placeholder="Result will appear here..."
                className="flex-1 w-full p-4 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm font-mono text-slate-800 dark:text-slate-200 whitespace-pre"
                spellCheck={false}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
