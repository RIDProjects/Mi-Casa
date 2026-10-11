import { authAPI } from '../services/api';
import { useAuthStore } from '../store/auth.store';

jest.mock('../services/api', () => ({
  authAPI: { logoutAll: jest.fn() },
}));

const user = { id: 'a', name: 'A', email: 'a@x.com', roles: [] };

describe('logout from all devices', () => {
  beforeEach(() => {
    localStorage.clear();
    (authAPI.logoutAll as jest.Mock).mockReset();
    useAuthStore.getState().setAuth(user, 'tok');
  });

  it('exposes logoutAll on authAPI', () => {
    const actual = jest.requireActual('../services/api');
    expect(typeof actual.authAPI.logoutAll).toBe('function');
  });

  it('calls the endpoint and then performs the local logout', async () => {
    (authAPI.logoutAll as jest.Mock).mockResolvedValue({ data: {} });

    await useAuthStore.getState().logoutAll();

    expect(authAPI.logoutAll).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('still logs out locally when the request fails', async () => {
    (authAPI.logoutAll as jest.Mock).mockRejectedValue(new Error('network'));

    await useAuthStore.getState().logoutAll();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
