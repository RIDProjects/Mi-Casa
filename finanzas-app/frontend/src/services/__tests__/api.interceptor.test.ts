import api, { sessionRedirect } from '../api';

const rejectWith401 = (config: any) =>
  Promise.reject({ config, response: { status: 401, data: { message: 'Unauthorized' }, config } });

describe('api 401 response interceptor', () => {
  let logoutListener: jest.Mock;
  let redirectSpy: jest.SpyInstance;

  const setPath = (pathname: string) => window.history.pushState({}, '', pathname);

  beforeEach(() => {
    api.defaults.adapter = rejectWith401 as any;
    localStorage.clear();
    setPath('/dashboard');
    redirectSpy = jest.spyOn(sessionRedirect, 'toLogin').mockImplementation(() => undefined);
    logoutListener = jest.fn();
    window.addEventListener('auth:logout', logoutListener);
  });

  afterEach(() => {
    window.removeEventListener('auth:logout', logoutListener);
    redirectSpy.mockRestore();
  });

  it.each(['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'])(
    'does not clear the session or redirect on a 401 from %s',
    async (url) => {
      setPath('/login');
      localStorage.setItem('token', 'abc');
      localStorage.setItem('user', '{}');

      await expect(api.post(url, {})).rejects.toMatchObject({ response: { status: 401 } });

      expect(localStorage.getItem('token')).toBe('abc');
      expect(localStorage.getItem('user')).toBe('{}');
      expect(logoutListener).not.toHaveBeenCalled();
      expect(redirectSpy).not.toHaveBeenCalled();
    },
  );

  it('does not redirect on a 401 from a protected endpoint when no token is stored', async () => {
    await expect(api.get('/debts')).rejects.toMatchObject({ response: { status: 401 } });

    expect(logoutListener).not.toHaveBeenCalled();
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it('clears the session and redirects once on a 401 from a protected endpoint with a token', async () => {
    localStorage.setItem('token', 'abc');
    localStorage.setItem('user', '{}');

    await expect(api.get('/debts')).rejects.toMatchObject({ response: { status: 401 } });

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(logoutListener).toHaveBeenCalledTimes(1);
    expect(redirectSpy).toHaveBeenCalledTimes(1);
  });

  it('does not redirect when already on /login', async () => {
    setPath('/login');
    localStorage.setItem('token', 'abc');

    await expect(api.get('/debts')).rejects.toMatchObject({ response: { status: 401 } });

    expect(localStorage.getItem('token')).toBeNull();
    expect(redirectSpy).not.toHaveBeenCalled();
  });
});
