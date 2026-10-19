import { useQuery } from 'react-query';
import { healthScoreAPI } from '../../services/api';

const COLOR: Record<string, string> = {
  green: 'text-ok-ink',
  blue: 'text-info-ink',
  amber: 'text-warn-ink',
  red: 'text-danger-ink',
};

const BAR: Record<string, string> = {
  green: 'bg-success',
  blue: 'bg-primary-container',
  amber: 'bg-warning',
  red: 'bg-danger',
};

export function HealthScore() {
  const { data, isLoading } = useQuery(
    'health-score',
    () => healthScoreAPI.get().then(r => r.data),
    { retry: false }
  );

  if (isLoading) return <div className="skeleton h-28 rounded-[14px]" />;
  if (!data) return null;

  const color: string = BAR[data.badgeColor] ? data.badgeColor : 'blue';

  return (
    <div className="rounded-[14px] border border-border-light bg-surface-container-lowest dark:bg-surface-container-low shadow-soft p-5">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h3 className="font-label-upper text-label-upper uppercase text-on-surface-variant">Salud financiera</h3>
          <p className={`text-xs font-semibold mt-1 ${COLOR[color]}`}>{data.badge}</p>
        </div>
        <span className={`fin-hero !text-[32px] ${COLOR[color]}`}>
          {data.score}<span className="text-sm font-medium text-outline">/100</span>
        </span>
      </div>
      <div
        className="h-2 bg-surface-variant rounded-full overflow-hidden mb-4"
        role="progressbar"
        aria-valuenow={data.score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-2 rounded-full transition-all duration-700 ${BAR[color]}`} style={{ width: `${data.score}%` }} />
      </div>
      {data.breakdown && (
        <ul className="space-y-1.5 border-t border-border-light pt-3">
          {Object.values(data.breakdown as Record<string, unknown>).map((item: any) => (
            <li key={item.label} className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant">{item.label}</span>
              <span className={`font-semibold tabular-nums ${item.points === item.max ? 'text-ok-ink' : 'text-outline'}`}>
                {item.points}/{item.max}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
