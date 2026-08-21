/**
 * Extracts a human-readable error message from an API error (axios) or a
 * generic JS error. Centralized so it isn't copy-pasted across pages.
 */
export function getErrorMessage(e: unknown): string {
  const err = e as { response?: { data?: { message?: string } }; message?: string } | undefined;
  return err?.response?.data?.message || err?.message || 'Error';
}
