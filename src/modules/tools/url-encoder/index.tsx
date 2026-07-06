import { useState, useEffect } from 'react';
import { Link2, ArrowRightLeft, Copy, Check } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';

const useUrlStore = createToolStore('url-encoder', {
  input: '',
  mode: 'encode' as 'encode' | 'decode',
});

export default function URLEncoder() {
  const { input, mode, setValues } = useUrlStore();
  const setInput = (val: string) => setValues({ input: val });
  const setMode = (val: 'encode' | 'decode') => setValues({ mode: val });
  
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setError(null);
    if (!input) {
      setOutput('');
      return;
    }

    try {
      if (mode === 'encode') {
        setOutput(encodeURIComponent(input));
      } else {
        setOutput(decodeURIComponent(input));
      }
    } catch (err) {
      setError('Invalid URL encoding');
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
    <div className="flex-1 flex flex-col items-center p-4 sm:p-6 md:p-8 xl:p-10 2xl:p-12 3xl:p-16 w-full max-w-6xl 2xl:max-w-7xl 3xl:max-w-[1440px] mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)]">
          <Link2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)]">URL Encoder / Decoder</h1>
          <p className="text-[var(--zd-text-secondary)]">Safely encode or decode URL parameters</p>
        </div>
      </div>

      <div className="w-full flex flex-col flex-1 min-h-0 bg-[var(--zd-bg)] rounded-2xl border border-[var(--zd-border)] shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-[var(--zd-border)] flex items-center justify-center bg-[var(--zd-surface)] shrink-0">
          <div className="flex items-center gap-2 bg-[var(--zd-surface-raised)] p-1 rounded-lg">
            <button
              onClick={() => { setMode('encode'); setInput(output); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'encode' 
                  ? 'bg-[var(--zd-surface)] border border-[var(--zd-border)] text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-[var(--zd-text-secondary)] hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Encode
            </button>
            <button
              onClick={() => { setMode('decode'); setInput(output); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'decode' 
                  ? 'bg-[var(--zd-surface)] border border-[var(--zd-border)] text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-[var(--zd-text-secondary)] hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Decode
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          {/* Input */}
          <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-[var(--zd-border)] relative min-h-[200px]">
            <div className="px-4 py-2 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
              <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">
                {mode === 'encode' ? 'Plain Text' : 'URL Encoded'}
              </span>
              {input && (
                <button onClick={() => setInput('')} className="text-xs text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)]">Clear</button>
              )}
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'encode' ? 'Enter string to URL encode...' : 'Enter encoded string to decode...'}
              className="flex-1 w-full p-4 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm font-mono text-[var(--zd-text-primary)]"
            />
          </div>

          {/* Swap Button (Desktop) */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <button
              onClick={() => {
                setMode(mode === 'encode' ? 'decode' : 'encode');
                setInput(output);
              }}
              className="p-2 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] rounded-full shadow-sm text-[var(--zd-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Swap"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Output */}
          <div className="flex-1 flex flex-col relative bg-[var(--zd-bg)] min-h-[200px]">
            <div className="px-4 py-2 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
              <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">
                {mode === 'encode' ? 'URL Encoded' : 'Plain Text'}
              </span>
              {output && (
                <button onClick={copyToClipboard} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
            {error ? (
              <div className="flex-1 p-4 flex items-center justify-center">
                <p className="text-sm text-red-500 dark:text-red-400 font-medium">{error}</p>
              </div>
            ) : (
              <textarea
                value={output}
                readOnly
                placeholder="Result will appear here..."
                className="flex-1 w-full p-4 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm font-mono text-[var(--zd-text-primary)] break-all"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
