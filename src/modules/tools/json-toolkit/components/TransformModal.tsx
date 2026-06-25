import { useState, useEffect, useRef } from 'react';
import { X, Play, Code2, Database } from 'lucide-react';
import { CodeEditor } from '../../../../shared/components/CodeEditor';
import type { WorkerMessage } from '../../../../workers/base.worker';
import TransformWorker from '../transform.worker.ts?worker';

interface TransformModalProps {
  input: string;
  isOpen: boolean;
  onClose: () => void;
  onApply: (result: string) => void;
}

export function TransformModal({ input, isOpen, onClose, onApply }: TransformModalProps) {
  const [type, setType] = useState<'jmespath' | 'javascript'>('jmespath');
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    workerRef.current = new TransformWorker();
    
    workerRef.current.onmessage = (e: MessageEvent<WorkerMessage>) => {
      setIsProcessing(false);
      if (e.data.type === 'SUCCESS') {
        setPreview(e.data.payload);
        setError(null);
      } else if (e.data.type === 'ERROR') {
        setError(e.data.payload.message);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !input.trim()) return;
    
    // Auto-run query if valid
    if (!query.trim()) {
      setPreview('');
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      setIsProcessing(true);
      workerRef.current?.postMessage({
        id: crypto.randomUUID(),
        type: 'PROCESS',
        payload: { document: input, query, type }
      });
    }, 500); // debounce

    return () => clearTimeout(timer);
  }, [query, type, input, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Transform Data</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Query and manipulate your JSON using JMESPath or JavaScript.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* Left Column: Input */}
          <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center gap-2">
              <button
                onClick={() => { setType('jmespath'); setQuery(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${type === 'jmespath' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
              >
                <Database className="w-4 h-4" />
                JMESPath
              </button>
              <button
                onClick={() => { setType('javascript'); setQuery('return data;'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${type === 'javascript' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
              >
                <Code2 className="w-4 h-4" />
                JavaScript
              </button>
            </div>
            
            <div className="p-4 flex-1 flex flex-col gap-2 shrink-0 min-h-[150px]">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {type === 'jmespath' ? 'JMESPath Query' : 'JavaScript Expression'}
              </label>
              <textarea
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={type === 'jmespath' ? 'e.g. users[?age > `20`].name' : 'e.g. return data.filter(u => u.age > 20).map(u => u.name);'}
                className="flex-1 w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 font-mono text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              />
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 min-w-[300px]">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                Preview
                {isProcessing && <span className="text-xs text-blue-500 animate-pulse">(computing...)</span>}
              </span>
            </div>
            <div className="flex-1 min-h-0 relative">
              {error ? (
                <div className="absolute inset-0 p-4 overflow-auto">
                  <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800/40">
                    <span className="font-semibold block mb-1">Error executing query:</span>
                    <span className="font-mono">{error}</span>
                  </div>
                </div>
              ) : preview ? (
                <CodeEditor value={preview} readOnly language="json" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm p-8 text-center">
                  Enter a query to preview the transformed data.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 shrink-0 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(preview)}
            disabled={!preview || !!error || isProcessing}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-500/20"
          >
            <Play className="w-4 h-4" />
            Apply to Input
          </button>
        </div>

      </div>
    </div>
  );
}
