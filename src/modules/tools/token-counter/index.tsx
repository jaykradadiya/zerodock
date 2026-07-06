import { useState, useEffect, useMemo } from 'react';
import { BrainCircuit, Copy, Check, Hash, Type } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';
import { encode } from 'gpt-tokenizer';

interface TokenCounterState {
  input: string;
}

const useTokenStore = createToolStore<TokenCounterState>('token-counter', {
  input: 'The quick brown fox jumps over the lazy dog.',
});

export default function TokenCounter() {
  const { input, setValues } = useTokenStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const urlState = getStateFromURL<TokenCounterState>();
    if (urlState && urlState.input !== undefined) {
      setValues(urlState);
    }
  }, []);

  const setInput = (val: string) => {
    setValues({ input: val });
    updateURLWithState({ input: val });
  };

  const tokenCount = useMemo(() => {
    if (!input.trim()) return 0;
    try {
      return encode(input).length;
    } catch {
      return 0;
    }
  }, [input]);

  const charCount = input.length;

  const copyToClipboard = async () => {
    if (!input) return;
    try {
      await navigator.clipboard.writeText(input);
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
          <BrainCircuit className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)]">LLM Token Counter</h1>
          <p className="text-[var(--zd-text-secondary)]">Accurately count OpenAI tokens before making API requests</p>
        </div>
      </div>

      <div className="w-full flex flex-col flex-1 min-h-0 bg-[var(--zd-bg)] rounded-2xl border border-[var(--zd-border)] shadow-sm overflow-hidden">
        
        {/* Stats Header */}
        <div className="p-4 border-b border-[var(--zd-border)] flex justify-around items-center bg-[var(--zd-surface)] shrink-0">
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider mb-1 flex items-center gap-1"><Hash className="w-3 h-3"/> Tokens</span>
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{tokenCount.toLocaleString()}</span>
          </div>
          <div className="h-10 w-px bg-slate-200 dark:bg-slate-800"></div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider mb-1 flex items-center gap-1"><Type className="w-3 h-3"/> Characters</span>
            <span className="text-2xl font-bold text-[var(--zd-text-secondary)]">{charCount.toLocaleString()}</span>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col relative min-h-[300px]">
          <div className="px-4 py-2 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
            <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Prompt / Payload</span>
            <div className="flex items-center gap-4">
              {input && (
                <button onClick={() => setInput('')} className="text-xs text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)]">Clear</button>
              )}
              <button onClick={copyToClipboard} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your prompt, code, or JSON payload here..."
            className="flex-1 w-full p-6 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-[13px] font-sans text-[var(--zd-text-primary)] whitespace-pre-wrap leading-relaxed"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
