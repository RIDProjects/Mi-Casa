/** Shared Recharts styling so every chart follows the active theme (light/dark). */
export const CHART_GRID_STROKE = 'var(--ds-border-light)';

export const CHART_TICK = { fontSize: 11, fill: 'var(--ds-on-surface-variant)' } as const;

export const CHART_TOOLTIP = {
  background: 'var(--ds-panel)',
  border: '1px solid var(--ds-border-light)',
  borderRadius: 12,
  fontSize: 12,
  color: 'var(--ds-on-surface)',
  boxShadow: '0 6px 16px -4px rgba(16,24,40,0.18)',
} as const;

export const CHART_TOOLTIP_LABEL = { color: 'var(--ds-on-surface)', fontWeight: 600 } as const;

/** Recharts paints each tooltip row in the series colour, or black when it has none (pie slices): force the theme ink. */
export const CHART_TOOLTIP_ITEM = { color: 'var(--ds-on-surface)' } as const;

export const CHART_CURSOR = { fill: 'var(--ds-surface-low)' } as const;

export const CHART_COLORS = {
  income: '#16a34a',
  expense: '#ef4444',
  ant: '#d97706',
  previous: '#94a3b8',
  current: '#2563eb',
} as const;

/** Compact axis labels: 1.500.000 -> "$1,5M", 900.000 -> "$900k". */
export function formatAxisMoney(value: number, symbol = '$'): string {
  const v = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}${symbol}${(m >= 10 ? m.toFixed(0) : m.toFixed(1)).replace('.', ',')}M`;
  }
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(0)}k`;
  return `${sign}${symbol}${abs.toFixed(0)}`;
}
