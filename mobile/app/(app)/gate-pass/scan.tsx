import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Flashlight, FlashlightOff, X } from 'lucide-react-native';
import { parseQRCode } from '@/lib/qr-parser';
import { useIsOnline } from '@/lib/network';
import { useAuth, canHandleGatePass } from '@/lib/auth-context';
import { colors } from '@/theme/colors';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ErrorBanner } from '@/components/ErrorBanner';

type ScanState = { status: 'scanning' } | { status: 'error'; message: string };

// Deliberately a SEPARATE scanner from app/(app)/scan.tsx rather than a
// branch bolted onto it - that screen stays asset-only and untouched.
// This one only ever means "gate pass": it does the same parseQRCode()
// extraction (a gate pass QR is just the bare GatePassNumber, e.g.
// "GP-2026-000123" - same content-only convention the asset scanner's
// codes use), then hands off to the detail screen, which does the
// actual by-gate-pass lookup (and can be retried/refreshed there without
// re-opening the camera).
export default function GatePassScanScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [state, setState] = useState<ScanState>({ status: 'scanning' });
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  const resumeScanning = useCallback(() => {
    setState({ status: 'scanning' });
    lastScanRef.current = null;
  }, []);

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (state.status !== 'scanning') return;

      const parsed = parseQRCode(result.data);
      if (!parsed.ok) return;

      const now = Date.now();
      if (
        lastScanRef.current &&
        lastScanRef.current.code === parsed.code &&
        now - lastScanRef.current.at < 3000
      ) {
        return;
      }
      lastScanRef.current = { code: parsed.code, at: now };

      if (!isOnline) {
        setState({
          status: 'error',
          message:
            "You're offline. This gate pass cannot be looked up until connectivity is available.",
        });
        return;
      }

      router.replace(`/(app)/gate-pass/${encodeURIComponent(parsed.code)}`);
    },
    [state.status, isOnline, router]
  );

  if (!canHandleGatePass(user?.role)) {
    return (
      <View style={styles.centered}>
        <ErrorBanner message="You don't have permission to handle gate passes." />
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.blue500} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          PPS Asset Scanner needs camera access to scan gate pass QR codes.
          {permission.canAskAgain
            ? ''
            : ' Please enable it in your device Settings.'}
        </Text>
        {permission.canAskAgain ? (
          <PrimaryButton label="Grant Camera Access" onPress={requestPermission} />
        ) : null}
        <PrimaryButton
          label="Cancel"
          variant="secondary"
          onPress={() => router.back()}
          style={{ marginTop: 12 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarcodeScanned}
      />

      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          style={styles.iconButton}
        >
          <X size={22} color={colors.white} />
        </Pressable>
        <Pressable
          onPress={() => setTorchOn((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
          style={styles.iconButton}
        >
          {torchOn ? (
            <FlashlightOff size={22} color={colors.white} />
          ) : (
            <Flashlight size={22} color={colors.white} />
          )}
        </Pressable>
      </View>

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.scanFrame} />
        <Text style={styles.hint}>Align the gate pass QR code within the frame</Text>
      </View>

      {state.status === 'error' ? (
        <View style={styles.resultSheet}>
          <Text style={styles.resultTitle}>Couldn&apos;t scan this gate pass</Text>
          <Text style={styles.resultBody}>{state.message}</Text>
          <View style={styles.resultActions}>
            <PrimaryButton label="Try Again" onPress={resumeScanning} />
            <PrimaryButton
              label="Cancel"
              variant="secondary"
              onPress={() => router.back()}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: colors.slate50,
  },
  permissionTitle: { fontSize: 17, fontWeight: '700', color: colors.slate900 },
  permissionBody: {
    fontSize: 13,
    color: colors.slate400,
    textAlign: 'center',
    marginBottom: 8,
  },
  topBar: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.white,
  },
  hint: {
    color: colors.white,
    marginTop: 16,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  resultSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 40,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    gap: 8,
    alignItems: 'center',
  },
  resultTitle: { fontSize: 16, fontWeight: '700', color: colors.slate900 },
  resultBody: {
    fontSize: 13,
    color: colors.slate400,
    textAlign: 'center',
    marginBottom: 8,
  },
  resultActions: { width: '100%', gap: 10 },
});
