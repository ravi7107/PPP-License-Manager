import { ExpoConfig, ConfigContext } from 'expo/config';

// EXPO_PUBLIC_-prefixed vars are inlined into the JS bundle at build
// time by Expo/Metro automatically - no extra wiring needed to read
// them via process.env in app code. See mobile/README.md for how to
// select dev/staging/production before a build (copy the matching
// .env.<profile> to .env, or set them as EAS Build profile env vars).
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
const apiEnvName = process.env.EXPO_PUBLIC_API_ENV_NAME ?? 'Development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PPS Asset Scanner',
  slug: 'pps-asset-scanner',
  scheme: 'ppsassetscanner',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#F8FAFC',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    // Camera permission copy shown by iOS the first time the Scan
    // screen requests access - see app/(app)/scan.tsx.
    infoPlist: {
      NSCameraUsageDescription:
        'PPS Asset Scanner uses the camera to scan asset QR/barcode labels.',
    },
    bundleIdentifier: 'in.ppspl.assetscanner',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#155EEF',
    },
    package: 'in.ppspl.assetscanner',
    permissions: ['CAMERA'],
  },
  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission:
          'PPS Asset Scanner uses the camera to scan asset QR/barcode labels.',
      },
    ],
  ],
  extra: {
    // Read via src/lib/env.ts, not directly - keeps every call site
    // agnostic to whether a value came from EXPO_PUBLIC_* or here.
    apiUrl,
    apiEnvName,
    eas: {
      // Fill in after `eas init` if/when you set up EAS Build - not
      // required for local development or a bare `expo start`.
      projectId: process.env.EAS_PROJECT_ID ?? undefined,
    },
  },
});
