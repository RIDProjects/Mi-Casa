import { act, renderHook } from '@testing-library/react-native';
import { useAppFonts, FONT_LOAD_TIMEOUT_MS } from '../useAppFonts';

const mockUseFonts = jest.fn();
jest.mock('@expo-google-fonts/inter', () => ({
  useFonts: (...args: unknown[]) => mockUseFonts(...args),
  Inter_400Regular: 1, Inter_500Medium: 2, Inter_600SemiBold: 3, Inter_700Bold: 4, Inter_800ExtraBold: 5,
}));
jest.mock('@expo-google-fonts/work-sans', () => ({ WorkSans_600SemiBold: 6, WorkSans_700Bold: 7 }));

describe('useAppFonts', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseFonts.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it('is not ready while the fonts are loading', () => {
    mockUseFonts.mockReturnValue([false, null]);
    const { result } = renderHook(() => useAppFonts());
    expect(result.current).toBe(false);
  });

  it('is ready once the fonts loaded', () => {
    mockUseFonts.mockReturnValue([true, null]);
    const { result } = renderHook(() => useAppFonts());
    expect(result.current).toBe(true);
  });

  it('is ready when loading failed, so the app does not stay blank', () => {
    mockUseFonts.mockReturnValue([false, new Error('font load failed')]);
    const { result } = renderHook(() => useAppFonts());
    expect(result.current).toBe(true);
  });

  it('is ready after the timeout when loading never finishes', () => {
    mockUseFonts.mockReturnValue([false, null]);
    const { result } = renderHook(() => useAppFonts());
    act(() => { jest.advanceTimersByTime(FONT_LOAD_TIMEOUT_MS - 1); });
    expect(result.current).toBe(false);
    act(() => { jest.advanceTimersByTime(1); });
    expect(result.current).toBe(true);
  });
});
