import { useCurrencyStore } from '../../store/currency.store';

export function CurrencyToggle() {
  const { currencies, activeCurrencyCode, setActiveCurrency } = useCurrencyStore();

  if (currencies.length <= 1) return null;

  const selectedCode =
    currencies.find(c => c.currencyCode === activeCurrencyCode)?.currencyCode ??
    currencies.find(c => c.isLocal)?.currencyCode;

  return (
    <div className="flex items-center gap-1 bg-surface-container dark:bg-surface-container rounded-[10px] p-1 border border-border-light">
      {currencies.map(c => (
        <button
          key={c.currencyCode}
          onClick={() => setActiveCurrency(c.currencyCode)}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
            selectedCode === c.currencyCode
              ? 'bg-surface-container-lowest dark:bg-surface-high text-on-surface shadow-soft'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {c.currencyCode}
        </button>
      ))}
    </div>
  );
}
