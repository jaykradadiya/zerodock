import { useEffect, useRef } from 'react';
import { getStateFromURL, updateURLWithState } from '../utils/state-share';

/**
 * Restore state from URL hash on mount and persist state to hash when values change.
 * Skips the write triggered by applying URL state so session/default state cannot
 * overwrite a shared link (especially under React StrictMode remount).
 */
export function useSyncToolUrl<T extends object>(
  getState: () => T,
  setValues: (partial: Partial<T>) => void,
  deps: unknown[]
) {
  const hydrated = useRef(false);
  const skipNextWrite = useRef(false);

  useEffect(() => {
    const fromUrl = getStateFromURL<T>();
    if (fromUrl) {
      skipNextWrite.current = true;
      setValues(fromUrl);
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    updateURLWithState(getState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
