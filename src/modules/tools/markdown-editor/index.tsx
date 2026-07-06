import { useState, useEffect } from 'react';
import { FileText, Copy, Check, Download, SplitSquareHorizontal } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';
import { exportToFile } from '../../../shared/utils/export';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownState {
  input: string;
}

const useMarkdownStore = createToolStore<MarkdownState>('markdown-editor', {
  input: '# Hello ZeroDock\n\nWrite some markdown here...',
});

export default function MarkdownEditor() {
  const { input, setValues } = useMarkdownStore();
  const [copied, setCopied] = useState(false);

  // Restore state from URL on mount
  useEffect(() => {
    const urlState = getStateFromURL<MarkdownState>();
    if (urlState && urlState.input) {
      setValues({ input: urlState.input });
    }
  }, []);

  const setInput = (val: string) => {
    setValues({ input: val });
    updateURLWithState({ input: val });
  };

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
    <div className="flex-1 flex flex-col items-center p-4 sm:p-6 md:p-8 xl:p-10 2xl:p-12 3xl:p-16 w-full max-w-7xl 2xl:max-w-[1440px] 3xl:max-w-[1700px] mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] flex items-center justify-center text-[var(--zd-primary)]">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)]">Markdown Editor</h1>
          <p className="text-[var(--zd-text-secondary)]">Live preview markdown with GFM support</p>
        </div>
      </div>

      <div className="w-full flex flex-col flex-1 min-h-0 bg-[var(--zd-bg)] rounded-2xl border border-[var(--zd-border)] shadow-sm overflow-hidden">
        
        {/* Workspace */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          
          {/* Input Panel */}
          <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-[var(--zd-border)] relative min-h-[300px]">
            <div className="px-4 py-2 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
              <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Editor</span>
              <div className="flex items-center gap-4">
                <button onClick={() => setInput('')} className="text-xs text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)]">Clear</button>
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write Markdown here..."
              className="flex-1 w-full p-6 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm font-mono text-[var(--zd-text-primary)] leading-relaxed"
              spellCheck={false}
            />
          </div>

          {/* Preview Panel */}
          <div className="flex-1 flex flex-col relative bg-[var(--zd-bg)] min-h-[300px]">
            <div className="px-4 py-2 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
              <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider flex items-center gap-2">
                <SplitSquareHorizontal className="w-4 h-4" /> Preview
              </span>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => exportToFile(input, 'document.md', 'text/markdown')}
                  className="text-xs text-[var(--zd-primary)] hover:underline flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Download .md
                </button>
                <button onClick={copyToClipboard} className="text-xs text-[var(--zd-primary)] hover:underline flex items-center gap-1">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-auto prose prose-slate dark:prose-invert max-w-none w-full">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {input}
              </ReactMarkdown>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
