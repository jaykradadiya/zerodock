import { useState, useEffect, type ChangeEvent } from 'react';
import type { ThemeTokens } from '../../../core/theme/types';
import { RotateCcw, Copy, Check } from 'lucide-react';
import { isValidHex, normalizeHex } from '../../../core/theme/colorUtils';

interface ColorTokenEditorProps {
  tokenKey: keyof ThemeTokens;
  label: string;
  description: string;
  currentValue: string;
  defaultValue: string;
  isOverridden: boolean;
  onChange: (tokenKey: keyof ThemeTokens, hexValue: string) => void;
  onReset: (tokenKey: keyof ThemeTokens) => void;
}

export function ColorTokenEditor({
  tokenKey,
  label,
  description,
  currentValue,
  defaultValue,
  isOverridden,
  onChange,
  onReset,
}: ColorTokenEditorProps) {
  const [inputValue, setInputValue] = useState(currentValue);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setInputValue(currentValue);
  }, [currentValue]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (isValidHex(val)) {
      onChange(tokenKey, normalizeHex(val));
    }
  };

  const handlePickerChange = (e: ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value.toUpperCase();
    setInputValue(hex);
    onChange(tokenKey, hex);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Convert rgba(...) or hex to a safe hex for native input[type=color]
  const safePickerColor = isValidHex(currentValue)
    ? normalizeHex(currentValue).slice(0, 7)
    : isValidHex(defaultValue)
    ? normalizeHex(defaultValue).slice(0, 7)
    : '#8B7CF7';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-[var(--zd-border)] bg-[var(--zd-surface)] hover:bg-[var(--zd-surface-raised)] transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--zd-text-primary)]">
            {label}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--zd-bg)] border border-[var(--zd-border)] text-[var(--zd-text-muted)]">
            {tokenKey}
          </span>
          {isOverridden && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--zd-primary)]" title="Modified" />
          )}
        </div>
        <p className="text-[11px] text-[var(--zd-text-muted)] mt-0.5 leading-snug">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        {/* Swatch / Native Color Picker */}
        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[var(--zd-border-hover)] shrink-0 shadow-xs cursor-pointer group">
          <div
            className="w-full h-full transition-transform group-hover:scale-110"
            style={{ backgroundColor: currentValue }}
          />
          <input
            type="color"
            value={safePickerColor}
            onChange={handlePickerChange}
            aria-label={`Pick color for ${label}`}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>

        {/* Hex Text Input */}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="#HEX"
          spellCheck={false}
          className="w-24 h-8 px-2 rounded-lg border border-[var(--zd-border)] bg-[var(--zd-bg)] text-xs font-mono text-[var(--zd-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--zd-primary)] focus:border-[var(--zd-primary)]"
        />

        {/* Copy Hex Button */}
        <button
          type="button"
          onClick={handleCopy}
          title="Copy hex code"
          aria-label="Copy color hex"
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--zd-border)] bg-[var(--zd-bg)] hover:bg-[var(--zd-surface)] text-[var(--zd-text-secondary)] hover:text-[var(--zd-text-primary)] transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[var(--zd-success)]" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {/* Reset button */}
        {isOverridden && (
          <button
            type="button"
            onClick={() => onReset(tokenKey)}
            title={`Reset to default (${defaultValue})`}
            aria-label="Reset color to default"
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[var(--zd-border)] bg-[var(--zd-bg)] hover:bg-[var(--zd-error)]/10 text-[var(--zd-text-secondary)] hover:text-[var(--zd-error)] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
