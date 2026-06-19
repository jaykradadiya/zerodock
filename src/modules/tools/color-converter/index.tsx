import { useState, useEffect } from 'react';
import { Palette, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

// Basic color conversion utilities
function hexToRgb(hex: string) {
  let h = hex.replace(/^#/, '');
  if (h.length === 3) h = h.split('').map(x => x + x).join('');
  const num = parseInt(h, 16);
  if (isNaN(num)) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, x)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export default function ColorConverter() {
  const [inputColor, setInputColor] = useState('#6c5ce7'); // Default ZeroDock primary
  const [rgb, setRgb] = useState({ r: 108, g: 92, b: 231 });
  const [hsl, setHsl] = useState({ h: 247, s: 71, l: 63 });
  
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Sync inputs when valid
  useEffect(() => {
    let parsedRgb = null;
    
    // Try parse as HEX
    if (inputColor.startsWith('#') || /^[0-9A-Fa-f]{3,6}$/.test(inputColor)) {
      parsedRgb = hexToRgb(inputColor);
    } else if (inputColor.startsWith('rgb')) {
      const match = inputColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        parsedRgb = { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
      }
    }

    if (parsedRgb) {
      setRgb(parsedRgb);
      setHsl(rgbToHsl(parsedRgb.r, parsedRgb.g, parsedRgb.b));
    }
  }, [inputColor]);

  // When color picker changes
  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHex = e.target.value;
    setInputColor(newHex);
  };

  const copyToClipboard = async (text: string, format: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const validHex = rgbToHex(rgb.r, rgb.g, rgb.b);
  const rgbString = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const hslString = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  return (
    <div className="flex-1 flex flex-col items-center p-6 md:p-12 w-full max-w-4xl mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Palette className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Color Converter</h1>
          <p className="text-slate-500 dark:text-slate-400">Convert colors between HEX, RGB, and HSL</p>
        </div>
      </div>

      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-0">
        
        {/* Left: Input & Preview */}
        <div className="p-8 md:w-1/2 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-950/50">
          
          <div 
            className="w-40 h-40 rounded-full shadow-lg border-4 border-white dark:border-slate-800 mb-8 relative overflow-hidden"
            style={{ backgroundColor: validHex }}
          >
            {/* Color input hidden inside preview */}
            <input 
              type="color" 
              value={validHex} 
              onChange={handlePickerChange}
              className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer opacity-0"
            />
          </div>

          <div className="w-full max-w-xs space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block text-center">Color Input</label>
            <input
              type="text"
              value={inputColor}
              onChange={(e) => setInputColor(e.target.value)}
              placeholder="#000000 or rgb(0,0,0)"
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono text-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            <p className="text-xs text-center text-slate-400 mt-2">Click the circle to open picker</p>
          </div>
        </div>

        {/* Right: Conversions */}
        <div className="p-8 md:w-1/2 flex flex-col justify-center space-y-6">
          <ConversionRow 
            label="HEX" 
            value={validHex.toUpperCase()} 
            copied={copiedFormat === 'hex'} 
            onCopy={() => copyToClipboard(validHex.toUpperCase(), 'hex')} 
          />
          <ConversionRow 
            label="RGB" 
            value={rgbString} 
            copied={copiedFormat === 'rgb'} 
            onCopy={() => copyToClipboard(rgbString, 'rgb')} 
          />
          <ConversionRow 
            label="HSL" 
            value={hslString} 
            copied={copiedFormat === 'hsl'} 
            onCopy={() => copyToClipboard(hslString, 'hsl')} 
          />
        </div>

      </div>
    </div>
  );
}

function ConversionRow({ label, value, copied, onCopy }: { label: string, value: string, copied: boolean, onCopy: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-1"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <button 
          onClick={onCopy}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700/50">
        <p className="font-mono text-slate-800 dark:text-slate-200 text-sm">{value}</p>
      </div>
    </motion.div>
  );
}
