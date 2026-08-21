import { useAuthStore } from '../auth.store';

const baseUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
};

describe('useAuthStore.isAdminGlobal', () => {
  afterEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });
  });

  it('returns true when the user has the "admin" role', () => {
    useAuthStore.setState({
      user: { ...baseUser, roles: [{ name: 'admin' }] },
      token: 'token',
      isAuthenticated: true,
    });

    expect(useAuthStore.getState().isAdminGlobal()).toBe(true);
  });

  it('returns false when the user has roles but none is "admin"', () => {
    useAuthStore.setState({
      user: { ...baseUser, roles: [{ name: 'house_admin' }, { name: 'member' }] },
      token: 'token',
      isAuthenticated: true,
    });

    expect(useAuthStore.getState().isAdminGlobal()).toBe(false);
  });

  it('returns false when there is no user', () => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false });

    expect(useAuthStore.getState().isAdminGlobal()).toBe(false);
  });
});
