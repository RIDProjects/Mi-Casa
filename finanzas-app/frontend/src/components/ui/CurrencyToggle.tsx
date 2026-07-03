import { useCurrencyStore } from '../../store/currency.store';

const CURRENCIES = ['CUP', 'MLC', 'USD'] as const;

export function CurrencyToggle() {
  const { activeCurrency, setActiveCurrency } = useCurrencyStore();
  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {CURRENCIES.map(c => (
        <button
          key={c}
          onClick={() => setActiveCurrency(c)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            activeCurrency === c
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
