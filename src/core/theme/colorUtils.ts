/**
 * Color utility functions for ZeroDock Theme Engine
 */

export function isValidHex(hex: string): boolean {
  return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(hex.trim());
}

export function normalizeHex(hex: string): string {
  let clean = hex.trim();
  if (!clean.startsWith('#')) {
    clean = '#' + clean;
  }
  if (clean.length === 4) {
    // #RGB -> #RRGGBB
    clean = `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return clean.toUpperCase();
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!isValidHex(hex)) return null;
  const normalized = normalizeHex(hex);
  const num = parseInt(normalized.slice(1, 7), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = 1 + percent / 100;
  const r = Math.min(255, Math.max(0, Math.round(rgb.r * factor)));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g * factor)));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b * factor)));

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG relative contrast ratio for two opaque hex colors. */
export function getContrastRatio(foreground: string, background: string): number | null {
  if (!isValidHex(foreground) || !isValidHex(background)) return null;
  const lighter = Math.max(getLuminance(foreground), getLuminance(background));
  const darker = Math.min(getLuminance(foreground), getLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export function getContrastLabel(foreground: string, background: string): {
  label: 'AAA' | 'AA' | 'Low contrast';
  ratio: number | null;
} {
  const ratio = getContrastRatio(foreground, background);
  if (ratio !== null && ratio >= 7) return { label: 'AAA', ratio };
  if (ratio !== null && ratio >= 4.5) return { label: 'AA', ratio };
  return { label: 'Low contrast', ratio };
}

export function isDarkColor(hex: string): boolean {
  return getLuminance(hex) < 0.35;
}

/**
 * Converts any CSS color (hex, rgb, rgba) to a strict Monaco-compatible hex string (#RRGGBB or #RRGGBBAA).
 * Monaco's Color.fromHex parser throws/falls back to pure red (#FF0000) if given an rgba() string!
 */
export function toMonacoHex(color: string | undefined, fallbackHex: string): string {
  if (!color || typeof color !== 'string') return fallbackHex;
  const trimmed = color.trim();

  // If already hex, validate and return normalized hex
  if (trimmed.startsWith('#')) {
    if (isValidHex(trimmed)) return normalizeHex(trimmed);
    return fallbackHex;
  }

  // Parse rgba(r, g, b, a)
  const rgbaMatch = trimmed.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i);
  if (rgbaMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbaMatch[1], 10))).toString(16).padStart(2, '0');
    const g = Math.min(255, Math.max(0, parseInt(rgbaMatch[2], 10))).toString(16).padStart(2, '0');
    const b = Math.min(255, Math.max(0, parseInt(rgbaMatch[3], 10))).toString(16).padStart(2, '0');
    const alphaNum = Math.min(1, Math.max(0, parseFloat(rgbaMatch[4])));
    const a = Math.round(alphaNum * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}${a}`.toUpperCase();
  }

  // Parse rgb(r, g, b)
  const rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10))).toString(16).padStart(2, '0');
    const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10))).toString(16).padStart(2, '0');
    const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10))).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }

  return fallbackHex;
}
