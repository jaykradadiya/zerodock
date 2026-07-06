import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '../../core/store/useToastStore';
import { usePreferenceStore } from '../../core/store/usePreferenceStore';
import { playSound } from '../utils/sound';
import { Button, cn } from './ui';

interface CopyButtonProps {
  value: string;
  className?: string;
}

export function CopyButton({ value, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const addToast = useToastStore((s) => s.addToast);
  const { soundEnabled } = usePreferenceStore();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (soundEnabled) playSound('pop');
      addToast('Copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className={cn(
        '!px-0 !py-0 !border-0 relative',
        copied ? '!text-[var(--zd-accent)]' : '!text-[var(--zd-text-secondary)] hover:!text-[var(--zd-primary)]',
        className
      )}
    >
      <div className="relative w-3 h-3 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.div
              key="check"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Check className="w-3 h-3" />
            </motion.div>
          ) : (
            <motion.div
              key="copy"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Copy className="w-3 h-3" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}
