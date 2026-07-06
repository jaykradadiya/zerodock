import { useState, useEffect } from 'react';
import { Copy, KeyRound, ShieldCheck, Check, Sparkles, Hash } from 'lucide-react';
import { usePreferenceStore } from '../../../core/store/usePreferenceStore';
import { useHistoryStore } from '../../../core/store/useHistoryStore';
import { playSound } from '../../../shared/utils/sound';
import { motion } from 'framer-motion';

export default function HashGenerator() {
  const [input, setInput] = useState('Hello World');
  const [secret, setSecret] = useState('');
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [isHmac, setIsHmac] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    generateHashes();
  }, [input, secret, isHmac]);

  const generateHashes = async () => {
    if (!input) {
      setHashes({});
      return;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const results: Record<string, string> = {};

      if (isHmac && secret) {
        // HMAC Generation
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          encoder.encode(secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', keyMaterial, data);
        results['HMAC (SHA-256)'] = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        // Standard Hashes
        const algos = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
        for (const algo of algos) {
          const hashBuffer = await crypto.subtle.digest(algo, data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          results[algo] = hashHex;
        }
      }
      setHashes(results);
      
      if (input && input !== 'Hello World') {
        const previewText = results['SHA-256'] || results['HMAC (SHA-256)'] || Object.values(results)[0];
        useHistoryStore.getState().addHistoryItem({
          toolId: 'hash-generator',
          toolName: 'Hash & HMAC Generator',
          action: isHmac ? 'Computed HMAC' : 'Generated Cryptographic Hashes',
          preview: previewText ? `${previewText.substring(0, 24)}...` : undefined,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };


  const handleCopy = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    if (usePreferenceStore.getState().soundEnabled) playSound('tick');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8 xl:p-10 2xl:p-12 3xl:p-16 w-full max-w-6xl 2xl:max-w-7xl 3xl:max-w-[1440px] mx-auto h-full min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] border border-[var(--zd-primary)]/30 flex items-center justify-center text-[var(--zd-primary)] shadow-sm shrink-0">
            <Hash className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)] tracking-tight m-0">Hash & HMAC Generator</h1>
              <span className="px-2 py-0.5 rounded-full bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] text-[10px] font-mono text-[var(--zd-text-muted)] uppercase">Web Crypto</span>
            </div>
            <p className="text-sm text-[var(--zd-text-secondary)] mt-1 m-0">Generate secure digests and message authentication signatures locally in-browser.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--zd-surface)] border border-[var(--zd-border)] text-xs font-medium text-[var(--zd-text-secondary)] shadow-sm">
            <ShieldCheck className="w-4 h-4 text-[var(--zd-accent)]" />
            <span>100% Client-Side</span>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Input Panel (Left column on large screens) */}
        <div className="lg:col-span-5 flex flex-col gap-5 min-h-0">
          <div className="flex-1 flex flex-col bg-[var(--zd-surface)] rounded-2xl border border-[var(--zd-border)] shadow-sm overflow-hidden min-h-[220px]">
            <div className="px-5 py-3.5 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--zd-text-primary)]">Input Payload</span>
              </div>
              <span className="text-xs font-mono text-[var(--zd-text-muted)]">{input.length} chars</span>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 w-full p-5 bg-transparent resize-none outline-none text-[var(--zd-text-primary)] text-sm font-mono custom-scrollbar"
              placeholder="Enter text string or payload to generate hashes..."
              spellCheck={false}
            />
          </div>

          {/* HMAC Toggle Card */}
          <div className="bg-[var(--zd-surface)] rounded-2xl border border-[var(--zd-border)] p-5 flex flex-col gap-4 shrink-0 shadow-sm transition-colors hover:border-[var(--zd-border-hover)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[var(--zd-text-primary)]">HMAC Mode</span>
                <span className="text-xs text-[var(--zd-text-secondary)]">Hash-based Message Authentication Code</span>
              </div>
              <button
                type="button"
                onClick={() => setIsHmac(!isHmac)}
                aria-label="Toggle HMAC Mode"
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer border ${
                  isHmac ? 'bg-[var(--zd-primary)] border-[var(--zd-primary)]' : 'bg-[var(--zd-surface-raised)] border-[var(--zd-border)]'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${isHmac ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {isHmac && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-2 pt-2 border-t border-[var(--zd-border)]/60"
              >
                <label className="text-xs font-mono text-[var(--zd-text-secondary)]">Secret Key</label>
                <div className="relative">
                  <input
                    type="text"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Enter passphrase or cryptographic secret..."
                    className="w-full bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-xl px-4 py-2.5 text-sm font-mono text-[var(--zd-text-primary)] outline-none focus:border-[var(--zd-primary)] focus:ring-1 focus:ring-[var(--zd-primary)] transition-all"
                  />
                  <KeyRound className="w-4 h-4 text-[var(--zd-text-muted)] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Output Panel (Right column on large screens) */}
        <div className="lg:col-span-7 flex flex-col bg-[var(--zd-surface)] rounded-2xl border border-[var(--zd-border)] shadow-sm overflow-hidden min-h-[350px]">
          <div className="px-5 py-3.5 bg-[var(--zd-surface-raised)]/50 border-b border-[var(--zd-border)] flex items-center justify-between shrink-0">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--zd-text-primary)]">Cryptographic Digests</span>
            <span className="text-xs font-mono text-[var(--zd-text-muted)]">{Object.keys(hashes).length} active outputs</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 custom-scrollbar">
            {Object.entries(hashes).map(([algo, hash]) => (
              <motion.div
                key={algo}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-2 p-4 rounded-xl bg-[var(--zd-bg)] border border-[var(--zd-border)] hover:border-[var(--zd-border-hover)] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[var(--zd-primary)] bg-[var(--zd-primary-soft)] px-2 py-0.5 rounded border border-[var(--zd-primary)]/20 uppercase tracking-wider">
                      {algo}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--zd-text-muted)]">
                      {hash.length * 4}-bit
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(algo, hash)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--zd-surface)] hover:bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] text-xs font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    {copiedKey === algo ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--zd-accent)]" />
                        <span className="text-[var(--zd-accent)]">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[var(--zd-text-muted)] group-hover:text-[var(--zd-text-secondary)]" />
                        <span>Copy Hex</span>
                      </>
                    )}
                  </button>
                </div>
                
                <div className="font-mono text-xs sm:text-sm text-[var(--zd-text-primary)] break-all leading-relaxed select-all pt-1">
                  {hash}
                </div>
              </motion.div>
            ))}

            {Object.keys(hashes).length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-[var(--zd-text-muted)] gap-3 py-12">
                <div className="w-12 h-12 rounded-full bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-[var(--zd-text-muted)]" />
                </div>
                <span className="text-sm font-medium">Enter text or payload above to compute cryptographic hashes</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
