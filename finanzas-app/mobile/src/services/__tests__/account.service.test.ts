import { accountService } from '../account.service';
import apiClient from '../apiClient';

jest.mock('../apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

describe('accountService.deleteAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts the password to /account/delete', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: { message: 'Cuenta eliminada' } });
    await expect(accountService.deleteAccount('secret')).resolves.toBeUndefined();
    expect(apiClient.post).toHaveBeenCalledWith('/account/delete', { password: 'secret' });
  });

  it('propagates API errors so the UI can show them', async () => {
    const error = { response: { status: 401, data: { message: 'Contraseña incorrecta' } } };
    (apiClient.post as jest.Mock).mockRejectedValue(error);
    await expect(accountService.deleteAccount('bad')).rejects.toBe(error);
  });
});
