import { useState, useMemo } from 'react';
import { KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function JWTDecoder() {
  const [token, setToken] = useState('');

  const decoded = useMemo(() => {
    if (!token.trim()) return null;

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { error: 'Invalid JWT format. Must contain 3 parts separated by dots.' };
    }

    try {
      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const signature = parts[2];
      
      // Basic expiration check
      const isExpired = payload.exp ? payload.exp * 1000 < Date.now() : false;

      return { header, payload, signature, isExpired };
    } catch (e) {
      return { error: 'Failed to decode token. Invalid Base64 or JSON.' };
    }
  }, [token]);

  return (
    <div className="flex-1 flex flex-col items-center p-6 md:p-12 w-full max-w-6xl mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <KeyRound className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">JWT Decoder</h1>
          <p className="text-slate-500 dark:text-slate-400">Decode JSON Web Tokens instantly</p>
        </div>
      </div>

      <div className="w-full flex flex-col md:flex-row flex-1 min-h-0 gap-6">
        {/* Left: Input */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[200px]">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Encoded Token</span>
            {token && (
              <button onClick={() => setToken('')} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">Clear</button>
            )}
          </div>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste a JWT here (ey...)"
            className="flex-1 w-full p-6 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm font-mono text-slate-800 dark:text-slate-200 leading-relaxed break-all"
            spellCheck={false}
          />
        </div>

        {/* Right: Output */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[300px] md:min-h-0">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Decoded Data</span>
            {decoded && !decoded.error && (
              <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Valid Syntax
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            {!token ? (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm">
                Awaiting token...
              </div>
            ) : decoded?.error ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-900/30">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{decoded.error}</p>
              </motion.div>
            ) : decoded && !decoded.error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                {/* Header */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-red-500 dark:text-red-400 mb-2">Header <span className="font-normal lowercase text-slate-400 ml-1">Algorithm & Token Type</span></h3>
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                    <pre className="text-sm font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all">
                      {JSON.stringify(decoded.header, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Payload */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Payload <span className="font-normal lowercase text-slate-400 ml-1">Data</span></h3>
                    {decoded.isExpired !== undefined && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${decoded.isExpired ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {decoded.isExpired ? 'Expired' : 'Active'}
                      </span>
                    )}
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                    <pre className="text-sm font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-all">
                      {JSON.stringify(decoded.payload, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Signature */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">Signature</h3>
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-mono text-slate-500 dark:text-slate-500 break-all">
                      {decoded.signature}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      * Signature validation requires the secret key and must be done securely on a server.
                    </p>
                  </div>
                </div>

              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
