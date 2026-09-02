import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Flashlight, FlashlightOff, X } from 'lucide-react-native';
import { parseQRCode } from '@/lib/qr-parser';
import { getAvailableLines } from '@/api/purchaseRequisitions';
import { setPendingPrLink } from '@/lib/pending-pr-link';
import { useIsOnline } from '@/lib/network';
import { useAuth, canManageAssets } from '@/lib/auth-context';
import { colors } from '@/theme/colors';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ApiError, PurchaseRequisitionAvailableLineResponse } from '@/types/api';

type LookupState =
  | { status: 'scanning' }
  | { status: 'looking-up'; code: string }
  | { status: 'picking'; code: string; lines: PurchaseRequisitionAvailableLineResponse[] }
  | { status: 'empty'; code: string }
  | { status: 'error'; code: string; message: string };

// Pushed from within Add Asset (not reachable from the dashboard) - see
// src/lib/pending-pr-link.ts for why the result is handed back via that
// module and router.back() rather than URL params. A PR's QR just
// encodes its bare PrNumber (e.g. "PR-ACM-2026-0001"), same content-only
// convention as every other QR in this app - so this reuses
// parseQRCode() unchanged, then does its OWN prefix check ("PR-") rather
// than teaching the shared parser new domain knowledge (matching how
// gate-pass/scan.tsx treats its own scans as gate-pass-only by context).
export default function ScanPrScreen() {
  const router = useRouter();
  const isOnline = useIsOnline();
  const { user } = useAuth();
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

      if (!parsed.code.startsWith('PR-')) {
        setState({
          status: 'error',
          code: parsed.code,
          message:
            "That doesn't look like a Purchase Requisition QR (PR numbers start with \"PR-\").",
        });
        return;
      }

      if (!isOnline) {
        setState({
          status: 'error',
          code: parsed.code,
          message:
            "You're offline. This PR can't be looked up until connectivity is available.",
        });
        return;
      }

      setState({ status: 'looking-up', code: parsed.code });

      try {
        const lines = await getAvailableLines(parsed.code);

        if (lines.length === 0) {
          setState({ status: 'empty', code: parsed.code });
          return;
        }

        if (lines.length === 1) {
          setPendingPrLink(lines[0]);
          router.back();
          return;
        }

        setState({ status: 'picking', code: parsed.code, lines });
      } catch (err) {
        const apiError = err as ApiError;
        setState({
          status: 'error',
          code: parsed.code,
          message: apiError.message ?? 'Something went wrong.',
        });
      }
    },
    [state.status, isOnline, router]
  );

  const pickLine = (line: PurchaseRequisitionAvailableLineResponse) => {
    setPendingPrLink(line);
    router.back();
  };

  if (!canManageAssets(user?.role)) {
    return (
      <View style={styles.centered}>
        <ErrorBanner message="You don't have permission to add assets." />
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
          PPS Asset Scanner needs camera access to scan a PR/PO QR code.
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
        <Text style={styles.hint}>Align the PR/PO QR code within the frame</Text>
      </View>

      {state.status === 'looking-up' ? (
        <View style={styles.resultSheet}>
          <ActivityIndicator color={colors.blue500} />
          <Text style={styles.resultTitle}>Looking up {state.code}…</Text>
        </View>
      ) : null}

      {state.status === 'empty' ? (
        <View style={styles.resultSheet}>
          <Text style={styles.resultTitle}>No open lines on this PR</Text>
          <Text style={styles.resultBody}>
            {state.code} has no approved, not-yet-fulfilled lines to link to.
          </Text>
          <View style={styles.resultActions}>
            <PrimaryButton label="Try Again" onPress={resumeScanning} />
            <PrimaryButton
              label="Continue Without Linking"
              variant="secondary"
              onPress={() => router.back()}
            />
          </View>
        </View>
      ) : null}

      {state.status === 'error' ? (
        <View style={styles.resultSheet}>
          <Text style={styles.resultTitle}>Couldn&apos;t look up this PR</Text>
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

      {state.status === 'picking' ? (
        <View style={[styles.resultSheet, styles.pickerSheet]}>
          <Text style={styles.resultTitle}>{state.lines.length} open lines on {state.code}</Text>
          <ScrollView style={styles.pickerList}>
            {state.lines.map((line) => (
              <Pressable
                key={line.lineItemId}
                onPress={() => pickLine(line)}
                style={styles.lineRow}
              >
                <Text style={styles.lineDescription}>{line.itemDescription}</Text>
                <Text style={styles.lineMeta}>
                  Remaining {line.remainingQuantity} of {line.quantity}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <PrimaryButton label="Cancel" variant="secondary" onPress={resumeScanning} />
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
  resultTitle: { fontSize: 16, fontWeight: '700', color: colors.slate900, textAlign: 'center' },
  resultBody: {
    fontSize: 13,
    color: colors.slate400,
    textAlign: 'center',
    marginBottom: 8,
  },
  resultActions: { width: '100%', gap: 10 },
  pickerSheet: { top: 80, bottom: 40, alignItems: 'stretch' },
  pickerList: { alignSelf: 'stretch', marginVertical: 8 },
  lineRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  lineDescription: { fontSize: 14, fontWeight: '600', color: colors.slate900 },
  lineMeta: { fontSize: 12, color: colors.slate400, marginTop: 2 },
});
