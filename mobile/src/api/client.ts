import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_BASE_URL } from '@/lib/env';
import { getToken } from '@/lib/secure-storage';
import { ApiError, ApiResponse } from '@/types/api';

/**
 * One axios instance, shared by every module in src/api/*. Mirrors the
 * existing web app's client (frontend/lib/api/client.ts): attach the
 * bearer token on every request, and surface a 401 as a distinct,
 * catchable event rather than letting each screen guess what a bare
 * "Request failed with status code 401" means.
 *
 * Unlike the web app, there is no window to hard-redirect from - see
 * registerUnauthorizedHandler(), which src/lib/auth-context.tsx uses
 * to clear the session and send the user back to Login.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

// Never surface a raw backend error body to the user (section 18/23 of
// the spec) - ASP.NET's default error shapes vary by status (a plain
// {message}, ApiResponse<T> with success=false, or the framework's
// own ProblemDetails for unhandled 500s with a stack trace in dev
// mode). Everything funnels through here into one safe, consistent
// shape.
// Exported so this mapping - the single place every screen's 400/401/
// 403/404/409/422/500/timeout/offline message ultimately comes from -
// can be unit-tested directly (see __tests__/client.test.ts) without
// needing to fake a real network failure.
export function toApiError(error: AxiosError): ApiError {
  if (!error.response) {
    return {
      status: null,
      message: error.code === 'ECONNABORTED'
        ? 'The request timed out. Check your connection and try again.'
        : "You're offline. This action can't be completed right now.",
      isNetworkError: true,
    };
  }

  const status = error.response.status;
  const body = error.response.data as
    | { message?: string }
    | ApiResponse<unknown>
    | undefined;

  const backendMessage =
    (body && typeof body === 'object' && 'message' in body && body.message) ||
    undefined;

  const friendlyByStatus: Record<number, string> = {
    400: 'That request was invalid. Please check the details and try again.',
    401: 'Your session has expired. Please sign in again.',
    403: "You don't have permission to do that.",
    404: 'Not found.',
    409: 'This conflicts with the current state - please refresh and try again.',
    422: 'Some details are missing or invalid.',
    500: 'Something went wrong on the server. Please try again shortly.',
  };

  return {
    status,
    message: backendMessage || friendlyByStatus[status] || 'Something went wrong.',
    isNetworkError: false,
  };
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const apiError = toApiError(error);

    if (apiError.status === 401) {
      unauthorizedHandler?.();
    }

    return Promise.reject(apiError);
  }
);

// Some endpoints return the raw DTO, some wrap it in ApiResponse<T>
// (see the comment on ApiResponse in types/api.ts) - callers that hit
// a wrapped endpoint use this instead of reaching into response.data
// themselves.
export function unwrap<T>(data: ApiResponse<T> | T): T {
  if (data && typeof data === 'object' && 'success' in (data as object)) {
    return (data as ApiResponse<T>).data;
  }
  return data as T;
}
