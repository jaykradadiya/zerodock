import { useToastStore, type ToastType } from '../../core/store/useToastStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const icons: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const colors: Record<ToastType, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-[var(--zd-primary)]',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto flex items-center gap-3 p-3 min-w-[280px] bg-[var(--zd-surface-raised)] border border-[var(--zd-border)] shadow-[var(--zd-shadow-lg)] rounded-xl"
            >
              <Icon className={`w-5 h-5 shrink-0 ${colors[toast.type]}`} />
              <p className="flex-1 text-sm font-medium text-[var(--zd-text-primary)]">
                {toast.message}
              </p>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-md text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)] hover:bg-[var(--zd-surface)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
