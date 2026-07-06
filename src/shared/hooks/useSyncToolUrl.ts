import { useEffect, useRef } from 'react';
import { getStateFromURL, updateURLWithState } from '../utils/state-share';

/**
 * Restore state from URL hash on mount and persist state to hash when values change.
 */
export function useSyncToolUrl<T extends object>(
  getState: () => T,
  setValues: (partial: Partial<T>) => void,
  deps: unknown[]
) {
  const hydrated = useRef(false);

  useEffect(() => {
    const fromUrl = getStateFromURL<T>();
    if (fromUrl) {
      setValues(fromUrl);
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    updateURLWithState(getState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
