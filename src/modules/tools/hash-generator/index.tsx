import { useState, useEffect } from 'react';
import { KeyRound, ShieldCheck, Sparkles, Hash } from 'lucide-react';
import { CodePanel } from '../../../shared/components/CodePanel';
import { ToolPage, ToolHeader, ToolWorkspace, SplitPanels, ToolEmbedFrame } from '../../../shared/components/ToolLayout';
import { useToolEmbed } from '../../../shared/context/ToolEmbedContext';
import { StatCard, Badge } from '../../../shared/components/ui';
import { useConverterShortcuts } from '../../../shared/hooks/useConverterShortcuts';
import { createToolStore } from '../../../core/store/useToolState';
import { useSyncToolUrl } from '../../../shared/hooks/useSyncToolUrl';

interface HashState {
  input: string;
  secret: string;
  isHmac: boolean;
}

const useHashStore = createToolStore<HashState>('hash-generator', {
  input: 'Hello World',
  secret: '',
  isHmac: false,
});

export default function HashGenerator() {
  const { input, secret, isHmac, setValues } = useHashStore();
  const setInput = (val: string) => setValues({ input: val });
  const setSecret = (val: string) => setValues({ secret: val });
  const setIsHmac = (val: boolean) => setValues({ isHmac: val });

  useSyncToolUrl(() => ({ input, secret, isHmac }), setValues, [input, secret, isHmac]);

  const [hashes, setHashes] = useState<Record<string, string>>({});

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
        const algos = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
        for (const algo of algos) {
          const hashBuffer = await crypto.subtle.digest(algo, data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          results[algo] = hashHex;
        }
      }
      setHashes(results);
    } catch (err) {
      console.error(err);
    }
  };

  const hashOutput = Object.entries(hashes)
    .map(([algo, hash]) => `${algo}: ${hash}`)
    .join('\n');

  useConverterShortcuts({
    onClear: () => setInput(''),
    output: hashOutput,
  });

  const embedded = useToolEmbed();

  const panels = (
        <SplitPanels>
          <div className="zd-tool-fill min-w-0 border-b md:border-b-0 md:border-r border-[var(--zd-border)]">
            <CodePanel
              title="Input Payload"
              subtitle={`${input.length} chars`}
              useTextarea
              value={input}
              onChange={setInput}
              placeholder="Enter text string or payload to generate hashes..."
              borderBottom={false}
            />

            <div className="bg-[var(--zd-surface)] border-t border-[var(--zd-border)] p-4 flex flex-col gap-4 shrink-0">
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
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--zd-border)]/60">
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
                </div>
              )}
            </div>
          </div>

          <CodePanel
            title="Cryptographic Digests"
            subtitle={`${Object.keys(hashes).length} active outputs`}
            readOnly
            contentClassName="overflow-y-auto custom-scrollbar"
          >
            <div className="p-4 flex flex-col gap-4">
              {Object.entries(hashes).map(([algo, hash]) => (
                <div key={algo}>
                  <StatCard label={algo} value={hash} copyable className="!text-sm">
                    <span className="text-[11px] font-mono text-[var(--zd-text-muted)]">
                      {hash.length * 4}-bit
                    </span>
                  </StatCard>
                </div>
              ))}

              {Object.keys(hashes).length === 0 && (
                <div className="flex flex-col items-center justify-center text-[var(--zd-text-muted)] gap-3 py-12">
                  <div className="w-12 h-12 rounded-full bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-[var(--zd-text-muted)]" />
                  </div>
                  <span className="text-sm font-medium">Enter text or payload above to compute cryptographic hashes</span>
                </div>
              )}
            </div>
          </CodePanel>
        </SplitPanels>
  );

  if (embedded) return <ToolEmbedFrame>{panels}</ToolEmbedFrame>;

  return (
    <ToolPage>
      <ToolHeader
        icon={Hash}
        title="Hash & HMAC Generator"
        description="Generate secure digests and message authentication signatures locally in-browser."
        badges={<Badge>Web Crypto</Badge>}
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--zd-surface)] border border-[var(--zd-border)] text-xs font-medium text-[var(--zd-text-secondary)] shadow-sm">
            <ShieldCheck className="w-4 h-4 text-[var(--zd-accent)]" />
            <span>100% Client-Side</span>
          </div>
        }
      />
      <ToolWorkspace>{panels}</ToolWorkspace>
    </ToolPage>
  );
}
