import { useCurrencyStore } from '../store/currency.store';

export const SESSION_RESET_EVENT = 'session:reset';

/**
 * Drops client-side state that belongs to the previous session's house/user.
 * Also dispatches `session:reset` so `_app.tsx` clears the react-query cache.
 */
export function resetSessionState(): void {
  useCurrencyStore.setState({ currencies: [], rates: {}, activeCurrencyCode: '' });
  // setState re-persists the initial state, so remove the key afterwards.
  useCurrencyStore.persist.clearStorage();
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SESSION_RESET_EVENT));
}
