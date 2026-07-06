import { useState, useEffect } from 'react';
import { DatabaseZap, Copy, Check } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';

interface ConnectionStringState {
  host: string;
  port: string;
  user: string;
  pass: string;
  db: string;
}

const useConnectionStore = createToolStore<ConnectionStringState>('connection-string', {
  host: 'localhost',
  port: '5432',
  user: 'postgres',
  pass: 'secret',
  db: 'my_database',
});

export default function ConnectionStringBuilder() {
  const { host, port, user, pass, db, setValues } = useConnectionStore();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const urlState = getStateFromURL<ConnectionStringState>();
    if (urlState && urlState.host !== undefined) {
      setValues(urlState);
    }
  }, []);

  const updateState = (updates: Partial<ConnectionStringState>) => {
    setValues(updates);
    updateURLWithState({ host, port, user, pass, db, ...updates });
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const u = encodeURIComponent(user);
  const p = encodeURIComponent(pass);
  const h = encodeURIComponent(host);
  const d = encodeURIComponent(db);
  const po = encodeURIComponent(port);

  const uris = [
    {
      name: 'PostgreSQL URI',
      value: `postgresql://${u}:${p}@${h}:${po}/${d}`,
    },
    {
      name: 'PostgreSQL (psql terminal)',
      value: `psql -h ${host} -p ${port} -U ${user} -d ${db}`,
    },
    {
      name: 'MongoDB URI',
      value: `mongodb://${u}:${p}@${h}:${po}/${d}?authSource=admin`,
    },
    {
      name: 'MySQL URI',
      value: `mysql://${u}:${p}@${h}:${po}/${d}`,
    },
    {
      name: 'Redis URI',
      value: `redis://${u}:${p}@${h}:${po}/0`,
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center p-4 sm:p-6 md:p-8 xl:p-10 2xl:p-12 3xl:p-16 w-full max-w-6xl 2xl:max-w-7xl 3xl:max-w-[1440px] mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)]">
          <DatabaseZap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)]">Connection String Builder</h1>
          <p className="text-[var(--zd-text-secondary)]">Generate perfectly formatted URIs for your databases</p>
        </div>
      </div>

      <div className="w-full flex flex-col md:flex-row flex-1 min-h-0 bg-[var(--zd-bg)] rounded-2xl border border-[var(--zd-border)] shadow-sm overflow-hidden">
        
        {/* Editor Panel */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[var(--zd-border)] bg-[var(--zd-surface)] overflow-y-auto p-6 flex flex-col gap-4">
          
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Host</label>
            <input
              type="text"
              value={host}
              onChange={(e) => updateState({ host: e.target.value })}
              className="px-3 py-2 bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-lg text-sm focus:outline-none focus:border-orange-500 text-[var(--zd-text-primary)] font-mono"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Port</label>
            <input
              type="text"
              value={port}
              onChange={(e) => updateState({ port: e.target.value })}
              className="px-3 py-2 bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-lg text-sm focus:outline-none focus:border-orange-500 text-[var(--zd-text-primary)] font-mono"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Username</label>
            <input
              type="text"
              value={user}
              onChange={(e) => updateState({ user: e.target.value })}
              className="px-3 py-2 bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-lg text-sm focus:outline-none focus:border-orange-500 text-[var(--zd-text-primary)] font-mono"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Password</label>
            <input
              type="text"
              value={pass}
              onChange={(e) => updateState({ pass: e.target.value })}
              className="px-3 py-2 bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-lg text-sm focus:outline-none focus:border-orange-500 text-[var(--zd-text-primary)] font-mono"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">Database Name</label>
            <input
              type="text"
              value={db}
              onChange={(e) => updateState({ db: e.target.value })}
              className="px-3 py-2 bg-[var(--zd-bg)] border border-[var(--zd-border)] rounded-lg text-sm focus:outline-none focus:border-orange-500 text-[var(--zd-text-primary)] font-mono"
            />
          </div>

        </div>

        {/* Output Panel */}
        <div className="flex-1 flex flex-col bg-[var(--zd-bg)] p-6 gap-6 overflow-y-auto">
          {uris.map((uri, i) => (
            <div key={i} className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[var(--zd-text-secondary)]">{uri.name}</span>
              <div className="flex items-center bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-lg overflow-hidden">
                <input
                  type="text"
                  readOnly
                  value={uri.value}
                  className="flex-1 px-4 py-3 bg-transparent border-none text-[13px] font-mono text-[var(--zd-text-secondary)] focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(uri.value, i)}
                  className="px-4 py-3 bg-[var(--zd-surface-raised)] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border-l border-[var(--zd-border)] flex items-center justify-center shrink-0"
                  title="Copy"
                >
                  {copiedIndex === i ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-[var(--zd-text-muted)]" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  );
}
