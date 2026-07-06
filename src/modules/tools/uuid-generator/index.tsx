import { useState, useMemo } from 'react';
import { Fingerprint, Copy, RefreshCw } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { usePreferenceStore } from '../../../core/store/usePreferenceStore';
import { playSound } from '../../../shared/utils/sound';

type Format = 'plain' | 'json' | 'sql' | 'csv';

export default function UuidGenerator() {
  const { theme } = usePreferenceStore();
  const [count, setCount] = useState(5);
  const [format, setFormat] = useState<Format>('plain');
  const [uuidList, setUuidList] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const results = useMemo(() => {
    if (uuidList.length === 0) return '';
    if (format === 'plain') return uuidList.join('\n');
    if (format === 'json') return JSON.stringify(uuidList, null, 2);
    if (format === 'sql') return uuidList.map(id => `('${id}')`).join(',\n');
    if (format === 'csv') return uuidList.join(',');
    return '';
  }, [uuidList, format]);

  const generateUUIDs = () => {
    const list = Array.from({ length: count }, () => crypto.randomUUID());
    setUuidList(list);
  };

  const handleCopy = async () => {
    if (!results) return;
    await navigator.clipboard.writeText(results);
    setCopied(true);
    if (usePreferenceStore.getState().soundEnabled) playSound('tick');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 p-6 md:p-12 w-full max-w-4xl mx-auto h-full">
      <div className="flex items-center gap-4 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] flex items-center justify-center">
          <Fingerprint className="w-6 h-6 text-[var(--zd-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)] tracking-tight">UUID Generator</h1>
          <p className="text-sm text-[var(--zd-text-secondary)] mt-1">Generate bulk v4 UUIDs for database seeding and testing.</p>
        </div>
      </div>

      <div className="bg-[var(--zd-surface)] rounded-2xl border border-[var(--zd-border)] p-4 flex flex-wrap gap-4 items-end shrink-0">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[120px]">
          <label className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Count</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) => setCount(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-full bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-md px-3 py-2 text-sm text-[var(--zd-text-primary)] outline-none focus:border-[var(--zd-primary)]"
          />
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
          <label className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as Format)}
            className="w-full bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-md px-3 py-2 text-sm text-[var(--zd-text-primary)] outline-none focus:border-[var(--zd-primary)]"
          >
            <option value="plain">Plain Text (Lines)</option>
            <option value="csv">CSV (Comma-separated)</option>
            <option value="json">JSON Array</option>
            <option value="sql">SQL Tuples ('id')</option>
          </select>
        </div>

        <button
          onClick={generateUUIDs}
          className="flex items-center gap-2 bg-[var(--zd-primary)] hover:bg-[var(--zd-primary-hover)] text-white px-4 py-2 rounded-md transition-colors text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Generate
        </button>
      </div>

      <div className="flex flex-col flex-1 bg-[var(--zd-bg)] rounded-2xl border border-[var(--zd-border)] overflow-hidden min-h-0">
        <div className="px-4 py-3 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex items-center justify-between shrink-0">
          <span className="text-sm font-semibold text-[var(--zd-text-primary)]">Output</span>
          <button
            onClick={handleCopy}
            disabled={!results}
            className="text-xs flex items-center gap-1.5 text-orange-600 dark:text-orange-400 hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="w-3 h-3" />
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
        <div className="flex-1 w-full relative p-4 bg-[var(--zd-surface)] flex flex-col min-h-[300px]">
          {results ? (
            <div className="flex-1 w-full border border-[var(--zd-border)] rounded-xl overflow-hidden shadow-sm flex flex-col bg-[var(--zd-bg)]">
              {/* Code Block Header */}
              <div className="h-10 border-b border-[var(--zd-border)] flex items-center px-4 justify-between bg-[var(--zd-surface-raised)] shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">
                    {format}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-[var(--zd-text-muted)]">
                    {count} lines
                  </span>
                </div>
              </div>
              
              {/* Monaco Code Block Body */}
              <div className="flex-1 relative w-full min-h-[300px]">
                <div className="absolute inset-0">
                  <Editor
                    height="100%"
                    language={format === 'json' ? 'json' : format === 'sql' ? 'sql' : 'plaintext'}
                    value={results}
                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      wordWrap: 'on',
                      scrollBeyondLastLine: false,
                      fontSize: 13,
                      lineNumbers: 'on',
                      lineDecorationsWidth: 16,
                      lineNumbersMinChars: 3,
                      folding: false,
                      padding: { top: 12, bottom: 12 },
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4 text-[var(--zd-text-muted)] opacity-60">
                <div className="w-16 h-16 rounded-2xl bg-[var(--zd-bg)] border border-[var(--zd-border)] flex items-center justify-center shadow-sm">
                  <Fingerprint className="w-7 h-7" />
                </div>
                <span className="text-sm font-medium tracking-wide">Ready to generate UUIDs</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
