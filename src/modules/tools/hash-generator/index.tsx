import { useState, useEffect } from 'react';
import { Hash, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
const ALGORITHMS: HashAlgorithm[] = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

export default function HashGenerator() {
  const [input, setInput] = useState('');
  const [hashes, setHashes] = useState<Record<HashAlgorithm, string>>({
    'SHA-1': '',
    'SHA-256': '',
    'SHA-384': '',
    'SHA-512': ''
  });
  const [copiedKey, setCopiedKey] = useState<HashAlgorithm | null>(null);

  useEffect(() => {
    if (!input) {
      setHashes({
        'SHA-1': '',
        'SHA-256': '',
        'SHA-384': '',
        'SHA-512': ''
      });
      return;
    }

    const computeHashes = async () => {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      
      const results = await Promise.all(
        ALGORITHMS.map(async (algo) => {
          const hashBuffer = await crypto.subtle.digest(algo, data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          return [algo, hashHex] as [HashAlgorithm, string];
        })
      );

      const newHashes = Object.fromEntries(results) as Record<HashAlgorithm, string>;
      setHashes(newHashes);
    };

    computeHashes();
  }, [input]);

  const copyToClipboard = async (text: string, key: HashAlgorithm) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-6 md:p-12 w-full max-w-4xl mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Hash className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Hash Generator</h1>
          <p className="text-slate-500 dark:text-slate-400">Generate secure cryptographic hashes instantly</p>
        </div>
      </div>

      <div className="w-full flex flex-col flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Input */}
        <div className="flex-col border-b border-slate-200 dark:border-slate-800 relative min-h-[160px] shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-transparent">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Input Text</span>
            {input && (
              <button onClick={() => setInput('')} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">Clear</button>
            )}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste text to hash..."
            className="w-full h-[120px] p-4 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Output */}
        <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-950">
          <div className="space-y-4">
            {ALGORITHMS.map((algo, index) => (
              <motion.div
                key={algo}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
              >
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{algo}</span>
                  <button
                    onClick={() => copyToClipboard(hashes[algo], algo)}
                    disabled={!hashes[algo]}
                    className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-md disabled:opacity-50"
                    title={`Copy ${algo} hash`}
                  >
                    {copiedKey === algo ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="p-4">
                  <p className="text-sm font-mono text-slate-600 dark:text-slate-400 break-all select-all">
                    {hashes[algo] || <span className="text-slate-300 dark:text-slate-700 italic">Waiting for input...</span>}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
