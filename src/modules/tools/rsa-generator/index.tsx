import { useState, useEffect } from 'react';
import { Key, RefreshCw, ShieldCheck, Lock } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';
import { CodePanel } from '../../../shared/components/CodePanel';
import {
  ToolPage, ToolHeader, ToolWorkspace, ToolToolbar,
  ModeToggleGroup, ModeToggle, SplitPanels, ToolEmbedFrame,
} from '../../../shared/components/ToolLayout';
import { useToolEmbed } from '../../../shared/context/ToolEmbedContext';
import { Badge, Button } from '../../../shared/components/ui';

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
    } catch (err) {
      console.error('Failed to generate keys', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const embedded = useToolEmbed();

  const toolToolbar = (
    <ToolToolbar>
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--zd-text-secondary)]">Key Modulus Size</span>
        <ModeToggleGroup>
          {[1024, 2048, 4096].map(size => (
            <ModeToggle
              key={size}
              active={modulusLength === size}
              onClick={() => updateState({ modulusLength: size })}
            >
              {size}-bit
            </ModeToggle>
          ))}
        </ModeToggleGroup>
      </div>

      <Button
        onClick={generateKeys}
        disabled={isGenerating}
        className="ml-auto"
      >
        {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
        {isGenerating ? 'Computing Prime Factors...' : 'Generate New Keypair'}
      </Button>
    </ToolToolbar>
  );

  const panels = (
    <SplitPanels>
          <CodePanel
            title="Public Key"
            badge="PEM / SPKI"
            value={publicKey}
            readOnly
            useTextarea
            placeholder="Click 'Generate New Keypair' to compute RSA public key..."
            downloadFileName="public.pem"
            downloadMimeType="application/x-pem-file"
            borderRight
            contentClassName="[&_textarea]:!text-xs sm:[&_textarea]:!text-[13px] [&_textarea]:!leading-relaxed"
          />

          <CodePanel
            title="Private Key"
            badge={
              <span className="inline-flex items-center gap-1 text-[#FF6B6B]">
                <Lock className="w-2.5 h-2.5" />
                Confidential
              </span>
            }
            value={privateKey}
            readOnly
            useTextarea
            placeholder="Private key (PKCS#8 PEM format) will appear here..."
            downloadFileName="private.pem"
            downloadMimeType="application/x-pem-file"
            contentClassName="[&_textarea]:!text-xs sm:[&_textarea]:!text-[13px] [&_textarea]:!leading-relaxed [&_textarea]:selection:bg-[#FF6B6B]/30"
          />
    </SplitPanels>
  );

  if (embedded) {
    return (
      <ToolEmbedFrame toolbar={toolToolbar}>
        {panels}
      </ToolEmbedFrame>
    );
  }

  return (
    <ToolPage>
      <ToolHeader
        icon={Key}
        title="RSA Key Pair Generator"
        description="Generate industrial-grade RSA public and private key pairs locally using Web Crypto API."
        badges={<Badge>PKCS#8 / SPKI</Badge>}
        actions={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--zd-surface)] border border-[var(--zd-border)] text-xs font-medium text-[var(--zd-text-secondary)] shadow-sm">
            <ShieldCheck className="w-4 h-4 text-[var(--zd-accent)]" />
            <span>100% Client-Side</span>
          </div>
        }
      />
      <ToolWorkspace toolbar={toolToolbar}>{panels}</ToolWorkspace>
    </ToolPage>
  );
}
