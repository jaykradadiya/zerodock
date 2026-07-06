import { useEffect, useState } from 'react';
import { BrainCircuit, Hash, Type } from 'lucide-react';
import { CodePanel } from '../../../shared/components/CodePanel';
import { ToolPage, ToolHeader, ToolWorkspace, ToolToolbar } from '../../../shared/components/ToolLayout';
import { createToolStore } from '../../../core/store/useToolState';
import { useSyncToolUrl } from '../../../shared/hooks/useSyncToolUrl';

interface TokenCounterState {
  input: string;
}

const useTokenStore = createToolStore<TokenCounterState>('token-counter', {
  input: 'The quick brown fox jumps over the lazy dog.',
});

export default function TokenCounter() {
  const { input, setValues } = useTokenStore();
  const [tokenCount, setTokenCount] = useState(0);

  useSyncToolUrl(() => ({ input }), setValues, [input]);

  const setInput = (val: string) => setValues({ input: val });

  useEffect(() => {
    if (!input.trim()) {
      setTokenCount(0);
      return;
    }
    let cancelled = false;
    import('gpt-tokenizer').then(({ encode }) => {
      if (cancelled) return;
      try {
        setTokenCount(encode(input).length);
      } catch {
        setTokenCount(0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [input]);

  const charCount = input.length;

  return (
    <ToolPage>
      <ToolHeader
        icon={BrainCircuit}
        title="LLM Token Counter"
        description="Count OpenAI-compatible tokens before API requests"
      />

      <ToolWorkspace
        toolbar={
          <ToolToolbar>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-[var(--zd-text-secondary)]">
                <Hash className="w-4 h-4 text-[var(--zd-primary)]" />
                <span className="font-mono font-bold text-[var(--zd-text-primary)]">{tokenCount}</span>
                <span>tokens</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--zd-text-secondary)]">
                <Type className="w-4 h-4 text-[var(--zd-accent)]" />
                <span className="font-mono font-bold text-[var(--zd-text-primary)]">{charCount}</span>
                <span>chars</span>
              </div>
            </div>
          </ToolToolbar>
        }
      >
        <CodePanel
          title="Prompt text"
          useTextarea
          value={input}
          onChange={setInput}
          onClear={() => setInput('')}
          placeholder="Paste your prompt here..."
        />
      </ToolWorkspace>
    </ToolPage>
  );
}
