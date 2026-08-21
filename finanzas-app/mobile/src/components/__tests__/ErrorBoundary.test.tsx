import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ErrorBoundary } from '../ErrorBoundary';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

// A child that throws on render unless `shouldThrow` is false. Used to
// simulate an unexpected render crash bubbling up to the ErrorBoundary.
function Bomb({ shouldThrow }: { shouldThrow: boolean }): React.ReactElement {
  if (shouldThrow) {
    throw new Error('Boom: unexpected render crash');
  }
  return <Text>All good</Text>;
}

describe('ErrorBoundary', () => {
  // React logs the caught error to the console during tests; keep test
  // output clean without hiding real assertion failures.
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <Text>Hello world</Text>
      </ErrorBoundary>
    );

    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('renders the fallback UI instead of crashing when a child throws during render', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Algo salió mal')).toBeTruthy();
    expect(screen.getByText('Reintentar')).toBeTruthy();
    expect(screen.queryByText('All good')).toBeNull();
  });

  it('reports the caught error to Sentry', () => {
    const Sentry = require('@sentry/react-native');

    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );

    // React's dev mode double-invokes the failing render pass to produce a
    // better error message, which can call componentDidCatch more than
    // once; what matters is that it was reported at least once, with the
    // right shape.
    expect(Sentry.captureException).toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        contexts: expect.objectContaining({
          react: expect.anything(),
        }),
      })
    );
  });

  it('resets the error state and re-renders children when "Reintentar" is pressed', () => {
    let shouldThrow = true;

    function Wrapper(): React.ReactElement {
      return (
        <ErrorBoundary>
          <Bomb shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    }

    const { rerender } = render(<Wrapper />);

    // Fallback is shown after the crash.
    expect(screen.getByText('Algo salió mal')).toBeTruthy();

    // Fix the underlying condition before retrying, like a real recovery
    // (e.g. data becomes available, network recovers, etc.), and propagate
    // the new children down through the tree. The boundary keeps showing
    // the fallback (hasError is still true) until "Reintentar" is pressed.
    shouldThrow = false;
    rerender(<Wrapper />);
    expect(screen.getByText('Algo salió mal')).toBeTruthy();

    fireEvent.press(screen.getByText('Reintentar'));

    expect(screen.getByText('All good')).toBeTruthy();
    expect(screen.queryByText('Algo salió mal')).toBeNull();
  });
});
