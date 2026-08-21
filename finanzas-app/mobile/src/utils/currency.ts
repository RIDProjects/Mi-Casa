// Helper único de formateo de moneda para toda la app.
// La casa tiene USD configurado como moneda base (house_currencies.isBase) —
// casi todos los montos reales son en USD, así que ningún call site de la
// app pasa moneda explícita hoy. CUP queda disponible como parámetro para
// el día que algún módulo puntual lo necesite.

export type Currency = 'CUP' | 'USD';

const formatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formatea un monto numérico como moneda.
 * USD (default): "US$ 1,234.56" — moneda base de la casa.
 * CUP: "1,234.56 CUP" — mismo patrón que ya usaban
 * ExpenseRegistryScreen/ShoppingListScreen.
 */
export function formatMoney(amount: number, currency: Currency = 'USD'): string {
  const value = formatter.format(Number(amount) || 0);
  return currency === 'CUP' ? `${value} CUP` : `US$ ${value}`;
}
