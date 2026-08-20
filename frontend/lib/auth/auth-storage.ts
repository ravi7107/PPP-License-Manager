export interface UserInfo {
  userId: number;
  fullName: string;
  email: string;
  role: string;
  mustChangePassword?: boolean;
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

  // Updates just the stored user object (e.g. after the forced
  // change-password flow clears mustChangePassword) without touching the
  // token.
  updateUser(user: UserInfo) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
