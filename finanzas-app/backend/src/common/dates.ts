export const DEFAULT_APP_TIMEZONE = 'America/Havana';

function appTimezone(): string {
  return process.env.APP_TIMEZONE || DEFAULT_APP_TIMEZONE;
}

// Calendar date (YYYY-MM-DD) of `now` in the app timezone. The 'en-CA'
// locale formats as YYYY-MM-DD.
export function todayInAppTimezone(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: appTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function currentMonthInAppTimezone(now: Date = new Date()): string {
  return todayInAppTimezone(now).slice(0, 7);
}

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

// YYYY-MM-DD for the given year/month (1-12), with `day` clamped to the last
// day of that month (e.g. day 31 in February -> 28/29).
export function clampDay(year: number, month: number, day: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${pad(year, 4)}-${pad(month)}-${pad(Math.min(day, lastDay))}`;
}

// Adds `months` to a YYYY-MM-DD string, keeping the original day when the
// target month has it and clamping to the month end otherwise.
export function addMonthsClamped(ymd: string, months: number): string {
  const [year, month, day] = ymd.slice(0, 10).split('-').map(Number);
  const index = year * 12 + (month - 1) + months;
  return clampDay(Math.floor(index / 12), (index % 12) + 1, day);
}

// Whole calendar days from `fromYmd` to `toYmd` (negative if `toYmd` is earlier).
export function daysBetween(fromYmd: string, toYmd: string): number {
  const toUtc = (ymd: string) => {
    const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(toYmd) - toUtc(fromYmd)) / 86400000);
}
