import { useEffect, useRef } from 'react';
import { QrCode, Download } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeState {
  input: string;
  fgColor: string;
  bgColor: string;
  size: number;
}

const useQRCodeStore = createToolStore<QRCodeState>('qrcode-generator', {
  input: 'https://zerodock.jayradadiya.workers.dev',
  fgColor: '#000000',
  bgColor: '#ffffff',
  size: 256,
});

export default function QRCodeGenerator() {
  const { input, fgColor, bgColor, size, setValues } = useQRCodeStore();
  const svgRef = useRef<SVGSVGElement>(null);

  // Restore state from URL on mount
  useEffect(() => {
    const urlState = getStateFromURL<QRCodeState>();
    if (urlState && urlState.input) {
      setValues(urlState);
    }
  }, []);

  const updateState = (updates: Partial<QRCodeState>) => {
    setValues(updates);
    const newState = { input, fgColor, bgColor, size, ...updates };
    updateURLWithState(newState);
  };

  const downloadQRCode = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = 'qrcode.png';
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="flex-1 flex flex-col items-center p-4 sm:p-6 md:p-8 xl:p-10 2xl:p-12 w-full max-w-4xl 2xl:max-w-5xl mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)]">
          <QrCode className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)]">QR Code Generator</h1>
          <p className="text-[var(--zd-text-secondary)]">Convert text, URLs, and data into scannable QR codes</p>
        </div>
      </div>

      <div className="w-full grid md:grid-cols-2 gap-8 flex-1 min-h-0">
        
        {/* Controls */}
        <div className="flex flex-col gap-6 bg-[var(--zd-bg)] rounded-2xl border border-[var(--zd-border)] shadow-sm p-6">
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--zd-text-secondary)]">Content</label>
            <textarea
              value={input}
              onChange={(e) => updateState({ input: e.target.value })}
              placeholder="Enter URL or text..."
              className="w-full p-4 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-xl resize-none h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-mono text-[var(--zd-text-primary)]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-[var(--zd-text-secondary)]">Size (px)</label>
              <span className="text-sm font-mono text-[var(--zd-text-muted)] bg-[var(--zd-surface-raised)] px-2 py-1 rounded-md">{size}</span>
            </div>
            <input
              type="range"
              min="128"
              max="1024"
              step="8"
              value={size}
              onChange={(e) => updateState({ size: parseInt(e.target.value, 10) })}
              className="w-full accent-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--zd-text-secondary)]">Foreground</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => updateState({ fgColor: e.target.value })}
                  className="w-10 h-10 rounded border border-[var(--zd-border)] cursor-pointer"
                />
                <input
                  type="text"
                  value={fgColor}
                  onChange={(e) => updateState({ fgColor: e.target.value })}
                  className="flex-1 p-2 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-lg text-sm font-mono focus:outline-none text-[var(--zd-text-primary)] uppercase"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-[var(--zd-text-secondary)]">Background</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => updateState({ bgColor: e.target.value })}
                  className="w-10 h-10 rounded border border-[var(--zd-border)] cursor-pointer"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => updateState({ bgColor: e.target.value })}
                  className="flex-1 p-2 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-lg text-sm font-mono focus:outline-none text-[var(--zd-text-primary)] uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex flex-col bg-[var(--zd-bg)] rounded-2xl border border-[var(--zd-border)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--zd-border)] flex justify-between items-center bg-[var(--zd-surface)] shrink-0">
            <span className="text-sm font-semibold text-[var(--zd-text-secondary)]">Preview</span>
            <button
              onClick={downloadQRCode}
              disabled={!input.trim()}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download PNG
            </button>
          </div>
          
          <div className="flex-1 p-8 flex items-center justify-center bg-slate-50/30 dark:bg-slate-950/30 overflow-auto">
            {input.trim() ? (
              <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200" style={{ backgroundColor: bgColor }}>
                <QRCodeSVG
                  value={input}
                  size={Math.min(size, 300)} // Visual size maxed for preview
                  bgColor={bgColor}
                  fgColor={fgColor}
                  level="H"
                  includeMargin={false}
                  ref={svgRef}
                  style={{ width: '100%', height: '100%', maxWidth: '300px' }}
                />
                {/* Hidden SVG for actual download size rendering */}
                <div style={{ display: 'none' }}>
                  <QRCodeSVG
                    value={input}
                    size={size}
                    bgColor={bgColor}
                    fgColor={fgColor}
                    level="H"
                    includeMargin={true}
                    ref={svgRef}
                  />
                </div>
              </div>
            ) : (
              <div className="text-slate-400 dark:text-slate-600 text-sm text-center">
                Enter content to generate a QR Code
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
