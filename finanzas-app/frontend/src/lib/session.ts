import { useCurrencyStore } from '../store/currency.store';

/**
 * Drops client-side state that belongs to the previous session's house/user.
 * The react-query cache is cleared separately by `_app.tsx` on `auth:logout`.
 */
export function resetSessionState(): void {
  useCurrencyStore.setState({ currencies: [], rates: {}, activeCurrencyCode: '' });
  // setState re-persists the initial state, so remove the key afterwards.
  useCurrencyStore.persist.clearStorage();
}
