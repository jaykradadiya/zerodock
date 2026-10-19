import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clipboard, FileCode, Check, Upload, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '../../../../shared/components/ui';

interface PasteZoneProps {
  hasContent: boolean;
  onPasteHtml: (html: string) => void;
  onClear: () => void;
  onLoadSample: () => void;
}

export function PasteZone({
  hasContent,
  onPasteHtml,
  onClear,
  onLoadSample,
}: PasteZoneProps) {
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const handleClipboardRead = async () => {
    setPasteError(null);
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes('text/html')) {
            const blob = await item.getType('text/html');
            const html = await blob.text();
            onPasteHtml(html);
            setCopiedSuccess(true);
            setTimeout(() => setCopiedSuccess(false), 2000);
            return;
          }
        }
      }
      
      // Fallback to readText if read() didn't have text/html or wasn't permitted
      const text = await navigator.clipboard.readText();
      if (text) {
        onPasteHtml(text);
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2000);
      } else {
        setPasteError('Clipboard is empty. Copy text from Google Docs first.');
      }
    } catch {
      setPasteError('Clipboard permission denied. Please press Cmd+V (or Ctrl+V) inside the editor.');
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setPasteError(null);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) onPasteHtml(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleFileDrop}
      className="relative flex flex-col items-center justify-center p-6 text-center h-full min-h-[18rem] select-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="max-w-md w-full flex flex-col items-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-[var(--zd-primary-soft)] border border-[var(--zd-border-glow)] flex items-center justify-center text-[var(--zd-primary)] mb-4 shadow-[var(--zd-shadow-sm)]">
          <FileCode className="w-7 h-7" />
        </div>

        <h3 className="text-base font-semibold text-[var(--zd-text-primary)] mb-1">
          {hasContent ? 'Google Docs / HTML Loaded' : 'Paste from Google Docs'}
        </h3>
        <p className="text-xs text-[var(--zd-text-muted)] mb-5 max-w-xs leading-relaxed">
          Copy any formatted text or tables in Google Docs or Word, then click below or press{' '}
          <kbd className="px-1.5 py-0.5 rounded border border-[var(--zd-border)] bg-[var(--zd-surface-raised)] font-mono text-[10px] text-[var(--zd-text-secondary)]">
            Cmd+V
          </kbd>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          <Button
            variant="primary"
            size="md"
            onClick={handleClipboardRead}
            className="gap-2 shadow-[var(--zd-shadow-glow)]"
          >
            {copiedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
            {copiedSuccess ? 'Pasted from Clipboard!' : 'Paste from Clipboard'}
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={onLoadSample}
            className="gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--zd-primary)]" />
            Try Example
          </Button>

          {hasContent && (
            <Button
              variant="destructive"
              size="md"
              onClick={onClear}
            >
              Clear
            </Button>
          )}
        </div>

        <AnimatePresence>
          {pasteError && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--zd-error)] bg-[var(--zd-surface-raised)] px-3 py-1.5 rounded-lg border border-[var(--zd-border)]"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{pasteError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-[var(--zd-text-muted)]">
          <Upload className="w-3.5 h-3.5" />
          <span>Or drop an HTML file directly here</span>
        </div>
      </motion.div>
    </div>
  );
}
