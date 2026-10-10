const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number): string => String(n).padStart(2, '0');

// `new Date('2026-10-10')` is UTC midnight, which renders as the previous day
// in UTC-4/-5. Date-only strings are built from parts in local time instead;
// full timestamps and Date objects are passed through unchanged.
export function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const match = DATE_ONLY.exec(value);
  if (!match) return new Date(value);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function todayLocalISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function currentMonthLocal(): string {
  return todayLocalISO().slice(0, 7);
}
