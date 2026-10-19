import React from 'react';

interface Props {
  size?: number;
  className?: string;
  /** 'full' = mark + wordmark, 'mark' = tile only */
  variant?: 'full' | 'mark';
  /** Wordmark ink; use 'light' over dark/brand backgrounds */
  tone?: 'default' | 'light';
}

export function MiCasaMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Mi Casa Pro"
    >
      <rect width="48" height="48" rx="12" fill="#2563eb" />
      <path d="M8.5 24.5 24 10l15.5 14.5" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="13.5" y="31" width="6" height="8" rx="1.8" fill="#fff" fillOpacity=".55" />
      <rect x="20.5" y="26" width="6" height="13" rx="1.8" fill="#fff" />
      <rect x="27.5" y="22" width="6" height="17" rx="1.8" fill="#4ade80" />
    </svg>
  );
}

export default function MiCasaProLogo({ size = 36, className = '', variant = 'full', tone = 'default' }: Props) {
  if (variant === 'mark') return <MiCasaMark size={size} className={className} />;

  const ink = tone === 'light' ? 'text-white' : 'text-on-surface';
  const tag = tone === 'light'
    ? 'bg-white/15 text-white'
    : 'bg-primary-container/10 text-info-ink';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <MiCasaMark size={size} />
      <span className={`flex items-baseline gap-1.5 leading-none ${ink}`}>
        <span className="font-extrabold tracking-tight" style={{ fontSize: Math.round(size * 0.5) }}>
          Mi Casa
        </span>
        <span className={`rounded-md px-1.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${tag}`}>
          Pro
        </span>
      </span>
    </div>
  );
}
