// Screens poll through useScreenPolling (needs a navigation container). Screen tests render
// without one and must not run timers, so polling is off by default; the hook has its own test
// that uses the real implementation (jest.requireActual).
jest.mock('./src/hooks/useScreenPolling', () => ({
  POLL_INTERVAL_MS: 10000,
  useScreenPolling: () => false,
}));

// Font files are stubbed as `module.exports = 1` by jest-expo, which the RN asset registry no
// longer resolves; icon sets would reject while loading them. Tests never need real glyphs.
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));


// Reanimated/worklets need their native runtime, which does not exist under Jest. The swipe
// actions are a gesture affordance; tests exercise the inline buttons, so render children only.
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef(({ children }: { children: React.ReactNode }, _ref: unknown) => children),
  };
});
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    Extrapolation: { CLAMP: 'clamp' },
    interpolate: jest.fn(),
    useAnimatedStyle: () => ({}),
  };
});
