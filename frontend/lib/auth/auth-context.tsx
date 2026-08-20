import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import { login as loginApi } from "@/lib/api/auth.api";
import { AuthStorage } from "./auth-storage";

interface User {
  userId: number;
  fullName: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
  companyId: number | null;
  companyName: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  // Called after the forced change-password flow succeeds, so the rest
  // of the app (which is gated on user.mustChangePassword - see
  // ProtectedRoute) unblocks immediately without requiring a re-login.
  clearMustChangePassword: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const existingUser = AuthStorage.getUser();

      if (existingUser) {
        // mustChangePassword is optional on the stored type since a
        // session saved before this field existed won't have it -
        // default to false (not blocked) rather than undefined.
        setUser({
          ...existingUser,
          mustChangePassword: existingUser.mustChangePassword ?? false,
        });
      }
    } catch (error) {
      console.error("Failed to restore authentication:", error);
      AuthStorage.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  async function login(
    email: string,
    password: string
  ): Promise<void> {
    const response = await loginApi({
      email,
      password,
    });

    const authenticatedUser: User = {
      userId: response.userId,
      fullName: response.fullName,
      email: response.email,
      role: response.role,
      mustChangePassword: response.mustChangePassword,
      companyId: response.companyId,
      companyName: response.companyName,
    };

    AuthStorage.set(
      response.token,
      authenticatedUser
    );

    setUser(authenticatedUser);
  }

  function logout() {
    AuthStorage.clear();
    setUser(null);
  }

  function clearMustChangePassword() {
    setUser((current) => {
      if (!current) {
        return current;
      }

      const updated = { ...current, mustChangePassword: false };
      AuthStorage.updateUser(updated);
      return updated;
    });
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: user !== null,
        clearMustChangePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
