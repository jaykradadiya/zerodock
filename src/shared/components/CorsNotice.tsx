import { AlertTriangle } from 'lucide-react';

export function CorsNotice() {
  return (
    <div
      role="note"
      className="w-full mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-sm text-[var(--zd-text-secondary)] shrink-0"
    >
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" aria-hidden />
      <p className="m-0 leading-relaxed">
        <strong className="text-[var(--zd-text-primary)]">Browser CORS limits apply.</strong>{' '}
        Requests run from your browser — APIs must allow your origin, or use a CORS proxy / server-side call for blocked endpoints.
      </p>
    </div>
  );
}
