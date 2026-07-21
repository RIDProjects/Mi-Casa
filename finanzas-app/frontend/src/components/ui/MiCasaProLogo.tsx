import React from 'react';

interface Props {
  size?: number;
  className?: string;
}

export default function MiCasaProLogo({ size = 36, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* House outline */}
        <path
          d="M20 4L4 17V36H15V26H25V36H36V17L20 4Z"
          stroke="var(--ds-primary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Green trending arrow inside house */}
        <polyline
          points="10,28 16,22 21,25 30,16"
          stroke="#16a34a"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <polyline
          points="26,16 30,16 30,20"
          stroke="#16a34a"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span style={{ fontFamily: 'Inter, sans-serif', color: 'var(--ds-primary)', lineHeight: 1 }}>
        <span style={{ fontWeight: 400, fontSize: size * 0.45 }}>Mi Casa</span>
        <span style={{ fontWeight: 800, fontSize: size * 0.45 }}> Pro</span>
      </span>
    </div>
  );
}
