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
 * Decodes a compressed Base64 string from the URL back into the state object.
 */
export function decodeStateFromHash<T>(hash: string): T | null {
  try {
    const jsonString = LZString.decompressFromEncodedURIComponent(hash);
    if (jsonString) {
      return JSON.parse(jsonString) as T;
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
