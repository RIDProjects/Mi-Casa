// Screens poll through useScreenPolling (needs a navigation container). Screen tests render
// without one and must not run timers, so polling is off by default; the hook has its own test
// that uses the real implementation (jest.requireActual).
jest.mock('./src/hooks/useScreenPolling', () => ({
  POLL_INTERVAL_MS: 10000,
  useScreenPolling: () => false,
}));
