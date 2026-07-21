/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ── Pro-Ledger token colors (CSS-var-backed — switch light/dark automatically) ── */
        'surface':                  'var(--ds-surface)',
        'surface-dim':              'var(--ds-surface-dim)',
        'surface-bright':           'var(--ds-surface-bright)',
        'surface-container-lowest': 'var(--ds-surface-lowest)',
        'surface-container-low':    'var(--ds-surface-low)',
        'surface-container':        'var(--ds-surface-container)',
        'surface-container-high':   'var(--ds-surface-high)',
        'surface-container-highest':'var(--ds-surface-highest)',
        'surface-variant':          'var(--ds-surface-variant)',
        'surface-gray':             'var(--ds-surface-gray)',
        'on-surface':               'var(--ds-on-surface)',
        'on-surface-variant':       'var(--ds-on-surface-variant)',
        'outline':                  'var(--ds-outline)',
        'outline-variant':          'var(--ds-outline-variant)',
        'inverse-surface':          'var(--ds-inverse-surface)',
        'inverse-on-surface':       'var(--ds-inverse-on-surface)',
        'border-light':             'var(--ds-border-light)',

        /* ── Primary (CSS-var — blue light / blue-light dark) ── */
        'primary':                  'var(--ds-primary)',
        'primary-container':        '#2563eb',
        'on-primary':               '#ffffff',
        'on-primary-container':     '#eeefff',
        'primary-fixed':             '#dbe1ff',
        'primary-fixed-dim':         '#b4c5ff',
        'on-primary-fixed':          '#00174b',
        'on-primary-fixed-variant':  '#003ea8',
        'inverse-primary':           'var(--ds-inverse-primary)',
        'surface-tint':              'var(--ds-surface-tint)',

        /* ── Advisory panels (always dark, both modes) ── */
        'advisory-bg':               'var(--ds-advisory-bg)',
        'advisory-text':             'var(--ds-advisory-text)',
        'advisory-text-dim':         'var(--ds-advisory-text-dim)',

        /* ── Secondary (purple) ── */
        'secondary':                 '#712ae2',
        'secondary-container':       '#8a4cfc',
        'on-secondary':              '#ffffff',
        'secondary-fixed':           '#eaddff',
        'secondary-fixed-dim':       '#d2bbff',
        'on-secondary-fixed':        '#25005a',
        'on-secondary-fixed-variant':'#5a00c6',

        /* ── Error / Danger extended ── */
        'error':                     '#ba1a1a',
        'on-error':                  '#ffffff',
        'error-container':           '#ffdad6',
        'on-error-container':        '#93000a',

        /* ── Brand utils (used in Stitch transacciones) ── */
        'brand-amber':               '#f59e0b',
        'brand-gray':                '#4b5563',

        /* ── Backward-compat scale aliases (existing components) ── */
        'primary-200': '#b4c5ff',
        'primary-500': '#2563eb',
        'primary-600': '#004ac6',
        'primary-700': '#003ea8',
        'primary-900': '#00174b',

        /* ── Semantic ── */
        'success':          '#16a34a',
        'warning':          '#d97706',
        'danger':           '#dc2626',
        'decorative-rose':  '#e11d48',
        'slate-muted':      '#64748b',

        /* ── Gray remap → Pro-Ledger Night surfaces (dark mode backward compat) ── */
        gray: {
          50:  '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#222a3d',   /* surface-container-high */
          900: '#131b2e',   /* surface-container-low (dark cards) */
          950: '#060e20',   /* surface-container-lowest (dark sidebar) */
        },
      },

      fontFamily: {
        sans:         ['Inter', 'system-ui', 'sans-serif'],
        title:        ['"Work Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono:         ['"JetBrains Mono"', 'monospace'],
        'formula-code': ['"Courier Prime"', 'monospace'],
        /* Font-family utilities matching Stitch design */
        'body-default':  ['Inter'],
        'body-small':    ['Inter'],
        'body-sm':       ['Inter'],
        'label-upper':   ['Inter'],
        'label-md':      ['"JetBrains Mono"'],
        'label-sm':      ['"JetBrains Mono"'],
        'card-title':    ['Inter'],
        'section-title': ['Inter'],
        'page-title':    ['Inter'],
        'module-title':  ['Inter'],
        'caption':       ['Inter'],
        'step-title':    ['Inter'],
        'hero-title':    ['Inter'],
        'headline-xl':   ['"Work Sans"'],
        'headline-lg':   ['"Work Sans"'],
        'headline-md':   ['"Work Sans"'],
      },

      fontSize: {
        /* Pro-Ledger Financial (light) typography */
        'hero-title':    ['58px',   { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '900' }],
        'module-title':  ['35px',   { lineHeight: '1.05', fontWeight: '900' }],
        'page-title':    ['32px',   { lineHeight: '1.2',  fontWeight: '800' }],
        'section-title': ['15px',   { lineHeight: '1.4',  fontWeight: '700' }],
        'body-default':  ['14px',   { lineHeight: '1.6',  fontWeight: '400' }],
        'card-title':    ['13px',   { lineHeight: '1.4',  fontWeight: '700' }],
        'step-title':    ['12.5px', { lineHeight: '1.4',  fontWeight: '700' }],
        'body-small':    ['12px',   { lineHeight: '1.4',  fontWeight: '400' }],
        'caption':       ['11.5px', { lineHeight: '1.5',  fontWeight: '400' }],
        'label-upper':   ['10px',   { lineHeight: '1',    letterSpacing: '0.05em', fontWeight: '700' }],
        'formula-code':  ['12px',   { lineHeight: '1.4',  letterSpacing: '0.3px', fontWeight: '400' }],
        /* Pro-Ledger Night typography */
        'headline-xl':   ['48px',   { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg':   ['32px',   { lineHeight: '40px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md':   ['24px',   { lineHeight: '32px', fontWeight: '600' }],
        'body-lg':       ['18px',   { lineHeight: '28px', fontWeight: '400' }],
        'body-md':       ['16px',   { lineHeight: '24px', fontWeight: '400' }],
        'body-sm':       ['14px',   { lineHeight: '20px', fontWeight: '400' }],
        'label-md':      ['14px',   { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '500' }],
        'label-sm':      ['12px',   { lineHeight: '14px', letterSpacing: '0.05em', fontWeight: '500' }],
      },

      spacing: {
        'margin-page-x': '48px',
        'margin-page-y': '56px',
        'card-padding':  '18px',
        'gutter':        '20px',
        'item-padding-x':'16px',
        'item-padding-y':'14px',
      },

      borderRadius: {
        'card':        '12px',
        'interactive': '10px',
        'input':       '8px',
      },

      boxShadow: {
        'card-hover': '0 0 0 1.5px rgba(37,99,235,0.3)',
        'modal':      '0 20px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.3)',
        'premium':    '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
      },

      animation: {
        'modal-in':    'modalIn 220ms cubic-bezier(0.23,1,0.32,1) both',
        'slide-in':    'slideIn 280ms cubic-bezier(0.32,0.72,0,1) both',
        'backdrop-in': 'backdropIn 200ms ease-out both',
        'fade-up':     'fadeUp 220ms cubic-bezier(0.23,1,0.32,1) both',
        'stagger-1':   'fadeUp 220ms cubic-bezier(0.23,1,0.32,1) 30ms  both',
        'stagger-2':   'fadeUp 220ms cubic-bezier(0.23,1,0.32,1) 60ms  both',
        'stagger-3':   'fadeUp 220ms cubic-bezier(0.23,1,0.32,1) 90ms  both',
      },
      keyframes: {
        modalIn:    { from: { opacity:'0', transform:'scale(0.96) translateY(10px)' }, to: { opacity:'1', transform:'scale(1) translateY(0)' } },
        slideIn:    { from: { transform:'translateX(-100%)' }, to: { transform:'translateX(0)' } },
        backdropIn: { from: { opacity:'0' }, to: { opacity:'1' } },
        fadeUp:     { from: { opacity:'0', transform:'translateY(8px)' }, to: { opacity:'1', transform:'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
