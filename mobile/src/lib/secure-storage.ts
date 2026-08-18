import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Two different storage tiers, used deliberately:
 *
 * - SecureStore (iOS Keychain / Android Keystore) for the auth token -
 *   the one thing that must never sit in plain-text storage.
 * - AsyncStorage for everything else that's small and non-sensitive:
 *   the last-known user profile (for instant UI on cold start before
 *   the token is verified), recent scans, and the offline sync queue.
 *   None of these are secrets - they're convenience/UX state, and
 *   AsyncStorage is what the offline-queue and recent-scans features
 *   need anyway (SecureStore has a ~2KB per-item size limit on some
 *   platforms, unsuitable for a growing queue).
 */

const TOKEN_KEY = 'pps_scanner_token';
const USER_KEY = 'pps_scanner_user';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveStoredUserJson(json: string): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, json);
}

export async function getStoredUserJson(): Promise<string | null> {
  return AsyncStorage.getItem(USER_KEY);
}

export async function clearStoredUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
}

export async function clearSession(): Promise<void> {
  await Promise.all([clearToken(), clearStoredUser()]);
}
