import { useState, useEffect } from 'react';
import { Key, Download, Copy, Check, RefreshCw, ShieldCheck, Lock } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';
import { exportToFile } from '../../../shared/utils/export';
import { useHistoryStore } from '../../../core/store/useHistoryStore';
import { motion } from 'framer-motion';

interface RSAState {
  modulusLength: number;
}

const useRSAStore = createToolStore<RSAState>('rsa-generator', {
  modulusLength: 2048,
});

export default function RSAGenerator() {
  const { modulusLength, setValues } = useRSAStore();
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [pubCopied, setPubCopied] = useState(false);
  const [privCopied, setPrivCopied] = useState(false);

  // Restore state from URL on mount
  useEffect(() => {
    const urlState = getStateFromURL<RSAState>();
    if (urlState && urlState.modulusLength) {
      setValues(urlState);
    }
  }, []);

  const updateState = (updates: Partial<RSAState>) => {
    setValues(updates);
    const newState = { modulusLength, ...updates };
    updateURLWithState(newState);
  };

  const generateKeys = async () => {
    setIsGenerating(true);
    // Yield to let UI update before heavy operation
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: modulusLength,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
      );

      const exportedPublicKey = await window.crypto.subtle.exportKey(
        'spki',
        keyPair.publicKey
      );
      const exportedPrivateKey = await window.crypto.subtle.exportKey(
        'pkcs8',
        keyPair.privateKey
      );

      const exportKeyAsPEM = (keyBuffer: ArrayBuffer, type: 'PUBLIC KEY' | 'PRIVATE KEY') => {
        const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(keyBuffer) as unknown as number[]);
        const exportedAsBase64 = window.btoa(exportedAsString);
        const pemExported = `-----BEGIN ${type}-----\n${exportedAsBase64.match(/.{1,64}/g)?.join('\n')}\n-----END ${type}-----`;
        return pemExported;
      };

      const pubPem = exportKeyAsPEM(exportedPublicKey, 'PUBLIC KEY');
      const privPem = exportKeyAsPEM(exportedPrivateKey, 'PRIVATE KEY');
      setPublicKey(pubPem);
      setPrivateKey(privPem);
      
      useHistoryStore.getState().addHistoryItem({
        toolId: 'rsa-generator',
        toolName: 'RSA Key Pair Generator',
        action: `Generated ${modulusLength}-bit Keypair`,
        preview: pubPem.split('\n')[1]?.substring(0, 24) + '...',
      });
    } catch (err) {
      console.error('Failed to generate keys', err);
    } finally {
      setIsGenerating(false);
    }
  };


  const copyToClipboard = async (text: string, type: 'pub' | 'priv') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'pub') {
        setPubCopied(true);
        setTimeout(() => setPubCopied(false), 2000);
      } else {
        setPrivCopied(true);
        setTimeout(() => setPrivCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 sm:p-6 md:p-8 xl:p-10 2xl:p-12 3xl:p-16 w-full max-w-6xl 2xl:max-w-7xl 3xl:max-w-[1440px] mx-auto h-full min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] border border-[var(--zd-primary)]/30 flex items-center justify-center text-[var(--zd-primary)] shadow-sm shrink-0">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)] tracking-tight m-0">RSA Key Pair Generator</h1>
              <span className="px-2 py-0.5 rounded-full bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] text-[10px] font-mono text-[var(--zd-text-muted)] uppercase">PKCS#8 / SPKI</span>
            </div>
            <p className="text-sm text-[var(--zd-text-secondary)] mt-1 m-0">Generate industrial-grade RSA public and private key pairs locally using Web Crypto API.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--zd-surface)] border border-[var(--zd-border)] text-xs font-medium text-[var(--zd-text-secondary)] shadow-sm">
            <ShieldCheck className="w-4 h-4 text-[var(--zd-accent)]" />
            <span>100% Client-Side</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full flex flex-col flex-1 min-h-0 bg-[var(--zd-surface)] rounded-2xl border border-[var(--zd-border)] shadow-sm overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="p-5 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--zd-text-secondary)]">Key Modulus Size</label>
            <div className="flex items-center bg-[var(--zd-surface)] border border-[var(--zd-border)] p-1 rounded-xl">
              {[1024, 2048, 4096].map(size => (
                <button
                  key={size}
                  onClick={() => updateState({ modulusLength: size })}
                  className={`px-4 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                    modulusLength === size 
                      ? 'bg-[var(--zd-primary)] text-white shadow-xs' 
                      : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface-raised)]'
                  }`}
                >
                  {size}-bit
                </button>
              ))}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generateKeys}
            disabled={isGenerating}
            className="px-6 py-2.5 bg-gradient-to-r from-[var(--zd-primary)] to-[#6C5CE7] hover:opacity-95 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(139,124,247,0.3)] cursor-pointer"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            {isGenerating ? 'Computing Prime Factors...' : 'Generate New Keypair'}
          </motion.button>
        </div>

        {/* Key Panels Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-[420px] divide-y md:divide-y-0 md:divide-x divide-[var(--zd-border)]">
          
          {/* Public Key Panel */}
          <div className="flex flex-col relative bg-[var(--zd-bg)]/50">
            <div className="px-5 py-3.5 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--zd-primary)]">Public Key</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] text-[var(--zd-text-muted)]">PEM / SPKI</span>
              </div>
              {publicKey && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => exportToFile(publicKey, 'public.pem', 'application/x-pem-file')}
                    className="px-2.5 py-1 rounded-lg bg-[var(--zd-surface-raised)] hover:bg-[var(--zd-border)] text-xs font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer border border-[var(--zd-border)]"
                  >
                    <Download className="w-3.5 h-3.5" /> 
                    <span>PEM</span>
                  </button>
                  <button 
                    onClick={() => copyToClipboard(publicKey, 'pub')} 
                    className="px-2.5 py-1 rounded-lg bg-[var(--zd-surface-raised)] hover:bg-[var(--zd-border)] text-xs font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer border border-[var(--zd-border)]"
                  >
                    {pubCopied ? <Check className="w-3.5 h-3.5 text-[var(--zd-accent)]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className={pubCopied ? 'text-[var(--zd-accent)]' : ''}>{pubCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>
            <textarea
              value={publicKey}
              readOnly
              placeholder="Click 'Generate New Keypair' to compute RSA public key..."
              className="flex-1 w-full p-6 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-xs sm:text-[13px] font-mono text-[var(--zd-text-primary)] whitespace-pre leading-relaxed custom-scrollbar selection:bg-[var(--zd-primary)]/30"
              spellCheck={false}
            />
          </div>

          {/* Private Key Panel */}
          <div className="flex flex-col relative bg-[var(--zd-bg)]/50">
            <div className="px-5 py-3.5 bg-[var(--zd-surface)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FF6B6B]">Private Key</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 text-[10px] font-mono font-bold text-[#FF6B6B]">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Confidential</span>
                </span>
              </div>
              {privateKey && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => exportToFile(privateKey, 'private.pem', 'application/x-pem-file')}
                    className="px-2.5 py-1 rounded-lg bg-[var(--zd-surface-raised)] hover:bg-[var(--zd-border)] text-xs font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer border border-[var(--zd-border)]"
                  >
                    <Download className="w-3.5 h-3.5" /> 
                    <span>PEM</span>
                  </button>
                  <button 
                    onClick={() => copyToClipboard(privateKey, 'priv')} 
                    className="px-2.5 py-1 rounded-lg bg-[var(--zd-surface-raised)] hover:bg-[var(--zd-border)] text-xs font-medium text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer border border-[var(--zd-border)]"
                  >
                    {privCopied ? <Check className="w-3.5 h-3.5 text-[var(--zd-accent)]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className={privCopied ? 'text-[var(--zd-accent)]' : ''}>{privCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>
            <textarea
              value={privateKey}
              readOnly
              placeholder="Private key (PKCS#8 PEM format) will appear here..."
              className="flex-1 w-full p-6 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-xs sm:text-[13px] font-mono text-[var(--zd-text-primary)] whitespace-pre leading-relaxed custom-scrollbar selection:bg-[#FF6B6B]/30"
              spellCheck={false}
            />
          </div>
          
        </div>
      </div>
    </div>
  );
}
