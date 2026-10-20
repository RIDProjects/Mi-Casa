import { renderHook } from '@testing-library/react-native';

const mockUseIsFocused = jest.fn();
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockUseIsFocused() }));

const { useScreenPolling, POLL_INTERVAL_MS } = jest.requireActual('../useScreenPolling') as typeof import('../useScreenPolling');

describe('useScreenPolling', () => {
  it('polls every 10 seconds while the screen is focused', () => {
    mockUseIsFocused.mockReturnValue(true);
    const { result } = renderHook(() => useScreenPolling());
    expect(result.current).toBe(POLL_INTERVAL_MS);
    expect(POLL_INTERVAL_MS).toBe(10000);
  });

  it('does not poll once the screen loses focus', () => {
    mockUseIsFocused.mockReturnValue(false);
    const { result } = renderHook(() => useScreenPolling());
    expect(result.current).toBe(false);
  });
});
