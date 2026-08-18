import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Flashlight, FlashlightOff, X } from 'lucide-react-native';
import { parseQRCode } from '@/lib/qr-parser';
import { getAssetByCode } from '@/api/assets';
import { recordScan } from '@/lib/recent-scans';
import { useIsOnline } from '@/lib/network';
import { useAuth, canManageAssets } from '@/lib/auth-context';
import { colors } from '@/theme/colors';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ApiError } from '@/types/api';

type LookupState =
  | { status: 'scanning' }
  | { status: 'looking-up'; code: string }
  | { status: 'not-found'; code: string }
  | { status: 'error'; code: string; message: string };

// The scan flow from section 8 of the brief: scan -> parse -> lookup ->
// details, or one of the explicit failure branches (not found,
// unauthorized, offline) - each with its own recovery actions rather
// than a single generic error screen.
export default function ScanScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const { user } = useAuth();
  const canManage = canManageAssets(user?.role);
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [state, setState] = useState<LookupState>({ status: 'scanning' });
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  const resumeScanning = useCallback(() => {
    setState({ status: 'scanning' });
    lastScanRef.current = null;
  }, []);

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (state.status !== 'scanning') return; // ignore while processing

      const parsed = parseQRCode(result.data);

      if (!parsed.ok) {
        // Invalid QR content - stay on the scanner rather than
        // interrupting with a screen for every stray scan (e.g. a
        // poster's QR code in the background).
        return;
      }

      // Prevent accidental duplicate scans of the same code within a
      // short window (section 7) - e.g. the camera re-reading the same
      // still-visible label before the user moves on.
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
          code: parsed.code,
          message:
            "You're offline. This asset cannot be retrieved until connectivity is available.",
        });
        return;
      }

      setState({ status: 'looking-up', code: parsed.code });

      try {
        const asset = await getAssetByCode(parsed.code);

        await recordScan({
          assetId: asset.assetId,
          assetTag: asset.assetTag,
          assetName: asset.assetName,
          locationName: asset.officeLocationName,
          status: asset.status,
          scannedAt: new Date().toISOString(),
        });

        router.replace(`/(app)/asset/${asset.assetId}`);
      } catch (err) {
        const apiError = err as ApiError;

        if (apiError.status === 404) {
          setState({ status: 'not-found', code: parsed.code });
        } else if (apiError.status === 403) {
          setState({
            status: 'error',
            code: parsed.code,
            message: "You don't have permission to view this asset.",
          });
        } else {
          setState({
            status: 'error',
            code: parsed.code,
            message: apiError.message ?? 'Something went wrong.',
          });
        }
      }
    },
    [state.status, isOnline, router]
  );

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
          PPS Asset Scanner needs camera access to scan asset QR codes.
          {permission.canAskAgain
            ? ''
            : ' Please enable it in your device Settings.'}
        </Text>
        {permission.canAskAgain ? (
          <PrimaryButton label="Grant Camera Access" onPress={requestPermission} />
        ) : null}
        <PrimaryButton
          label="Search Manually Instead"
          variant="secondary"
          onPress={() => router.replace('/(app)/search')}
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
        <Text style={styles.hint}>Align the QR code within the frame</Text>
      </View>

      {state.status === 'looking-up' ? (
        <View style={styles.resultSheet}>
          <ActivityIndicator color={colors.blue500} />
          <Text style={styles.resultTitle}>Looking up {state.code}…</Text>
        </View>
      ) : null}

      {state.status === 'not-found' ? (
        <View style={styles.resultSheet}>
          <Text style={styles.resultTitle}>Asset not found</Text>
          <Text style={styles.resultBody}>
            No asset matches the code &quot;{state.code}&quot;.
          </Text>
          <View style={styles.resultActions}>
            <PrimaryButton label="Try Again" onPress={resumeScanning} />
            {canManage ? (
              <PrimaryButton
                label="Add as New Asset"
                variant="secondary"
                onPress={() =>
                  router.replace(
                    `/(app)/asset/new?assetTag=${encodeURIComponent(state.code)}`
                  )
                }
              />
            ) : null}
            <PrimaryButton
              label="Search Manually"
              variant="secondary"
              onPress={() => router.replace('/(app)/search')}
            />
            <PrimaryButton
              label="Cancel"
              variant="secondary"
              onPress={() => router.back()}
            />
          </View>
        </View>
      ) : null}

      {state.status === 'error' ? (
        <View style={styles.resultSheet}>
          <Text style={styles.resultTitle}>Couldn&apos;t retrieve this asset</Text>
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
