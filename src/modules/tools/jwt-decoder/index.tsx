import { useState, useMemo, useRef } from 'react';
import { KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react';
import { CodePanel } from '../../../shared/components/CodePanel';
import { ToolPage, ToolHeader, ToolWorkspace, SplitPanels, ToolEmbedFrame } from '../../../shared/components/ToolLayout';
import { useToolEmbed } from '../../../shared/context/ToolEmbedContext';
import { Badge } from '../../../shared/components/ui';
import { createToolStore } from '../../../core/store/useToolState';
import { useConverterShortcuts } from '../../../shared/hooks/useConverterShortcuts';

const useJwtStore = createToolStore('jwt-decoder', {
  token: '',
}, {
  storageType: 'memory',
});

const JWT_COLORS = {
  header: '#fb015b',
  payload: '#d63aff',
  signature: '#00b9f1',
  text: 'var(--zd-text-primary)'
};

type Section = 'header' | 'payload' | 'signature' | null;

const highlightJSON = (obj: any) => {
  let json = JSON.stringify(obj, null, 2);
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    let cls = 'text-[var(--zd-primary)]';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-[var(--zd-text-primary)] font-semibold';
      } else {
        cls = 'text-[var(--zd-accent)]';
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-orange-500';
    } else if (/null/.test(match)) {
      cls = 'text-[var(--zd-text-muted)]';
    }
    return `<span class="${cls}">${match}</span>`;
  });
};

