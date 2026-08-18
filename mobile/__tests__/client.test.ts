import { AxiosError } from 'axios';
import { toApiError, unwrap } from '@/api/client';
import { ApiResponse } from '@/types/api';

/**
 * The single place a raw backend/network failure turns into the
 * friendly, sanitized ApiError every screen actually branches on
 * (section 18/23: never show a raw stack trace or status code to the
 * user). This is what powers, for example, scan.tsx's "Asset not
 * found" vs "You don't have permission" vs generic-error branches.
 */

function axiosErrorWithStatus(
  status: number,
  data?: unknown,
  code?: string
): AxiosError {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: `Request failed with status code ${status}`,
    code,
    response: {
      status,
      data,
      statusText: '',
      headers: {},
      config: {} as never,
    },
    toJSON: () => ({}),
  } as unknown as AxiosError;
}

function axiosNetworkError(code?: string): AxiosError {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: 'Network Error',
    code,
    response: undefined,
    toJSON: () => ({}),
  } as unknown as AxiosError;
}

describe('toApiError', () => {
  it('maps a 404 to a friendly "not found" message when the backend sends none', () => {
    const result = toApiError(axiosErrorWithStatus(404, {}));
    expect(result).toEqual({
      status: 404,
      message: 'Not found.',
      isNetworkError: false,
    });
  });

  it('maps a 403 to a friendly permission message', () => {
    const result = toApiError(axiosErrorWithStatus(403, {}));
    expect(result.status).toBe(403);
    expect(result.message).toMatch(/permission/i);
  });

  it('prefers the backend-provided message when present', () => {
    const result = toApiError(
      axiosErrorWithStatus(400, { message: 'AssetTag is required.' })
    );
    expect(result.message).toBe('AssetTag is required.');
  });

  it('reads the message out of a wrapped ApiResponse failure body', () => {
    const body: ApiResponse<null> = {
      success: false,
      message: 'No asset matches this code.',
      data: null,
      errors: null,
    };
    const result = toApiError(axiosErrorWithStatus(404, body));
    expect(result.message).toBe('No asset matches this code.');
  });

  it('maps a 401 to a session-expired message', () => {
    const result = toApiError(axiosErrorWithStatus(401, {}));
    expect(result.status).toBe(401);
    expect(result.message).toMatch(/session has expired/i);
  });

  it('maps a 409 conflict to a friendly retry message', () => {
    const result = toApiError(axiosErrorWithStatus(409, {}));
    expect(result.message).toMatch(/refresh/i);
  });

  it('falls back to a generic message for an unmapped status', () => {
    const result = toApiError(axiosErrorWithStatus(418, {}));
    expect(result.message).toBe('Something went wrong.');
  });

  it('treats a timeout as a network error with a timeout-specific message', () => {
    const result = toApiError(axiosNetworkError('ECONNABORTED'));
    expect(result.isNetworkError).toBe(true);
    expect(result.status).toBeNull();
    expect(result.message).toMatch(/timed out/i);
  });

  it('treats a response-less error as offline rather than a generic failure', () => {
    const result = toApiError(axiosNetworkError());
    expect(result.isNetworkError).toBe(true);
    expect(result.message).toMatch(/offline/i);
  });
});

describe('unwrap', () => {
  it('unwraps an ApiResponse envelope', () => {
    const body: ApiResponse<{ id: number }> = {
      success: true,
      message: 'OK',
      data: { id: 42 },
    };
    expect(unwrap(body)).toEqual({ id: 42 });
  });

  it('passes a raw (unwrapped) body through unchanged', () => {
    const body = { id: 42 };
    expect(unwrap(body)).toEqual({ id: 42 });
  });

  it('passes a raw array body through unchanged (no "success" key to key off)', () => {
    const body = [{ id: 1 }, { id: 2 }];
    expect(unwrap(body)).toEqual(body);
  });
});
