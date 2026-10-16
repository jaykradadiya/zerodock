import LZString from 'lz-string';

/**
 * Encodes a state object into a compressed Base64 string suitable for URLs.
 */
export function encodeStateToHash<T>(state: T): string {
  try {
    const jsonString = JSON.stringify(state);
    return LZString.compressToEncodedURIComponent(jsonString);
  } catch (error: unknown) {
    console.error('Failed to encode state:', error);
    return '';
  }
}

/**
 * Safe reviver to eliminate prototype pollution keys
 */
function safeJsonReviver(key: string, value: unknown): unknown {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    return undefined;
  }
  return value;
}

/**
 * Decodes a compressed Base64 string from the URL back into the state object safely.
 */
export function decodeStateFromHash<T>(hash: string): T | null {
  try {
    if (!hash || typeof hash !== 'string' || hash.length > 2_000_000) {
      return null;
    }
    const jsonString = LZString.decompressFromEncodedURIComponent(hash);
    if (jsonString) {
      // Guard against decompression bombs / excessive memory allocation
      if (jsonString.length > 5_000_000) {
        console.warn('ZeroDock: Decoded URL state exceeds maximum allowed size.');
        return null;
      }
      return JSON.parse(jsonString, safeJsonReviver) as T;
    }
  } catch (error: unknown) {
    console.error('Failed to decode state:', error);
  }
  return null;
}

/**
 * Updates the browser's URL hash with the encoded state without reloading the page.
 */
export function updateURLWithState<T>(state: T): void {
  if (typeof window === 'undefined') return;
  const hash = encodeStateToHash(state);
  const newUrl = hash
    ? `${window.location.pathname}${window.location.search}#${hash}`
    : `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', newUrl);
}

/**
 * Retrieves the decoded state from the current window's URL hash.
 */
export function getStateFromURL<T>(): T | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  return decodeStateFromHash<T>(hash);
}
