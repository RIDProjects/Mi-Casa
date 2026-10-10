import {
  todayInAppTimezone,
  currentMonthInAppTimezone,
  clampDay,
  addMonthsClamped,
  daysBetween,
} from './dates';

describe('app timezone dates', () => {
  const original = process.env.APP_TIMEZONE;
  afterEach(() => {
    jest.useRealTimers();
    if (original === undefined) delete process.env.APP_TIMEZONE;
    else process.env.APP_TIMEZONE = original;
  });

  it('defaults to America/Havana', () => {
    delete process.env.APP_TIMEZONE;
    jest.useFakeTimers().setSystemTime(new Date('2026-11-01T02:00:00Z'));
    expect(todayInAppTimezone()).toBe('2026-10-31');
    expect(currentMonthInAppTimezone()).toBe('2026-10');
  });

  it('honours APP_TIMEZONE', () => {
    process.env.APP_TIMEZONE = 'UTC';
    jest.useFakeTimers().setSystemTime(new Date('2026-11-01T02:00:00Z'));
    expect(todayInAppTimezone()).toBe('2026-11-01');
    expect(currentMonthInAppTimezone()).toBe('2026-11');
  });
});

describe('calendar date helpers', () => {
  it('clampDay clamps to the last day of the month', () => {
    expect(clampDay(2027, 2, 31)).toBe('2027-02-28');
    expect(clampDay(2028, 2, 31)).toBe('2028-02-29');
    expect(clampDay(2026, 4, 31)).toBe('2026-04-30');
    expect(clampDay(2026, 1, 31)).toBe('2026-01-31');
    expect(clampDay(2026, 5, 7)).toBe('2026-05-07');
  });

  it('addMonthsClamped clamps and rolls over years', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2026-01-31', 2)).toBe('2026-03-31');
    expect(addMonthsClamped('2026-11-15', 3)).toBe('2027-02-15');
    expect(addMonthsClamped('2026-05-31', 0)).toBe('2026-05-31');
    expect(addMonthsClamped('2026-12-31', 14)).toBe('2028-02-29');
  });

  it('daysBetween counts calendar days', () => {
    expect(daysBetween('2026-10-31', '2026-10-31')).toBe(0);
    expect(daysBetween('2026-10-31', '2026-11-03')).toBe(3);
    expect(daysBetween('2026-11-03', '2026-10-31')).toBe(-3);
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
  });
});
