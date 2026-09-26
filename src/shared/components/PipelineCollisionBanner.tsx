import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownRight, Check, X } from 'lucide-react';
import { Button } from './ui';

interface PipelineCollisionBannerProps {
  incomingData: string | null;
  sourceToolName?: string;
  onApply?: () => void;
  onDismiss: () => void;
  applyLabel?: string;
  customActions?: React.ReactNode;
}

export function PipelineCollisionBanner({
  incomingData,
  sourceToolName = 'another tool',
  onApply,
  onDismiss,
  applyLabel = 'Replace Current Input',
  customActions,
}: PipelineCollisionBannerProps) {
  if (!incomingData) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        className="w-full bg-[var(--zd-primary-soft)] border-b border-[var(--zd-primary)]/30 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs text-[var(--zd-text-primary)] z-20 shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ArrowDownRight className="w-4 h-4 text-[var(--zd-primary)] shrink-0" />
          <span className="truncate">
            Incoming data from <strong>{sourceToolName}</strong> ({incomingData.length.toLocaleString()} chars). Your current work is preserved.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {customActions ? (
            customActions
          ) : (
            onApply && (
              <Button
                size="sm"
                variant="primary"
                onClick={onApply}
                className="!py-1 !px-2.5 text-xs font-semibold"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                {applyLabel}
              </Button>
            )
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="!py-1 !px-2 text-xs text-[var(--zd-text-muted)] hover:text-[var(--zd-text-primary)]"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Dismiss
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
