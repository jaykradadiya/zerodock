import { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Binary, ArrowRightLeft, Copy, Check, Upload, Sparkles } from 'lucide-react';
import { usePipelineStore } from '../../../core/store/usePipelineStore';
import { createToolStore } from '../../../core/store/useToolState';

const useBase64Store = createToolStore('base64-codec', {
  input: '',
  mode: 'encode' as 'encode' | 'decode',
});

export default function Base64Codec() {
  const { input, mode, setValues } = useBase64Store();
  const setInput = (val: string) => setValues({ input: val });
  const setMode = (val: 'encode' | 'decode') => setValues({ mode: val });
  
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { setPipelineData } = usePipelineStore();
  const navigate = useNavigate();

  // Check for pipelined data on mount
  useEffect(() => {
    const pipedData = usePipelineStore.getState().consumePipelineData();
    if (pipedData) {
      setMode('encode');
      setInput(pipedData);
    }
  }, []);

  useEffect(() => {
    setError(null);
    if (!input) {
      setOutput('');
      return;
    }

    try {
      if (mode === 'encode') {
        // Encode (handles utf-8 correctly via encodeURIComponent)
        const encoded = btoa(unescape(encodeURIComponent(input)));
        setOutput(encoded);
      } else {
        // Decode
        const decoded = decodeURIComponent(escape(atob(input)));
        setOutput(decoded);
      }
    } catch (err) {
      setError(mode === 'decode' ? 'Invalid Base64 string' : 'Encoding error');
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setInput(result);
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  // Check if output is a valid JSON payload for smart pipelining
  const isValidJson = (() => {
    if (mode !== 'decode' || !output.trim()) return false;
    try {
      const parsed = JSON.parse(output);
      return typeof parsed === 'object' && parsed !== null;
    } catch {
      return false;
    }
  })();

  const handlePipelineToJson = () => {
    setPipelineData(output);
    navigate({ to: '/json-toolkit' as any });
  };

  return (
    <div className="flex-1 flex flex-col items-center p-4 sm:p-6 md:p-8 xl:p-10 2xl:p-12 3xl:p-16 w-full max-w-6xl 2xl:max-w-7xl 3xl:max-w-[1440px] mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)]">
          <Binary className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)]">Base64 Encode/Decode</h1>
          <p className="text-[var(--zd-text-secondary)]">Convert text to and from Base64 encoding</p>
        </div>
      </div>

      <div className="w-full flex flex-col flex-1 min-h-0 bg-[var(--zd-surface)] rounded-2xl border border-[var(--zd-border)] shadow-[var(--zd-shadow-md)] overflow-hidden">
        {/* Controls */}
        <div className="p-4 border-b border-[var(--zd-border)] flex items-center justify-between bg-[var(--zd-surface-raised)]/30 shrink-0">
          <div className="flex items-center gap-1 bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] p-1 rounded-lg">
            <button
              onClick={() => { setMode('encode'); setInput(output); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'encode' 
                  ? 'bg-[var(--zd-surface)] text-[var(--zd-primary)] border border-[var(--zd-border)]/50 shadow-sm' 
                  : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]'
              }`}
            >
              Encode
            </button>
            <button
              onClick={() => { setMode('decode'); setInput(output); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                mode === 'decode' 
                  ? 'bg-[var(--zd-surface)] text-[var(--zd-primary)] border border-[var(--zd-border)]/50 shadow-sm' 
                  : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)]'
              }`}
            >
              Decode
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] rounded-md transition-colors">
              <Upload className="w-4 h-4" />
              Upload Text File
              <input type="file" accept=".txt,.json,.md,.csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 relative">
          {/* Input */}
          <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-[var(--zd-border)] relative min-h-[200px]">
            <div className="px-4 py-2 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
              <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">
                {mode === 'encode' ? 'Plain Text' : 'Base64 String'}
              </span>
              {input && (
                <button onClick={() => setInput('')} className="text-xs text-slate-400 hover:text-[var(--zd-primary)] transition-colors">Clear</button>
              )}
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter Base64 to decode...'}
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
              className="p-2 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-full shadow-sm text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] hover:bg-[var(--zd-primary-soft)] transition-colors"
              title="Swap"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Output */}
          <div className="flex-1 flex flex-col relative bg-[var(--zd-surface-raised)]/20 min-h-[200px]">
            <div className="px-4 py-2 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
              <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">
                {mode === 'encode' ? 'Base64 String' : 'Plain Text'}
              </span>
              
              <div className="flex items-center gap-3">
                {output && isValidJson && (
                  <button 
                    onClick={handlePipelineToJson}
                    className="text-xs text-[var(--zd-primary)] hover:text-[var(--zd-primary)]/80 flex items-center gap-1.5 font-semibold transition-colors"
                    title="Send payload to JSON Formatter tool"
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Pipeline to JSON
                  </button>
                )}
                {output && (
                  <button onClick={copyToClipboard} className="text-xs text-[var(--zd-text-muted)] hover:text-[var(--zd-primary)] flex items-center gap-1 transition-colors">
                    {copied ? <Check className="w-3 h-3 text-[var(--zd-accent)]" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
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
                className="flex-1 w-full p-4 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm font-mono text-[var(--zd-text-primary)]"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
