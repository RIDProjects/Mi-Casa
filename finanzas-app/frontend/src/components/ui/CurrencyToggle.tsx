import { useCurrencyStore } from '../../store/currency.store';

export function CurrencyToggle() {
  const { currencies, activeCurrencyCode, setActiveCurrency } = useCurrencyStore();

  if (currencies.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {currencies.map(c => (
        <button
          key={c.currencyCode}
          onClick={() => setActiveCurrency(c.currencyCode)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            activeCurrencyCode === c.currencyCode
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {c.currencyCode}
        </button>
      ))}
    </div>
  );
}
