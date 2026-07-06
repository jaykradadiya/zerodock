import { useState, useEffect } from 'react';
import { Code, Copy, Check, Download } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';
import { exportToFile } from '../../../shared/utils/export';
import xmlFormat from 'xml-formatter';

interface XMLState {
  input: string;
}

const useXMLStore = createToolStore<XMLState>('xml-formatter', {
  input: '',
});

export default function XMLFormatter() {
  const { input, setValues } = useXMLStore();
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Restore state from URL on mount
  useEffect(() => {
    const urlState = getStateFromURL<XMLState>();
    if (urlState && urlState.input) {
      setValues({ input: urlState.input });
    }
  }, []);

  const setInput = (val: string) => {
    setValues({ input: val });
    updateURLWithState({ input: val });
  };

  useEffect(() => {
    setError(null);
    if (!input.trim()) {
      setOutput('');
      return;
    }

    try {
      const formatted = xmlFormat(input, {
        indentation: '  ',
        collapseContent: true,
        lineSeparator: '\n'
      });
      setOutput(formatted);
    } catch (err: any) {
      setError(err.message || 'Invalid XML format');
      setOutput('');
    }
  }, [input]);

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
    <div className="flex-1 flex flex-col items-center p-4 sm:p-6 md:p-8 xl:p-10 2xl:p-12 3xl:p-16 w-full max-w-7xl 2xl:max-w-[1440px] 3xl:max-w-[1700px] mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)]">
          <Code className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)]">XML Formatter</h1>
          <p className="text-[var(--zd-text-secondary)]">Beautify and validate XML payloads instantly</p>
        </div>
      </div>

      <div className="w-full flex flex-col flex-1 min-h-0 bg-[var(--zd-bg)] rounded-2xl border border-[var(--zd-border)] shadow-sm overflow-hidden">
        
        {/* Workspace */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          
          {/* Input Panel */}
          <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-[var(--zd-border)] relative min-h-[300px]">
            <div className="px-4 py-2 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
              <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Raw XML</span>
              <div className="flex items-center gap-4">
                <button onClick={() => setInput('')} className="text-xs text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)]">Clear</button>
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste raw XML here..."
              className="flex-1 w-full p-6 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm font-mono text-[var(--zd-text-primary)] leading-relaxed whitespace-pre"
              spellCheck={false}
            />
          </div>

          {/* Output Panel */}
          <div className="flex-1 flex flex-col relative bg-[var(--zd-bg)] min-h-[300px]">
            <div className="px-4 py-2 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
              <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Formatted XML</span>
              <div className="flex items-center gap-4">
                {output && (
                  <button 
                    onClick={() => exportToFile(output, 'formatted.xml', 'application/xml')}
                    className="text-xs text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Download
                  </button>
                )}
                {output && (
                  <button onClick={copyToClipboard} className="text-xs text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1">
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
            {error ? (
              <div className="flex-1 p-6 flex flex-col">
                <p className="text-sm text-red-500 dark:text-red-400 font-medium">Error Parsing XML</p>
                <p className="text-xs text-red-400 dark:text-red-300 mt-2 font-mono whitespace-pre-wrap">{error}</p>
              </div>
            ) : (
              <textarea
                value={output}
                readOnly
                placeholder="Formatted output will appear here..."
                className="flex-1 w-full p-6 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm font-mono text-[var(--zd-text-primary)] whitespace-pre"
                spellCheck={false}
              />
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
