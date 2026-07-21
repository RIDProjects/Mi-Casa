import { useState, useEffect, useRef } from 'react';

export function useCountUp(target: number, duration = 900, enabled = true): number {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>();
  const prevTarget = useRef(0);

  useEffect(() => {
    if (!enabled) { setValue(target); return; }
    if (target === prevTarget.current) return;

    const start = performance.now();
    const from = prevTarget.current;
    prevTarget.current = target;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);

    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, duration, enabled]);

  return value;
}
