import { useEffect, useRef, useState } from 'react';

export function useMeasuredHeight(minHeight = 280) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(minHeight);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const measure = () => {
      const h = node.getBoundingClientRect().height;
      if (h >= minHeight) setHeight(Math.floor(h));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [minHeight]);

  return { ref, height };
}
