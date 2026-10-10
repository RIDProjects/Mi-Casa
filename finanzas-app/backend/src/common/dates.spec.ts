import { todayInAppTimezone, currentMonthInAppTimezone } from './dates';

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
