import { useAuthStore } from '../store/auth.store';
import { useCurrencyStore } from '../store/currency.store';

const CURRENCY_KEY = 'mi-casa-currency-v2';

const usd = { id: '2', currencyCode: 'USD', currencyName: 'Dollar', symbol: 'US$', locale: 'en-US', isLocal: false, isActive: true };
const userA = { id: 'a', name: 'A', email: 'a@x.com', roles: [], house: { id: 'h1', name: 'H1' } };
const userB = { id: 'b', name: 'B', email: 'b@x.com', roles: [], house: { id: 'h2', name: 'H2' } };

const seedCurrencyStore = () =>
  useCurrencyStore.setState({ currencies: [usd], rates: { USD: 400 }, activeCurrencyCode: 'USD' });

describe('session reset', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('resets the currency store and removes its persisted key on logout', () => {
    useAuthStore.getState().setAuth(userA, 'tok');
    seedCurrencyStore();
    expect(localStorage.getItem(CURRENCY_KEY)).not.toBeNull();

    useAuthStore.getState().logout();

    const state = useCurrencyStore.getState();
    expect(state.currencies).toEqual([]);
    expect(state.rates).toEqual({});
    expect(state.activeCurrencyCode).toBe('');
    expect(localStorage.getItem(CURRENCY_KEY)).toBeNull();
  });

  it('resets the currency store when a different user logs in', () => {
    useAuthStore.getState().setAuth(userA, 'tok');
    seedCurrencyStore();

    useAuthStore.getState().setAuth(userB, 'tok2');

    expect(useCurrencyStore.getState().currencies).toEqual([]);
    expect(useCurrencyStore.getState().activeCurrencyCode).toBe('');
  });

  it('keeps the currency store when the same user logs in again', () => {
    useAuthStore.getState().setAuth(userA, 'tok');
    seedCurrencyStore();

    useAuthStore.getState().setAuth(userA, 'tok-refreshed');

    expect(useCurrencyStore.getState().currencies).toEqual([usd]);
  });

  describe('react-query cache reset event', () => {
    const listener = jest.fn();
    beforeEach(() => {
      listener.mockClear();
      window.addEventListener('session:reset', listener);
    });
    afterEach(() => window.removeEventListener('session:reset', listener));

    it('fires when a different user logs in', () => {
      useAuthStore.getState().setAuth(userA, 'tok');
      listener.mockClear();
      useAuthStore.getState().setAuth(userB, 'tok2');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('token')).toBe('tok2');
    });

    it('does not fire on a same-user refresh', () => {
      useAuthStore.getState().setAuth(userA, 'tok');
      listener.mockClear();
      useAuthStore.getState().setAuth(userA, 'tok-refreshed');
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
