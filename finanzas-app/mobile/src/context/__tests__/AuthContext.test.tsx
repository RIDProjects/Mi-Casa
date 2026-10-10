import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../AuthContext';
import apiClient from '../../services/apiClient';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiGet: jest.fn().mockResolvedValue([['token', null], ['user', null]]),
    multiSet: jest.fn().mockResolvedValue(undefined),
    multiRemove: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../services/apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn() },
  registerUnauthorizedHandler: jest.fn(),
}));

let auth: ReturnType<typeof useAuth>;
function Probe() {
  auth = useAuth();
  return <Text>probe</Text>;
}

const setup = () => {
  const queryClient = new QueryClient();
  const clearSpy = jest.spyOn(queryClient, 'clear');
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { clearSpy };
};

describe('AuthProvider cache hygiene', () => {
  it('clears the query cache on logout', async () => {
    const { clearSpy } = setup();
    await act(async () => {});

    await act(async () => {
      await auth.logout();
    });

    expect(clearSpy).toHaveBeenCalled();
  });

  it('clears the query cache before setting a newly logged-in user', async () => {
    const { clearSpy } = setup();
    await act(async () => {});
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { access_token: 't', user: { id: 'b', name: 'B' } },
    });

    await act(async () => {
      await auth.login({ email: 'b@x.com', password: 'pw' } as any);
    });

    expect(clearSpy).toHaveBeenCalled();
    expect(auth.user?.id).toBe('b');
  });
});
