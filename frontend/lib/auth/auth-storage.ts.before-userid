export interface UserInfo {
  fullName: string;
  email: string;
  role: string;
}

const TOKEN_KEY = "erip_token";
const USER_KEY = "erip_user";

export const AuthStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser(): UserInfo | null {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  set(token: string, user: UserInfo) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
