import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as auth from '@/api/auth';
import { registerUnauthorizedHandler } from '@/api/client';
import {
  clearSession,
  getStoredUserJson,
  getToken,
  saveStoredUserJson,
  saveToken,
} from '@/lib/secure-storage';
import { LoginRequest, StoredUser } from '@/types/api';

interface AuthContextValue {
  user: StoredUser | null;
  // true while restoring a session from storage on cold start - the
  // root layout uses this to hold the splash/redirect decision until
  // it's known whether there's a session to restore.
  isRestoring: boolean;
  isLoggingIn: boolean;
  loginError: string | null;
  signIn: (request: LoginRequest) => Promise<boolean>;
  signOut: () => Promise<void>;
  // Set by registerUnauthorizedHandler when the API returns a 401 -
  // the root layout watches this to know a session-expired message
  // should be shown once, then cleared.
  sessionExpired: boolean;
  acknowledgeSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Automatic session restoration (section 5) - on cold start, trust
  // whatever's in storage without re-hitting the network; a 401 on the
  // next real API call is what actually invalidates it (there's no
  // "verify token" endpoint to call proactively, and the existing web
  // app doesn't have one either - see mobile/README.md).
  useEffect(() => {
    (async () => {
      try {
        const [token, storedJson] = await Promise.all([
          getToken(),
          getStoredUserJson(),
        ]);

        if (token && storedJson) {
          const storedUser = JSON.parse(storedJson) as StoredUser;

          if (new Date(storedUser.expiration).getTime() > Date.now()) {
            setUser(storedUser);
          } else {
            await clearSession();
          }
        }
      } catch {
        await clearSession();
      } finally {
        setIsRestoring(false);
      }
    })();
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setUser(null);
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setSessionExpired(true);
      void signOut();
    });
  }, [signOut]);

  const signIn = useCallback(async (request: LoginRequest) => {
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const response = await auth.login(request);

      const storedUser: StoredUser = {
        userId: response.userId,
        fullName: response.fullName,
        email: response.email,
        role: response.role,
        companyId: response.companyId,
        companyName: response.companyName,
        expiration: response.expiration,
      };

      await saveToken(response.token);
      await saveStoredUserJson(JSON.stringify(storedUser));

      setUser(storedUser);
      return true;
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Unable to sign in. Please try again.';

      setLoginError(message);
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const acknowledgeSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isRestoring,
      isLoggingIn,
      loginError,
      signIn,
      signOut,
      sessionExpired,
      acknowledgeSessionExpired,
    }),
    [
      user,
      isRestoring,
      isLoggingIn,
      loginError,
      signIn,
      signOut,
      sessionExpired,
      acknowledgeSessionExpired,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return ctx;
}

// Coarse permission check used across screens (Transfer, Audit
// start/scan/complete are all Super Admin/IT Admin server-side - see
// backend Controllers/AssetAssignmentController.cs and the new
// AssetAuditController.cs). The server is still the final authority
// (section 14) - this only controls whether the mobile UI offers the
// action at all, matching the web app's own canManage-style gating.
export function canManageAssets(role: StoredUser['role'] | undefined): boolean {
  return role === 'Super Admin' || role === 'IT Admin';
}

// Extension 4, Phase 21 - Gate Pass scan / Transfer / Receive is a
// separate permission from canManageAssets above, not an extension of
// it: Facility must NOT gain Add-Asset access, and Super Admin/IT Admin
// keep the override they already have server-side. Matches
// MaterialMovementController's [Authorize(Roles = "Facility,Super
// Admin,IT Admin")] on GetByGatePassNumber/Transfer/Receive exactly -
// same "server is the final authority, this only controls whether the
// UI offers the action" caveat as canManageAssets above.
export function canHandleGatePass(role: StoredUser['role'] | undefined): boolean {
  return role === 'Facility' || role === 'Super Admin' || role === 'IT Admin';
}
