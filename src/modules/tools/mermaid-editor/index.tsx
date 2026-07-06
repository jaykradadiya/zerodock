import { useState, useEffect, useRef } from 'react';
import { Share2, Download, Code2, LayoutDashboard } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';
import mermaid from 'mermaid';

interface MermaidState {
  code: string;
}

const defaultCode = `graph TD
    A[Client] -->|HTTP GET| B(API Gateway)
    B --> C{Load Balancer}
    C -->|One| D[Service A]
    C -->|Two| E[Service B]
    D --> F[(Database)]
    E --> F`;

const useMermaidStore = createToolStore<MermaidState>('mermaid-editor', {
  code: defaultCode,
});

export default function MermaidEditor() {
  const { code, setValues } = useMermaidStore();
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const urlState = getStateFromURL<MermaidState>();
    if (urlState && urlState.code) {
      setValues(urlState);
    }
    
    mermaid.initialize({
      startOnLoad: false,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
      securityLevel: 'loose',
    });
  }, []);

  const updateState = (updates: Partial<MermaidState>) => {
    setValues(updates);
    updateURLWithState({ code, ...updates });
  };

  useEffect(() => {
    let isMounted = true;

    const renderDiagram = async () => {
      if (!code.trim()) {
        setSvgContent('');
        setError(null);
        return;
      }

      try {
        // Generate a random ID for the SVG to prevent DOM conflicts during fast re-renders
        const id = `mermaid-svg-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        
        if (isMounted) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Syntax error in Mermaid code');
        }
      }
    };

    // Debounce rendering slightly to prevent stuttering on every keystroke
    const timeoutId = setTimeout(renderDiagram, 300);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [code]);

  const downloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'architecture.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col items-center p-6 md:p-12 w-full max-w-[90rem] mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)]">
          <Share2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)]">Mermaid.js Playground</h1>
          <p className="text-[var(--zd-text-secondary)]">Design architecture diagrams and flowcharts as code</p>
        </div>
      </div>

      <div className="w-full flex flex-col md:flex-row flex-1 min-h-0 bg-[var(--zd-bg)] rounded-2xl border border-[var(--zd-border)] shadow-sm overflow-hidden">
        
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-[var(--zd-border)] relative min-h-[300px]">
          <div className="px-4 py-2 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
            <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider flex items-center gap-2">
              <Code2 className="w-3 h-3" /> Mermaid Code
            </span>
          </div>
          <textarea
            value={code}
            onChange={(e) => updateState({ code: e.target.value })}
            className="flex-1 w-full p-4 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm font-mono text-[var(--zd-text-primary)] whitespace-pre leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* Preview Panel */}
        <div className="flex-1 flex flex-col relative bg-slate-50/50 dark:bg-slate-950/50 min-h-[400px]">
          <div className="px-4 py-2 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
            <span className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider flex items-center gap-2">
              <LayoutDashboard className="w-3 h-3" /> Preview
            </span>
            {svgContent && !error && (
              <button 
                onClick={downloadSvg}
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Download SVG
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center relative">
            {error ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
                <p className="text-red-500 dark:text-red-400 font-semibold mb-2">Syntax Error</p>
                <p className="text-xs text-red-400/80 font-mono whitespace-pre-wrap max-w-md text-left bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900/30">
                  {error}
                </p>
              </div>
            ) : (
              <div 
                ref={containerRef}
                className="w-full flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
