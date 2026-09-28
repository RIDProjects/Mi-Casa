// Helper único de formateo de moneda para toda la app.
// La casa tiene USD configurado como moneda local (house_currencies.isLocal)
// por defecto, pero ahora los gastos del household pueden registrarse en
// cualquier moneda activa de la casa (household-expenses multi-currency
// support), así que `currency` acepta cualquier código de 3 letras, no un
// union hardcodeado.

export type Currency = string;

const formatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formatea un monto numérico como moneda.
 * USD (default): "US$ 1,234.56" — moneda local histórica de la casa.
 * CUP: "1,234.56 CUP" — mismo patrón que ya usaban
 * ExpenseRegistryScreen/ShoppingListScreen.
 * Cualquier otro código: "1,234.56 <CODE>".
 */
export function formatMoney(amount: number, currency: Currency = 'USD'): string {
  const value = formatter.format(Number(amount) || 0);
  if (currency === 'USD') return `US$ ${value}`;
  return `${value} ${currency}`;
}
