import { ExpoConfig, ConfigContext } from 'expo/config';

// EXPO_PUBLIC_-prefixed vars are inlined into the JS bundle at build
// time by Expo/Metro automatically - no extra wiring needed to read
// them via process.env in app code. See mobile/README.md for how to
// select dev/staging/production before a build (copy the matching
// .env.<profile> to .env, or set them as EAS Build profile env vars).
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
const apiEnvName = process.env.EXPO_PUBLIC_API_ENV_NAME ?? 'Development';

// Both platforms block plain-HTTP network calls by default in a real
// (non-Expo-Go) build - iOS via App Transport Security, Android via
// its cleartext-traffic policy on API 28+. Expo Go itself is exempt
// from both, which is why an http:// backend "just works" there but
// silently fails every request in an EAS/standalone build without
// this. Deriving the exception from the URL itself (rather than a
// separate on/off flag) means it can never drift out of sync: point
// EXPO_PUBLIC_API_URL at an https:// address (e.g. once ppsl.net.in
// is actually serving TLS) and this turns itself off on the next
// build - nobody has to remember to remove it.
const usesPlainHttp = apiUrl.startsWith('http://');

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
      // See the usesPlainHttp comment above - only applied while the
      // configured backend is genuine http://, e.g. the staff/preview
      // build hitting the server's public IP directly.
      ...(usesPlainHttp
        ? { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } }
        : {}),
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
    [
      'expo-build-properties',
      {
        // Android counterpart of the iOS ATS exception above - same
        // usesPlainHttp condition, same reasoning.
        android: {
          usesCleartextTraffic: usesPlainHttp,
        },
      },
    ],
  ],
    extra: {
    // Read via src/lib/env.ts, not directly - keeps every call site
    // agnostic to whether a value came from EXPO_PUBLIC_* or here.
    apiUrl,
    apiEnvName,
    eas: {
      // Filled in after eas init linked this app to the
      // pps-smartassets-team / pps-asset-scanner EAS project.
      projectId: process.env.EAS_PROJECT_ID ?? '7812fa5f-0f74-42a5-a111-2edee811fa7e',
    },
  },
});
