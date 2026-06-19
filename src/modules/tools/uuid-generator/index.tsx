import { useState, useCallback } from 'react';
import { Fingerprint, Copy, RefreshCw, Check } from 'lucide-react';
import { motion } from 'framer-motion';

type UUIDVersion = 'v4' | 'v7';

// Basic UUIDv7 Implementation
function generateUUIDv7(): string {
  const time = Date.now();
  const timeHex = time.toString(16).padStart(12, '0');
  const rand = new Uint8Array(10);
  crypto.getRandomValues(rand);
  
  const randHex = Array.from(rand)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // 12 chars time, 4 chars (version 7 + rand), 4 chars (variant 10 + rand), 12 chars rand
  return `${timeHex.slice(0, 8)}-${timeHex.slice(8, 12)}-7${randHex.slice(1, 4)}-${((parseInt(randHex.slice(4, 5), 16) & 0x3) | 0x8).toString(16)}${randHex.slice(5, 8)}-${randHex.slice(8, 20)}`;
}

export default function UUIDGenerator() {
  const [version, setVersion] = useState<UUIDVersion>('v4');
  const [count, setCount] = useState<number>(5);
  const [uuids, setUuids] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateUUIDs = useCallback(() => {
    const newUuids = Array.from({ length: count }, () => {
      if (version === 'v4') {
        return crypto.randomUUID();
      } else {
        return generateUUIDv7();
      }
    });
    setUuids(newUuids);
    setCopiedIndex(null);
  }, [version, count]);

  // Initial generation
  useState(() => {
    generateUUIDs();
  });

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(uuids.join('\n'));
      setCopiedIndex(-1);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-6 md:p-12 w-full max-w-4xl mx-auto">
      <div className="w-full flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Fingerprint className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">UUID Generator</h1>
          <p className="text-slate-500 dark:text-slate-400">Generate universally unique identifiers</p>
        </div>
      </div>

      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        {/* Controls */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-6 items-end bg-slate-50/50 dark:bg-slate-900/50">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Version</label>
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {(['v4', 'v7'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => { setVersion(v); setTimeout(generateUUIDs, 0); }}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    version === v 
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {v.toUpperCase()} {v === 'v4' && '(Random)'} {v === 'v7' && '(Time-based)'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Quantity</label>
            <input
              type="number"
              min="1"
              max="100"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              className="block w-24 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={generateUUIDs}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Generate
          </button>
        </div>

        {/* Results */}
        <div className="p-6 flex-1 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Results</h2>
            <button
              onClick={copyAll}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              {copiedIndex === -1 ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedIndex === -1 ? 'Copied All' : 'Copy All'}
            </button>
          </div>
          <div className="space-y-2">
            {uuids.map((uuid, i) => (
              <motion.div
                key={`${uuid}-${i}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="group flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <code className="text-sm md:text-base font-mono text-slate-800 dark:text-slate-200 tracking-tight">
                  {uuid}
                </code>
                <button
                  onClick={() => copyToClipboard(uuid, i)}
                  className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30"
                  title="Copy"
                >
                  {copiedIndex === i ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
