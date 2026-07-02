import { useQuery } from 'react-query';
import { healthScoreAPI } from '../../services/api';

const COLOR: Record<string, string> = {
  green: 'text-green-600 dark:text-green-400',
  blue: 'text-blue-600 dark:text-blue-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-red-600 dark:text-red-400',
};

const BG: Record<string, string> = {
  green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
};

export function HealthScore() {
  const { data, isLoading } = useQuery(
    'health-score',
    () => healthScoreAPI.get().then(r => r.data),
    { retry: false }
  );

  if (isLoading) return <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />;
  if (!data) return null;

  const color: string = data.badgeColor ?? 'blue';

  return (
    <div className={`rounded-xl border p-4 ${BG[color] ?? BG.blue}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Salud Financiera</h3>
        <span className={`text-2xl font-bold ${COLOR[color] ?? COLOR.blue}`}>{data.score}/100</span>
      </div>
      <div className="mb-3">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-700 ${
              color === 'green' ? 'bg-green-500' :
              color === 'blue' ? 'bg-blue-500' :
              color === 'amber' ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${data.score}%` }}
          />
        </div>
        <p className={`text-xs font-medium mt-1 ${COLOR[color] ?? COLOR.blue}`}>{data.badge}</p>
      </div>
      {data.breakdown && (
        <div className="space-y-1">
          {Object.values(data.breakdown as Record<string, unknown>).map((item: any) => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
              <span className={item.points === item.max ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                {item.points}/{item.max}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
