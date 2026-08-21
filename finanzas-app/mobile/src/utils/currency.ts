// Helper único de formateo de moneda para toda la app.
// El hogar es cubano: la moneda base es CUP. USD se soporta para cuando
// haya features que lo necesiten (todavía ninguna lo usa).

export type Currency = 'CUP' | 'USD';

const cupFormatter = new Intl.NumberFormat('es-CU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formatea un monto numérico como moneda.
 * CUP (default): "1,234.56 CUP" — mismo patrón que ya usaban
 * ExpenseRegistryScreen/ShoppingListScreen.
 * USD: "US$ 1,234.56" — prefijo claramente distinguible de CUP.
 */
export function formatMoney(amount: number, currency: Currency = 'CUP'): string {
  const value = cupFormatter.format(Number(amount) || 0);
  return currency === 'USD' ? `US$ ${value}` : `${value} CUP`;
}
