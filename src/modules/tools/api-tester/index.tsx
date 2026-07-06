import { useState, useEffect } from 'react';
import { Network, Play, Download, Copy, Check, Clock, ShieldAlert, Sparkles, Layers, Code, Terminal } from 'lucide-react';
import { ToolPage, ToolHeader, ToolWorkspace, ToolEmbedFrame } from '../../../shared/components/ToolLayout';
import { CorsNotice } from '../../../shared/components/CorsNotice';
import { useToolEmbed } from '../../../shared/context/ToolEmbedContext';
import { createToolStore } from '../../../core/store/useToolState';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';
import { exportToFile } from '../../../shared/utils/export';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
type RequestTab = 'headers' | 'body';

interface ApiTesterState {
  method: HttpMethod;
  url: string;
  body: string;
  headersString: string;
}

const useApiTesterStore = createToolStore<ApiTesterState>('api-tester', {
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/todos/1',
  body: '{\n  "title": "foo",\n  "body": "bar",\n  "userId": 1\n}',
  headersString: '{\n  "Content-Type": "application/json",\n  "Accept": "application/json"\n}',
});

export default function ApiTester() {
  const { method, url, body, headersString, setValues } = useApiTesterStore();
  const [activeTab, setActiveTab] = useState<RequestTab>('headers');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState<number | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore state from URL on mount
  useEffect(() => {
    const urlState = getStateFromURL<ApiTesterState>();
    if (urlState && urlState.url) {
      setValues(urlState);
    }
  }, []);

  const updateState = (updates: Partial<ApiTesterState>) => {
    setValues(updates);
    updateURLWithState({ method, url, body, headersString, ...updates });
  };

  const handleSend = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    setResponse('');
    setStatus(null);
    setTime(null);

    let parsedHeaders = {};
    try {
      if (headersString.trim()) {
        parsedHeaders = JSON.parse(headersString);
      }
    } catch (e) {
      setError('Invalid Headers JSON format. Please check syntax.');
      setLoading(false);
      return;
    }

    const startTime = performance.now();
    try {
      const fetchOptions: RequestInit = {
        method,
        headers: parsedHeaders,
      };

      if (method !== 'GET' && method !== 'HEAD' && body.trim()) {
        fetchOptions.body = body;
      }

      const res = await fetch(url, fetchOptions);
      const endTime = performance.now();
      
      setStatus(res.status);
      setTime(Math.round(endTime - startTime));

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const json = await res.json();
        setResponse(JSON.stringify(json, null, 2));
      } else {
        const text = await res.text();
        setResponse(text);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch resource (CORS or Network Error)');
      setStatus(0);
      setTime(Math.round(performance.now() - startTime));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const getStatusColor = (code: number | null) => {
    if (code === null) return 'text-[var(--zd-text-muted)] bg-[var(--zd-surface)]';
    if (code === 0) return 'text-[#FF7675] bg-[#FF7675]/10 border border-[#FF7675]/30';
    if (code >= 200 && code < 300) return 'text-[var(--zd-accent)] bg-[var(--zd-accent-soft)] border border-[var(--zd-accent)]/30';
    if (code >= 300 && code < 400) return 'text-[var(--zd-primary)] bg-[var(--zd-primary-soft)] border border-[var(--zd-primary)]/30';
    return 'text-[#FF7675] bg-[#FF7675]/10 border border-[#FF7675]/30';
  };

  const embedded = useToolEmbed();

  const testerBody = (
    <>
      <CorsNotice />
      <div className="zd-tool-fill overflow-hidden">
        
        {/* Request Bar */}
        <div className="p-4 border-b border-[var(--zd-border)] flex flex-col sm:flex-row gap-3 bg-[var(--zd-surface-raised)] shrink-0">
          <div className="flex gap-2 flex-1">
            <select
              value={method}
              onChange={(e) => updateState({ method: e.target.value as HttpMethod })}
              className="px-3 py-2 bg-[var(--zd-surface)] border border-[var(--zd-border)] hover:border-[var(--zd-border-hover)] rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-[var(--zd-primary)] text-[var(--zd-text-primary)] cursor-pointer transition-colors"
            >
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={url}
                onChange={(e) => updateState({ url: e.target.value })}
                placeholder="https://api.example.com/v1/resource"
                className="w-full pl-4 pr-10 py-2 bg-[var(--zd-surface)] border border-[var(--zd-border)] hover:border-[var(--zd-border-hover)] rounded-xl text-xs font-mono focus:outline-none focus:border-[var(--zd-primary)] text-[var(--zd-text-primary)] transition-all placeholder-[var(--zd-text-muted)]"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <span className="absolute right-3 text-[10px] font-mono text-[var(--zd-text-muted)] uppercase hidden md:inline-block pointer-events-none">
                URL
              </span>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !url}
            className="px-6 py-2 bg-[var(--zd-primary)] hover:bg-[var(--zd-primary-hover)] text-white rounded-xl text-xs font-bold transition-[background-color,opacity,transform] duration-150 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-[var(--zd-shadow-sm)] cursor-pointer border border-white/10"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Send Request</span>
              </>
            )}
          </button>
        </div>

        {/* Configuration Tabs & Editors */}
        <div className="flex flex-col border-b border-[var(--zd-border)] bg-[var(--zd-surface)] shrink-0">
          <div className="flex items-center px-4 pt-2 gap-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface-raised)]/50">
            <button
              onClick={() => setActiveTab('headers')}
              className={`px-4 py-2 text-xs font-mono font-medium rounded-t-lg transition-all relative flex items-center gap-2 cursor-pointer ${
                activeTab === 'headers'
                  ? 'text-[var(--zd-primary)] bg-[var(--zd-surface)] border-t border-x border-[var(--zd-border)] -mb-px'
                  : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Headers</span>
              <span className="px-1.5 py-0.2 rounded bg-[var(--zd-surface-raised)] text-[10px] text-[var(--zd-text-muted)] border border-[var(--zd-border)]">JSON</span>
            </button>
            <button
              onClick={() => setActiveTab('body')}
              disabled={method === 'GET' || method === 'HEAD'}
              className={`px-4 py-2 text-xs font-mono font-medium rounded-t-lg transition-all relative flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'body'
                  ? 'text-[var(--zd-primary)] bg-[var(--zd-surface)] border-t border-x border-[var(--zd-border)] -mb-px'
                  : 'text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)]'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Body Payload</span>
              {method !== 'GET' && method !== 'HEAD' && (
                <span className="px-1.5 py-0.2 rounded bg-[var(--zd-surface-raised)] text-[10px] text-[var(--zd-text-muted)] border border-[var(--zd-border)]">JSON/Text</span>
              )}
            </button>
          </div>

          <div className="h-36 relative bg-[var(--zd-surface)]">
            {activeTab === 'headers' ? (
              <div className="absolute inset-0 p-3 flex flex-col">
                <textarea
                  value={headersString}
                  onChange={(e) => updateState({ headersString: e.target.value })}
                  placeholder="{\n  &quot;Authorization&quot;: &quot;Bearer token&quot;,\n  &quot;Content-Type&quot;: &quot;application/json&quot;\n}"
                  className="flex-1 w-full p-2 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-xs font-mono text-[var(--zd-text-primary)] placeholder-[var(--zd-text-muted)]/50 custom-scrollbar leading-relaxed"
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="absolute inset-0 p-3 flex flex-col">
                <textarea
                  value={body}
                  onChange={(e) => updateState({ body: e.target.value })}
                  disabled={method === 'GET' || method === 'HEAD'}
                  placeholder={
                    method === 'GET' || method === 'HEAD'
                      ? 'Body payload is disabled for GET/HEAD requests.'
                      : '{\n  "key": "value",\n  "items": [1, 2, 3]\n}'
                  }
                  className="flex-1 w-full p-2 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-xs font-mono text-[var(--zd-text-primary)] placeholder-[var(--zd-text-muted)]/50 custom-scrollbar leading-relaxed disabled:opacity-40"
                  spellCheck={false}
                />
              </div>
            )}
          </div>
        </div>

        {/* Response Panel */}
        <div className="zd-tool-fill relative bg-[var(--zd-bg)]">
          {/* Response Toolbar */}
          <div className="px-4 py-2.5 bg-[var(--zd-surface-raised)] border-b border-[var(--zd-border)] flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-[var(--zd-text-secondary)] uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[var(--zd-primary)]" />
                <span>Response Output</span>
              </span>
              {status !== null && (
                <div className="flex items-center gap-2.5">
                  <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold ${getStatusColor(status)}`}>
                    {status === 0 ? 'NET_ERROR' : `${status} ${status === 200 ? 'OK' : status === 201 ? 'CREATED' : ''}`}
                  </span>
                  {time !== null && (
                    <span className="text-[11px] font-mono text-[var(--zd-text-muted)] flex items-center gap-1 bg-[var(--zd-surface)] px-2 py-0.5 rounded border border-[var(--zd-border)]">
                      <Clock className="w-3 h-3 text-[var(--zd-accent)]" /> {time} ms
                    </span>
                  )}
                </div>
              )}
            </div>

            {response && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => exportToFile(response, 'api-response.json', 'application/json')}
                  className="px-2.5 py-1 text-xs font-mono text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface)] rounded-md transition-colors flex items-center gap-1.5 border border-transparent hover:border-[var(--zd-border)] cursor-pointer"
                  title="Download JSON Response"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button 
                  onClick={copyToClipboard} 
                  className="px-2.5 py-1 text-xs font-mono text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface)] rounded-md transition-colors flex items-center gap-1.5 border border-transparent hover:border-[var(--zd-border)] cursor-pointer"
                  title="Copy to Clipboard"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[var(--zd-accent)]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? <span className="text-[var(--zd-accent)] font-semibold">Copied!</span> : 'Copy'}
                </button>
              </div>
            )}
          </div>
          
          {/* Response Content Area */}
          <div className="flex-1 relative flex flex-col overflow-hidden">
            {error ? (
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center gap-3 m-4 rounded-xl bg-[#FF7675]/5 border border-[#FF7675]/20">
                <div className="w-10 h-10 rounded-full bg-[#FF7675]/10 flex items-center justify-center text-[#FF7675] mb-1">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <p className="text-sm text-[var(--zd-text-primary)] font-bold">Request Execution Failed</p>
                <p className="text-xs text-[#FF7675] font-mono max-w-md whitespace-pre-wrap leading-relaxed">{error}</p>
                <p className="text-[11px] text-[var(--zd-text-muted)] mt-2">Check CORS policy, network connectivity, or SSL verification.</p>
              </div>
            ) : response ? (
              <textarea
                value={response}
                readOnly
                placeholder="Response payload will render here..."
                className="flex-1 w-full p-6 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-xs font-mono text-[var(--zd-text-primary)] whitespace-pre leading-relaxed custom-scrollbar selection:bg-[var(--zd-primary-soft)]"
                spellCheck={false}
              />
            ) : (
              /* Premium Empty State */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[var(--zd-surface)] border border-[var(--zd-border)] flex items-center justify-center text-[var(--zd-text-muted)] shadow-sm">
                  <Network className="w-8 h-8 stroke-[1.5]" />
                </div>
                <div className="max-w-xs">
                  <p className="text-sm font-semibold text-[var(--zd-text-primary)] mb-1">Awaiting Request</p>
                  <p className="text-xs text-[var(--zd-text-muted)] leading-relaxed">
                    Configure your endpoint URL and headers above, then press <span className="font-mono text-[var(--zd-primary)] font-semibold">Send Request</span> or <span className="font-mono bg-[var(--zd-surface-raised)] px-1.5 py-0.5 rounded border border-[var(--zd-border)]">Enter</span>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  if (embedded) return <ToolEmbedFrame>{testerBody}</ToolEmbedFrame>;

  return (
    <ToolPage fullWidth>
      <ToolHeader
        icon={Network}
        title="API Tester Pro"
        description="Zero-latency client-side HTTP & REST testing studio"
        badges={
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-[var(--zd-accent-soft)] text-[var(--zd-accent)] border border-[var(--zd-accent)]/30">
            Stitch UI
          </span>
        }
        actions={
          <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--zd-text-muted)] bg-[var(--zd-surface-raised)] px-3 py-1.5 rounded-lg border border-[var(--zd-border)]">
            <Sparkles className="w-3.5 h-3.5 text-[var(--zd-accent)]" />
            <span>100% In-Browser & Privacy Safe</span>
          </div>
        }
      />
      <ToolWorkspace>{testerBody}</ToolWorkspace>
    </ToolPage>
  );
}

