import apiClient from './apiClient';

export const accountService = {
  deleteAccount: async (password: string): Promise<void> => {
    await apiClient.post('/account/delete', { password });
  },
};
