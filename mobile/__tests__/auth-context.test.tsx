import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth, canManageAssets } from '@/lib/auth-context';
import * as auth from '@/api/auth';
import {
  getToken,
  saveStoredUserJson,
  saveToken,
} from '@/lib/secure-storage';
import { StoredUser } from '@/types/api';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// expo-secure-store has no bundled Jest mock - back it with a tiny
// in-memory Map so token persistence behaves like the real thing
// (write, read, delete) without touching the Keychain/Keystore.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

jest.mock('@/api/auth');

const mockedLogin = auth.login as jest.MockedFunction<typeof auth.login>;

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

async function waitForRestore(result: { current: ReturnType<typeof useAuth> }) {
  await waitFor(() => expect(result.current.isRestoring).toBe(false));
}

describe('AuthProvider / useAuth (section 5: session persistence)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has no session after restoring on a clean cold start', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitForRestore(result);
    expect(result.current.user).toBeNull();
  });

  it('signs in on valid credentials, stores the token securely, and exposes the user', async () => {
    mockedLogin.mockResolvedValueOnce({
      userId: 1,
      token: 'valid.jwt.token',
      expiration: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      fullName: 'Jane Doe',
      email: 'jane@ppspl.in',
      role: 'IT Admin',
      companyId: 1,
      companyName: 'PPS Pvt Ltd',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitForRestore(result);

    let success = false;
    await act(async () => {
      success = await result.current.signIn({
        email: 'jane@ppspl.in',
        password: 'correct-password',
      });
    });

    expect(success).toBe(true);
    expect(result.current.user?.fullName).toBe('Jane Doe');
    expect(result.current.loginError).toBeNull();
    await expect(getToken()).resolves.toBe('valid.jwt.token');
  });

  it('rejects invalid credentials with a friendly error and no session', async () => {
    mockedLogin.mockRejectedValueOnce({
      status: 401,
      message: 'Invalid email or password.',
      isNetworkError: false,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitForRestore(result);

    let success = true;
    await act(async () => {
      success = await result.current.signIn({
        email: 'jane@ppspl.in',
        password: 'wrong-password',
      });
    });

    expect(success).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.loginError).toBe('Invalid email or password.');
  });

  it('does not restore a session whose token has already expired', async () => {
    const expiredUser: StoredUser = {
      userId: 2,
      fullName: 'Old Session',
      email: 'old@ppspl.in',
      role: 'Employee',
      expiration: new Date(Date.now() - 60 * 1000).toISOString(), // 1 min in the past
    };

    await saveToken('stale-token');
    await saveStoredUserJson(JSON.stringify(expiredUser));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitForRestore(result);

    expect(result.current.user).toBeNull();
    // The expired session is also cleared out of storage, not just
    // ignored, so a later cold start doesn't keep re-evaluating it.
    await expect(getToken()).resolves.toBeNull();
  });

  it('restores a still-valid session on cold start without calling login again', async () => {
    const validUser: StoredUser = {
      userId: 3,
      fullName: 'Current Session',
      email: 'current@ppspl.in',
      role: 'Employee',
      expiration: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    await saveToken('fresh-token');
    await saveStoredUserJson(JSON.stringify(validUser));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitForRestore(result);

    expect(result.current.user?.fullName).toBe('Current Session');
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it('signs out and clears the persisted session', async () => {
    mockedLogin.mockResolvedValueOnce({
      userId: 1,
      token: 'valid.jwt.token',
      expiration: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      fullName: 'Jane Doe',
      email: 'jane@ppspl.in',
      role: 'Employee',
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitForRestore(result);

    await act(async () => {
      await result.current.signIn({ email: 'jane@ppspl.in', password: 'x' });
    });
    expect(result.current.user).not.toBeNull();

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    await expect(getToken()).resolves.toBeNull();
  });
});

describe('canManageAssets (Transfer/Audit role gating)', () => {
  it('allows Super Admin and IT Admin', () => {
    expect(canManageAssets('Super Admin')).toBe(true);
    expect(canManageAssets('IT Admin')).toBe(true);
  });

  it('denies every other role, including undefined (not-yet-loaded user)', () => {
    expect(canManageAssets('Employee')).toBe(false);
    expect(canManageAssets('Team Lead')).toBe(false);
    expect(canManageAssets('Manager')).toBe(false);
    expect(canManageAssets(undefined)).toBe(false);
  });
});
