export const Colors = {
  // Fondos
  background: '#111827',   // gray-900
  card: '#1f2937',         // gray-800
  cardAlt: '#374151',      // gray-700
  border: '#374151',       // gray-700
  inputBg: '#374151',      // gray-700

  // Primarios
  green: '#16a34a',
  red: '#dc2626',
  blue: '#2563eb',

  // Texto
  textPrimary: '#f9fafb',   // gray-50
  textSecondary: '#9ca3af', // gray-400
  textMuted: '#6b7280',     // gray-500

  // Fondos con tinte
  greenBg: 'rgba(22, 163, 74, 0.15)',
  redBg: 'rgba(220, 38, 38, 0.15)',
  blueBg: 'rgba(37, 99, 235, 0.15)',

  // Extras
  white: '#ffffff',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Categorías (paleta para los gastos)
  categories: {
    Comida: '#f59e0b',
    Transporte: '#3b82f6',
    Hogar: '#8b5cf6',
    Salud: '#ef4444',
    Ocio: '#ec4899',
    Salidas: '#f97316',
    Shopper: '#06b6d4',
    Otros: '#6b7280',
  } as Record<string, string>,
} as const;
