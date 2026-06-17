import axios from 'axios';

/**
 * Extract a human-readable message from an API/network error.
 */
export function getErrorMessage(
  err: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; errors?: { message?: string }[] }
      | undefined;
    if (data?.errors?.length && data.errors[0]?.message) {
      return data.errors[0].message;
    }
    if (data?.message) return data.message;
    if (err.code === 'ERR_NETWORK') {
      return 'Cannot reach the server. Please try again.';
    }
  }
  return fallback;
}
