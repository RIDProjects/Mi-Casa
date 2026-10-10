import { parseLocalDate, todayLocalISO, currentMonthLocal } from '../dates';

describe('dates (TZ=America/Havana)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('parseLocalDate keeps the calendar day for date-only strings', () => {
    const d = parseLocalDate('2026-10-10');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(0);
  });

  it('parseLocalDate passes full ISO timestamps through unchanged', () => {
    const iso = '2026-10-10T15:30:00.000Z';
    expect(parseLocalDate(iso).getTime()).toBe(new Date(iso).getTime());
  });

  it('parseLocalDate passes Date objects through', () => {
    const d = new Date(2026, 0, 5);
    expect(parseLocalDate(d).getTime()).toBe(d.getTime());
  });

  it('todayLocalISO uses the local day late in the evening', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-31T23:30:00-04:00'));
    expect(todayLocalISO()).toBe('2026-10-31');
  });

  it('currentMonthLocal stays in the local month on the last day', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-31T23:30:00-04:00'));
    expect(currentMonthLocal()).toBe('2026-10');
  });
});
