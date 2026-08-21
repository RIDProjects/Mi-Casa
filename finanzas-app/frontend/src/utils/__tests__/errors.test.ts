import { getErrorMessage } from '../errors';

describe('getErrorMessage', () => {
  it('extracts message from an axios-style error (response.data.message)', () => {
    const error = { response: { data: { message: 'Credenciales inválidas' } } };
    expect(getErrorMessage(error)).toBe('Credenciales inválidas');
  });

  it('falls back to error.message when response.data.message is absent', () => {
    const error = { message: 'Network Error' };
    expect(getErrorMessage(error)).toBe('Network Error');
  });

  it('prefers response.data.message over message when both are present', () => {
    const error = { response: { data: { message: 'Detalle específico' } }, message: 'Generic Axios Error' };
    expect(getErrorMessage(error)).toBe('Detalle específico');
  });

  it('returns generic fallback when neither message is present', () => {
    expect(getErrorMessage({})).toBe('Error');
  });

  it('returns generic fallback for a plain string', () => {
    expect(getErrorMessage('boom')).toBe('Error');
  });

  it('returns generic fallback for undefined/null', () => {
    expect(getErrorMessage(undefined)).toBe('Error');
    expect(getErrorMessage(null)).toBe('Error');
  });

  it('returns generic fallback for a real Error instance without response, using its message', () => {
    expect(getErrorMessage(new Error('Something broke'))).toBe('Something broke');
  });
});