export default function JWTDecoder() {
  const { token, setValues } = useJwtStore();
  const setToken = (val: string) => setValues({ token: val });
  const [hoveredSection, setHoveredSection] = useState<Section>(null);

  // Note: JWT tokens are strictly in-memory only and never synced to the URL or storage

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const decoded = useMemo(() => {
    if (!token.trim()) return null;

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { error: 'Invalid JWT format. Must contain 3 parts separated by dots.', parts };
    }

    try {
      const headerStr = atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));
      const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));

      const header = JSON.parse(headerStr);
      const payload = JSON.parse(payloadStr);
      const signature = parts[2];

      const isExpired = payload.exp ? payload.exp * 1000 < Date.now() : false;

      return { parts, header, payload, signature, isExpired };
    } catch {
      return { error: 'Failed to decode token. Invalid Base64 or JSON.', parts };
    }
  }, [token]);

  const decodedOutput = decoded && !decoded.error
    ? JSON.stringify({ header: decoded.header, payload: decoded.payload, signature: decoded.signature }, null, 2)
    : '';

  useConverterShortcuts({
    onClear: () => setToken(''),
    output: decodedOutput,
  });

  const renderOverlay = () => {
    if (!token) {
      return (
        <div className="absolute inset-0 p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap break-all pointer-events-none text-[var(--zd-text-muted)]">
          Paste a JWT here (ey...)
        </div>
      );
    }

    const parts = token.split('.');

    return (
      <div
        ref={overlayRef}
        className="absolute inset-0 p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap break-all pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {parts.map((part, index) => {
          let color = JWT_COLORS.text;
          let section: Section = null;

          if (index === 0) { color = JWT_COLORS.header; section = 'header'; }
          else if (index === 1) { color = JWT_COLORS.payload; section = 'payload'; }
          else if (index === 2) { color = JWT_COLORS.signature; section = 'signature'; }

          const isHovered = hoveredSection === section;
          const isOtherHovered = hoveredSection !== null && !isHovered;

          return (
            <span key={index}>
              <span
                style={{
                  color,
                  opacity: isOtherHovered ? 0.3 : 1,
                  transition: 'opacity 0.2s ease',
                  backgroundColor: isHovered ? `${color}1A` : 'transparent',
                  borderRadius: '2px',
                }}
              >
                {part}
              </span>
              {index < parts.length - 1 && (
                <span style={{
                  color: JWT_COLORS.text,
                  opacity: hoveredSection ? 0.3 : 1,
                  transition: 'opacity 0.2s ease'
                }}>
                  .
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  };

  const embedded = useToolEmbed();

  const panels = (
        <SplitPanels>
          <CodePanel
            title="Encoded Token"
            onClear={token ? () => setToken('') : undefined}
            borderRight
            contentClassName="flex flex-col"
          >
            <div className="relative flex-1 w-full min-h-0 bg-transparent">
              {renderOverlay()}
              <textarea
                ref={textareaRef}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onScroll={handleScroll}
                className="absolute inset-0 w-full h-full p-6 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm font-mono leading-relaxed break-all custom-scrollbar"
                style={{ color: 'transparent', caretColor: 'var(--zd-text-primary)' }}
                spellCheck={false}
              />
            </div>
          </CodePanel>

          <CodePanel
            title="Decoded Data"
            readOnly
            headerLeft={
              decoded && !decoded.error ? (
                <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-[var(--zd-accent-soft)] text-[var(--zd-accent)]">
                  <ShieldCheck className="w-3.5 h-3.5" /> Valid Syntax
                </div>
              ) : undefined
            }
            contentClassName="overflow-auto custom-scrollbar"
          >
            {!token ? (
              <div className="h-full flex items-center justify-center text-[var(--zd-text-muted)] text-sm p-6">
                Awaiting token...
              </div>
            ) : decoded?.error ? (
              <div className="flex items-start gap-3 p-6 m-4 bg-red-500/10 text-red-600 rounded-lg border border-red-500/20">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{decoded.error}</p>
              </div>
            ) : decoded && !decoded.error && (
              <div className="space-y-6 p-6">
                <div
                  onMouseEnter={() => setHoveredSection('header')}
                  onMouseLeave={() => setHoveredSection(null)}
                  className={`transition-opacity duration-200 ${hoveredSection && hoveredSection !== 'header' ? 'opacity-40' : 'opacity-100'}`}
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: JWT_COLORS.header }}>
                    Header <span className="font-normal lowercase text-[var(--zd-text-muted)] ml-1">Algorithm & Token Type</span>
                  </h3>
                  <div className="bg-[var(--zd-surface-raised)] p-4 rounded-lg border border-[var(--zd-border)]">
                    <pre
                      className="text-sm font-mono whitespace-pre-wrap break-all text-[var(--zd-text-primary)]"
                      dangerouslySetInnerHTML={{ __html: highlightJSON(decoded.header) }}
                    />
                  </div>
                </div>

                <div
                  onMouseEnter={() => setHoveredSection('payload')}
                  onMouseLeave={() => setHoveredSection(null)}
                  className={`transition-opacity duration-200 ${hoveredSection && hoveredSection !== 'payload' ? 'opacity-40' : 'opacity-100'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: JWT_COLORS.payload }}>
                      Payload <span className="font-normal lowercase text-[var(--zd-text-muted)] ml-1">Data</span>
                    </h3>
                    {decoded.isExpired !== undefined && (
                      <Badge className={decoded.isExpired ? 'bg-red-500/15 text-red-600' : 'bg-[var(--zd-accent-soft)] text-[var(--zd-accent)]'}>
                        {decoded.isExpired ? 'Expired' : 'Active'}
                      </Badge>
                    )}
                  </div>
                  <div className="bg-[var(--zd-surface-raised)] p-4 rounded-lg border border-[var(--zd-border)]">
                    <pre
                      className="text-sm font-mono whitespace-pre-wrap break-all text-[var(--zd-text-primary)]"
                      dangerouslySetInnerHTML={{ __html: highlightJSON(decoded.payload) }}
                    />
                  </div>
                </div>

                <div
                  onMouseEnter={() => setHoveredSection('signature')}
                  onMouseLeave={() => setHoveredSection(null)}
                  className={`transition-opacity duration-200 ${hoveredSection && hoveredSection !== 'signature' ? 'opacity-40' : 'opacity-100'}`}
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: JWT_COLORS.signature }}>
                    Signature
                  </h3>
                  <div className="bg-[var(--zd-surface-raised)] p-4 rounded-lg border border-[var(--zd-border)]">
                    <p
                      className="text-sm font-mono break-all"
                      style={{ color: JWT_COLORS.signature }}
                    >
                      {decoded.signature}
                    </p>
                    <p className="text-xs text-[var(--zd-text-muted)] mt-2">
                      * Signature validation requires the secret key and must be done securely on a server.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CodePanel>
        </SplitPanels>
  );

  if (embedded) return <ToolEmbedFrame>{panels}</ToolEmbedFrame>;

  return (
    <ToolPage>
      <ToolHeader
        icon={KeyRound}
        title="JWT Decoder"
        description="Decode JSON Web Tokens instantly"
        badges={
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Ephemeral (Memory-Only)
          </span>
        }
      />
      <ToolWorkspace>{panels}</ToolWorkspace>
    </ToolPage>
  );
}
