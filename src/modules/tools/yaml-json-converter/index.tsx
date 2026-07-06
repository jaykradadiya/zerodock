import { useState, useEffect } from 'react';
import { ArrowRightLeft, FileJson } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import YAML from 'yaml';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';
import Editor from '@monaco-editor/react';
import { CopyButton } from '../../../shared/components/CopyButton';
import { SendToButton } from '../../../shared/components/SendToButton';
import Split from 'react-split';
import { useUIStore } from '../../../core/store/useUIStore';
import { usePreferenceStore } from '../../../core/store/usePreferenceStore';
import { usePipelineStore } from '../../../core/store/usePipelineStore';
import { Eraser, Zap, Maximize, Minimize } from 'lucide-react';

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
  const { theme } = usePreferenceStore();
  const { zenMode, setZenMode } = useUIStore();
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

  // Restore state from URL on mount
  useEffect(() => {
    const urlState = getStateFromURL<YamlJsonState>();
    if (urlState) {
      setValues(urlState);
    }
    
    // Check if there is data piped from another tool
    const pipedData = usePipelineStore.getState().consumePipelineData();
    if (pipedData) {
      // Auto-detect JSON or YAML
      if (pipedData.trim().startsWith('{') || pipedData.trim().startsWith('[')) {
        setMode('json2yaml');
      } else {
        setMode('yaml2json');
      }
      setInput(pipedData);
    }
  }, []);

  // Register context commands
  useEffect(() => {
    const { setContextCommands } = useUIStore.getState();
    setContextCommands([
      {
        id: 'load-sample',
        name: 'Load Sample Data',
        description: 'Populate with example configuration',
        icon: Zap,
        action: () => {
          if (useYamlJsonStore.getState().mode === 'yaml2json') {
            setInput('name: ZeroDock\nversion: 1.0\nfeatures:\n  - fast\n  - local\n  - secure');
          } else {
            setInput('{\n  "name": "ZeroDock",\n  "version": "1.0",\n  "features": [\n    "fast",\n    "local",\n    "secure"\n  ]\n}');
          }
        },
      },
      {
        id: 'clear-input',
        name: 'Clear Input',
        description: 'Empty the current editor',
        icon: Eraser,
        action: () => setInput(''),
      }
    ]);
    
    return () => setContextCommands([]); // Cleanup on unmount
  }, [mode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && zenMode) {
        setZenMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zenMode, setZenMode]);

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

  return (
    <div className={`flex-1 flex flex-col items-center ${zenMode ? 'p-2' : 'p-4 sm:p-6 md:p-8 xl:p-10 2xl:p-12'} w-full max-w-6xl 2xl:max-w-7xl 3xl:max-w-[1440px] mx-auto h-full min-h-0`}>
      {!zenMode && (
        <div className="w-full flex items-center gap-4 mb-8 shrink-0">
          <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)]">
            <FileJson className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)]">YAML ↔ JSON Converter</h1>
            <p className="text-[var(--zd-text-secondary)]">Convert between YAML and JSON instantly</p>
          </div>
        </div>
      )}

      <div className={`w-full flex flex-col flex-1 min-h-0 bg-[var(--zd-bg)] border-[var(--zd-border)] shadow-sm overflow-hidden ${zenMode ? 'rounded-md border-0' : 'rounded-2xl border'}`}>
        {/* Controls */}
        <div className="p-4 border-b border-[var(--zd-border)] flex items-center justify-between bg-[var(--zd-surface)] shrink-0">
          <div className="w-8"></div> {/* Spacer for centering */}
          
          <div className="flex items-center gap-2 bg-[var(--zd-surface-raised)] p-1 rounded-lg">
            <button
              onClick={() => { setMode('yaml2json'); setInput(output); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'yaml2json' 
                  ? 'bg-[var(--zd-surface)] border border-[var(--zd-border)] text-orange-600 dark:text-orange-400 shadow-sm' 
                  : 'text-[var(--zd-text-secondary)] hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              YAML to JSON
            </button>
            <button
              onClick={() => { setMode('json2yaml'); setInput(output); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'json2yaml' 
                  ? 'bg-[var(--zd-surface)] border border-[var(--zd-border)] text-orange-600 dark:text-orange-400 shadow-sm' 
                  : 'text-[var(--zd-text-secondary)] hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              JSON to YAML
            </button>
          </div>

          <button
            onClick={() => setZenMode(!zenMode)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface-raised)] transition-colors focus-ring"
            title={zenMode ? "Exit Zen Mode (Esc)" : "Enter Zen Mode"}
          >
            {zenMode ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>

        {/* Workspace */}
        <Split 
          className="flex flex-row flex-1 min-h-0 w-full"
          sizes={[50, 50]}
          minSize={250}
          gutterSize={4}
          snapOffset={30}
          direction="horizontal"
          cursor="col-resize"
        >
          {/* Input */}
          <div className="flex flex-col relative min-h-[200px] bg-[var(--zd-surface)]">
            <div className="px-4 py-2 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
              <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">
                {mode === 'yaml2json' ? 'YAML' : 'JSON'}
              </span>
              {input && (
                <button onClick={() => setInput('')} className="text-xs text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)]">Clear</button>
              )}
            </div>
            {input.trim() === '' ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--zd-surface)]">
                <div className="w-16 h-16 mb-4 rounded-full bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)]">
                  <Zap size={24} />
                </div>
                <h3 className="text-[var(--zd-text-primary)] font-semibold mb-2">Ready to convert</h3>
                <p className="text-[var(--zd-text-muted)] text-sm max-w-[250px] mb-6">
                  Paste your {mode === 'yaml2json' ? 'YAML' : 'JSON'} here, or load a sample to see how it works.
                </p>
                <button
                  onClick={() => {
                    if (mode === 'yaml2json') {
                      setInput('name: ZeroDock\nversion: 1.0\nfeatures:\n  - fast\n  - local\n  - secure');
                    } else {
                      setInput('{\n  "name": "ZeroDock",\n  "version": "1.0",\n  "features": [\n    "fast",\n    "local",\n    "secure"\n  ]\n}');
                    }
                  }}
                  className="px-4 py-2 bg-[var(--zd-primary)] hover:bg-[var(--zd-primary-hover)] text-white rounded-md text-sm font-medium transition-colors shadow-sm focus-ring"
                >
                  Load Sample Data
                </button>
              </div>
            ) : (
              <Editor
                height="100%"
                language={mode === 'yaml2json' ? 'yaml' : 'json'}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                value={input}
                onChange={(value) => setInput(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  lineNumbersMinChars: 3,
                  folding: false,
                  overviewRulerLanes: 0,
                  scrollbar: {
                    vertical: 'hidden',
                    horizontal: 'hidden'
                  }
                }}
              />
            )}
          </div>

          {/* Output */}
          <div className="flex flex-col relative bg-[var(--zd-bg)] min-h-[200px]">
            <div className="px-4 py-2 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
              <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">
                {mode === 'yaml2json' ? 'JSON' : 'YAML'}
              </span>
              {output && (
                <div className="flex items-center gap-2">
                  <SendToButton 
                    data={output} 
                    targets={[
                      { id: 'json-toolkit', name: 'JSON Toolkit', route: '/json-toolkit' },
                      { id: 'base64-codec', name: 'Base64 Encoder', route: '/base64-codec' },
                    ]} 
                  />
                  <div className="w-px h-4 bg-[var(--zd-border)] mx-1" />
                  <CopyButton value={output} />
                </div>
              )}
            </div>
            {error ? (
              <div className="flex-1 p-4 flex flex-col">
                <p className="text-sm text-red-500 dark:text-red-400 font-medium">Error Parsing Input</p>
                <p className="text-xs text-red-400 dark:text-red-300 mt-2 font-mono whitespace-pre-wrap">{error}</p>
              </div>
            ) : (
              <div className="flex-1 w-full relative">
                {output ? (
                  <Editor
                    height="100%"
                    language={mode === 'yaml2json' ? 'json' : 'yaml'}
                    value={output}
                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      wordWrap: 'on',
                      scrollBeyondLastLine: false,
                      fontSize: 13,
                      lineNumbers: 'off',
                      folding: false,
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-[var(--zd-text-muted)]">
                    Result will appear here...
                  </div>
                )}
              </div>
            )}
          </div>
        </Split>
      </div>

      {/* Swap Button (Desktop) */}
      <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none mt-10">
        <button
          style={{ pointerEvents: 'auto' }}
          onClick={() => {
            setMode(mode === 'yaml2json' ? 'json2yaml' : 'yaml2json');
            setInput(output);
          }}
          className="p-2 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-full shadow-sm text-[var(--zd-text-secondary)] hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          title="Swap"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
