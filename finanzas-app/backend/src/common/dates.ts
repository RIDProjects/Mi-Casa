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
