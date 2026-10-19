import React, { useRef, useEffect, useState } from 'react';
import { Clipboard, Sparkles, Trash2, Check, FileText } from 'lucide-react';
import { PasteZone } from './PasteZone';
import { Button } from '../../../../shared/components/ui';

interface RichViewerProps {
  html: string;
  onChange: (html: string) => void;
  onSample: () => void;
  onClear: () => void;
}

/**
 * Sanitizes HTML to prevent script execution while preserving rich formatting.
 */
function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    // Remove dangerous tags
    const dangerousTags = doc.querySelectorAll('script, iframe, object, embed, style');
    dangerousTags.forEach((el) => el.remove());

    // Strip inline javascript handlers
    const allElements = doc.querySelectorAll('*');
    allElements.forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.startsWith('on') || attr.value.trim().toLowerCase().startsWith('javascript:')) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return doc.body.innerHTML;
  } catch {
    return rawHtml;
  }
}

export function RichViewer({
  html,
  onChange,
  onSample,
  onClear,
}: RichViewerProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [pasteSuccess, setPasteSuccess] = useState(false);

  // Synchronize incoming html to contenteditable DOM only when external changes happen
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = sanitizeHtml(html);
    }
  }, [html]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const clipboardHtml = e.clipboardData.getData('text/html');
    if (clipboardHtml) {
      e.preventDefault();
      onChange(clipboardHtml);
      if (editorRef.current) {
        editorRef.current.innerHTML = sanitizeHtml(clipboardHtml);
      }
      setPasteSuccess(true);
      setTimeout(() => setPasteSuccess(false), 2000);
      return;
    }

    const plainText = e.clipboardData.getData('text/plain');
    if (plainText) {
      e.preventDefault();
      document.execCommand('insertText', false, plainText);
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    }
  };

  const handleClipboardRead = async () => {
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes('text/html')) {
            const blob = await item.getType('text/html');
            const newHtml = await blob.text();
            onChange(newHtml);
            setPasteSuccess(true);
            setTimeout(() => setPasteSuccess(false), 2000);
            return;
          }
        }
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text);
        setPasteSuccess(true);
        setTimeout(() => setPasteSuccess(false), 2000);
      }
    } catch {
      // Permission blocked; user can press Cmd+V
    }
  };

  // If no content has been pasted yet, show the full friendly PasteZone
  if (!html.trim()) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center h-full p-4">
        <PasteZone
          hasContent={false}
          onPasteHtml={onChange}
          onClear={onClear}
          onLoadSample={onSample}
        />
      </div>
    );
  }

  // Once content is pasted, display the actual rendered Google Doc in a styled rich editor
  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      {/* Sub-header toolbar for the rich view */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--zd-border)] bg-[var(--zd-surface)] shrink-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[var(--zd-primary-soft)] text-[var(--zd-primary)] border border-[var(--zd-primary)]/20">
            <FileText className="w-3 h-3" />
            Rendered Doc View
          </span>
          <span className="text-[11px] text-[var(--zd-text-muted)] hidden sm:inline">
            Directly editable · Auto-syncs to Markdown
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClipboardRead}
            title="Paste new formatted text from clipboard"
            className="text-xs gap-1.5 py-1 px-2.5"
          >
            {pasteSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Clipboard className="w-3.5 h-3.5 text-[var(--zd-primary)]" />
            )}
            <span>{pasteSuccess ? 'Pasted!' : 'Paste New'}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onSample}
            title="Load sample Google Doc"
            className="text-xs gap-1 py-1 px-2.5 text-[var(--zd-text-secondary)]"
          >
            <Sparkles className="w-3 h-3" />
            <span>Sample</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            title="Clear pasted document"
            className="text-xs gap-1 py-1 px-2.5 text-[var(--zd-error)] hover:bg-[var(--zd-error)]/10"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </Button>
        </div>
      </div>

      {/* Rich Rendered Document Container */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-[var(--zd-surface-raised)]/40 focus:outline-none">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          className="prose-rich min-h-full max-w-none text-[var(--zd-text-primary)] focus:outline-none leading-relaxed select-text"
          style={{ wordBreak: 'break-word' }}
        />
      </div>
    </div>
  );
}
