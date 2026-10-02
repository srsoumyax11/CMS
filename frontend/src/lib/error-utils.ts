import { AxiosError } from 'axios';

/**
 * Extracts a user-friendly error message from an API response or generic error.
 * Handles Axios errors (with nested validation/API errors) and standard Error objects.
 */
export function getErrorMessage(error: unknown, defaultMessage = 'An unexpected error occurred'): string {
  if (!error) return defaultMessage;

  // Handle Axios errors
  if (error instanceof AxiosError || (typeof error === 'object' && 'isAxiosError' in error!)) {
    const axiosError = error as AxiosError<any>;
    
    // Check for standard API error format { detail: string } or { error: string }
    const responseData = axiosError.response?.data;
    if (responseData) {
      if (typeof responseData === 'string') {
        return responseData;
      }
      if (typeof responseData === 'object') {
        return responseData.detail || responseData.error || responseData.message || defaultMessage;
      }
    }
    
    // Network errors
    if (axiosError.code === 'ERR_NETWORK') {
      return 'Network error: Cannot connect to server';
    }
    
    return axiosError.message || defaultMessage;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
}
