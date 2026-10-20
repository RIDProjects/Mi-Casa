// Pro-Ledger design tokens, mirrored from the web app (frontend/src/styles/globals.css).
// Light = "Pro-Ledger Financial", dark = "Pro-Ledger Night".

export interface ThemeColors {
  surface: string;          // screen background
  panel: string;            // card fill
  surfaceLow: string;
  surfaceContainer: string; // inputs, chips, table headers
  surfaceHigh: string;
  border: string;
  onSurface: string;        // primary text
  onSurfaceVariant: string; // secondary text
  outline: string;          // muted text / icons
  primary: string;          // text-safe accent (links, active tab)
  brand: string;            // solid brand blue (buttons)
  onBrand: string;
  okInk: string;
  warnInk: string;
  dangerInk: string;
  infoInk: string;
  okTint: string;
  warnTint: string;
  dangerTint: string;
  infoTint: string;
  grid: string;             // ledger background lines
  glow: string;             // ledger background glow
  ringTrack: string;
  overlay: string;
}

export const lightColors: ThemeColors = {
  surface: '#f9f9ff',
  panel: '#ffffff',
  surfaceLow: '#f0f3ff',
  surfaceContainer: '#e7eeff',
  surfaceHigh: '#dee8ff',
  border: '#e2e8f0',
  onSurface: '#111c2d',
  onSurfaceVariant: '#434655',
  outline: '#737686',
  primary: '#004ac6',
  brand: '#2563eb',
  onBrand: '#ffffff',
  okInk: '#15803d',
  warnInk: '#b45309',
  dangerInk: '#b91c1c',
  infoInk: '#1d4ed8',
  okTint: 'rgba(22,163,74,0.12)',
  warnTint: 'rgba(217,119,6,0.12)',
  dangerTint: 'rgba(220,38,38,0.10)',
  infoTint: 'rgba(37,99,235,0.10)',
  grid: 'rgba(37,99,235,0.055)',
  glow: 'rgba(37,99,235,0.10)',
  ringTrack: 'rgba(37,99,235,0.10)',
  overlay: 'rgba(17,28,45,0.45)',
};

export const darkColors: ThemeColors = {
  surface: '#0b1326',
  panel: '#131b2e',
  surfaceLow: '#131b2e',
  surfaceContainer: '#171f33',
  surfaceHigh: '#222a3d',
  border: '#2d3449',
  onSurface: '#dae2fd',
  onSurfaceVariant: '#c3c6d7',
  outline: '#8d90a0',
  primary: '#b4c5ff',
  brand: '#2563eb',
  onBrand: '#ffffff',
  okInk: '#4ade80',
  warnInk: '#fbbf24',
  dangerInk: '#f87171',
  infoInk: '#b4c5ff',
  okTint: 'rgba(74,222,128,0.14)',
  warnTint: 'rgba(251,191,36,0.14)',
  dangerTint: 'rgba(248,113,113,0.14)',
  infoTint: 'rgba(180,197,255,0.14)',
  grid: 'rgba(180,197,255,0.045)',
  glow: 'rgba(37,99,235,0.22)',
  ringTrack: 'rgba(180,197,255,0.10)',
  overlay: 'rgba(0,0,0,0.6)',
};

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

// Custom font families (loaded in App.tsx). fontWeight is ignored for custom fonts
// on Android, so each weight is its own family.
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  title: 'WorkSans_700Bold',
  titleSemibold: 'WorkSans_600SemiBold',
} as const;

export function toneInk(colors: ThemeColors, tone: Tone): string {
  switch (tone) {
    case 'ok': return colors.okInk;
    case 'warn': return colors.warnInk;
    case 'danger': return colors.dangerInk;
    case 'info': return colors.infoInk;
    default: return colors.onSurfaceVariant;
  }
}

export function toneTint(colors: ThemeColors, tone: Tone): string {
  switch (tone) {
    case 'ok': return colors.okTint;
    case 'warn': return colors.warnTint;
    case 'danger': return colors.dangerTint;
    case 'info': return colors.infoTint;
    default: return colors.surfaceContainer;
  }
}
