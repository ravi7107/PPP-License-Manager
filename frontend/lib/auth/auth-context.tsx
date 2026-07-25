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
  fullName: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
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
        setUser(existingUser);
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
      fullName: response.fullName,
      email: response.email,
      role: response.role,
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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: user !== null,
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
