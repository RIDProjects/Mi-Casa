import React, { useEffect, useState } from 'react';

type Tone = 'spend' | 'goal' | 'blue' | 'green' | 'amber' | 'red';

interface ProgressBarProps {
  /** Percentage; values above 100 are clamped visually but kept for the tone. */
  value: number;
  /**
   * spend: higher is worse (green → amber >80 → red >100). goal: higher is better (blue → green at 100).
   * Or force a fixed color.
   */
  tone?: Tone;
  label?: React.ReactNode;
  valueLabel?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

const FILL: Record<Exclude<Tone, 'spend' | 'goal'>, string> = {
  blue: 'bg-primary-container',
  green: 'bg-success',
  amber: 'bg-warning',
  red: 'bg-danger',
};

export function toneFor(value: number, tone: Tone): Exclude<Tone, 'spend' | 'goal'> {
  if (tone === 'spend') return value > 100 ? 'red' : value > 80 ? 'amber' : 'green';
  if (tone === 'goal') return value >= 100 ? 'green' : 'blue';
  return tone;
}

export function ProgressBar({ value, tone = 'goal', label, valueLabel, size = 'md', className = '' }: ProgressBarProps) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const width = Math.min(100, safe);
  const fill = FILL[toneFor(safe, tone)];

  // Start empty and grow to the real value after the first paint so the fill is visible as motion.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className={className}>
      {(label || valueLabel !== undefined) && (
        <div className="flex items-baseline justify-between gap-3 mb-1.5 text-xs">
          <span className="text-on-surface-variant">{label}</span>
          <span className="font-semibold text-on-surface fin-number">{valueLabel ?? `${safe.toFixed(0)}%`}</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(safe)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full rounded-full bg-surface-variant overflow-hidden ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}
      >
        <div className={`h-full rounded-full transition-[width] duration-[900ms] ease-out ${fill}`} style={{ width: mounted ? `${width}%` : '0%' }} />
      </div>
    </div>
  );
}
