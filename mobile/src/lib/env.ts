import Constants from 'expo-constants';

/**
 * Single source of truth for runtime config - every other module reads
 * the API base URL through here, never process.env directly, so there
 * is exactly one place that understands how app.config.ts wired it up.
 */
function readExtra(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const value = extra?.[key];
  return typeof value === 'string' ? value : undefined;
}

export const API_BASE_URL = readExtra('apiUrl') ?? '';
export const API_ENV_NAME = readExtra('apiEnvName') ?? 'Development';

export function assertApiConfigured(): void {
  if (!API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not set. Copy mobile/.env.example to ' +
        'mobile/.env and set it to your backend URL (see the comments ' +
        'in that file about "localhost" not working from a physical ' +
        'device) before running the app.'
    );
  }
}
