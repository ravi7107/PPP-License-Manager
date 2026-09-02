import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QrCode, X } from 'lucide-react-native';
import { getAudit, recordAuditScan, completeAudit } from '@/api/audits';
import { enqueueAuditScan, getQueue, processQueue } from '@/lib/sync-queue';
import { parseQRCode } from '@/lib/qr-parser';
import { useIsOnline } from '@/lib/network';
import { useAuth, canManageAssets } from '@/lib/auth-context';
import { Panel } from '@/components/Panel';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusPill, toneForAuditResult } from '@/components/StatusPill';
import { ErrorBanner } from '@/components/ErrorBanner';
import { colors, statusTone, StatusTone } from '@/theme/colors';
import { ApiError } from '@/types/api';

type ScanFeedback = { code: string; message: string; tone: StatusTone } | null;

// The active audit "scan loop" (section 10): every scan while this
// session is InProgress records a real result against the backend
// (Found / newly-discovered Unexpected / WrongLocation), or - if
// offline - is queued locally and synced automatically once
// connectivity returns (section 17). Nothing here mutates the asset's
// own master record; results live only in AssetAudit/AssetAuditItem
// (section 10: "audit results should be recorded separately").
export default function AuditSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const auditId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const isOnline = useIsOnline();
  const { user } = useAuth();
  const canManage = canManageAssets(user?.role);

  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  const auditQuery = useQuery({
    queryKey: ['audit', auditId],
    queryFn: () => getAudit(auditId),
    enabled: Number.isFinite(auditId),
  });

  const refreshPendingCount = useCallback(async () => {
    const queue = await getQueue();
    setPendingCount(
      queue.filter((item) => item.auditId === auditId && item.status !== 'SYNCED')
        .length
    );
  }, [auditId]);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  const runSync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await processQueue();
      if (result.synced > 0) {
        queryClient.invalidateQueries({ queryKey: ['audit', auditId] });
        queryClient.invalidateQueries({ queryKey: ['audits'] });
      }
      await refreshPendingCount();
    } finally {
      setSyncing(false);
    }
  }, [auditId, queryClient, refreshPendingCount]);

  // Auto-sync as soon as connectivity returns - queued scans never
  // require the user to remember to do anything (section 17).
  const wasOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (isOnline && !wasOnlineRef.current) {
      runSync();
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline, runSync]);

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (recording) return;

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
        await enqueueAuditScan(auditId, parsed.code);
        await refreshPendingCount();
        setScanFeedback({
          code: parsed.code,
          message: `${parsed.code} queued — will sync when you're back online.`,
          tone: 'pending',
        });
        return;
      }

      setRecording(true);
      try {
        const scanResult = await recordAuditScan(auditId, { code: parsed.code });
        queryClient.setQueryData(['audit', auditId], {
          audit: scanResult.audit,
          items: (auditQuery.data?.items ?? []).some(
            (i) => i.id === scanResult.item.id
          )
            ? auditQuery.data!.items.map((i) =>
                i.id === scanResult.item.id ? scanResult.item : i
              )
            : [...(auditQuery.data?.items ?? []), scanResult.item],
        });
        queryClient.invalidateQueries({ queryKey: ['audits'] });

        setScanFeedback({
          code: parsed.code,
          message: scanResult.wasDuplicate
            ? `${parsed.code} was already scanned in this session.`
            : `${parsed.code} — ${scanResult.item.resultState}`,
          tone: scanResult.wasDuplicate
            ? 'info'
            : toneForAuditResult(scanResult.item.resultState),
        });
      } catch (err) {
        const apiError = err as ApiError;
        setScanFeedback({
          code: parsed.code,
          message: apiError.message ?? 'Could not record this scan.',
          tone: 'danger',
        });
      } finally {
        setRecording(false);
      }
    },
    [recording, isOnline, auditId, queryClient, auditQuery.data]
  );

  const handleComplete = () => {
    Alert.alert(
      'Complete Audit',
      'This will finalize the session. Any assets not yet scanned will remain recorded as Missing. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'destructive',
          onPress: async () => {
            setCompleting(true);
            try {
              await completeAudit(auditId, {
                remarks: completionRemarks || null,
              });
              queryClient.invalidateQueries({ queryKey: ['audit', auditId] });
              queryClient.invalidateQueries({ queryKey: ['audits'] });
              setScanning(false);
            } catch (err) {
              const apiError = err as ApiError;
              Alert.alert(
                'Could not complete audit',
                apiError.message ?? 'Something went wrong.'
              );
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
  };

  if (!canManage) {
    return (
      <View style={styles.centered}>
        <ErrorBanner message="You don't have permission to run asset audits." />
      </View>
    );
  }

  if (auditQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.blue500} />
      </View>
    );
  }

  if (auditQuery.isError || !auditQuery.data) {
    // See the identical cast in asset/[id].tsx - react-query's default
    // Error | null doesn't overlap enough with ApiError for a direct
    // cast; route through unknown first.
    const apiError = auditQuery.error as unknown as ApiError | undefined;
    return (
      <View style={styles.centered}>
        <ErrorBanner
          message={apiError?.message ?? 'Could not load this audit session.'}
        />
      </View>
    );
  }

  const { audit, items } = auditQuery.data;
  const inProgress = audit.status === 'InProgress';
  const wrongLocationCount = items.filter(
    (i) => i.resultState === 'WrongLocation'
  ).length;
  const unexpectedOnlyCount = audit.unexpectedCount - wrongLocationCount;

  if (scanning) {
    return (
      <View style={styles.cameraContainer}>
        {!permission ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 100 }} />
        ) : !permission.granted ? (
          <View style={styles.centered}>
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionBody}>
              PPS Asset Scanner needs camera access to scan assets for this
              audit.
            </Text>
            {permission.canAskAgain ? (
              <PrimaryButton label="Grant Camera Access" onPress={requestPermission} />
            ) : null}
            <PrimaryButton
              label="Back to Session"
              variant="secondary"
              onPress={() => setScanning(false)}
              style={{ marginTop: 12 }}
            />
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torchOn}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />

            <View style={styles.topBar}>
              <Pressable
                onPress={() => setScanning(false)}
                accessibilityRole="button"
                accessibilityLabel="Close scanner"
                style={styles.iconButton}
              >
                <X size={22} color={colors.white} />
              </Pressable>
              <Text style={styles.topBarTitle}>{audit.locationName}</Text>
              <Pressable
                onPress={() => setTorchOn((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel="Toggle flashlight"
                style={styles.iconButton}
              >
                <Text style={{ color: colors.white, fontSize: 11 }}>
                  {torchOn ? 'Torch Off' : 'Torch On'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.scanFrame} />
              <Text style={styles.hint}>
                {recording ? 'Recording…' : 'Align a QR code within the frame'}
              </Text>
            </View>

            <View style={styles.liveCounts}>
              <Text style={styles.liveCountsText}>
                {audit.foundCount}/{audit.expectedCount} found
                {pendingCount > 0 ? ` · ${pendingCount} queued` : ''}
              </Text>
            </View>

            {scanFeedback ? (
              <View
                style={[
                  styles.feedbackSheet,
                  { backgroundColor: statusTone[scanFeedback.tone].bg },
                ]}
              >
                <Text
                  style={[
                    styles.feedbackText,
                    { color: statusTone[scanFeedback.tone].fg },
                  ]}
                >
                  {scanFeedback.message}
                </Text>
              </View>
            ) : null}
          </>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{audit.locationName}</Text>
          <Text style={styles.subtitle}>
            {audit.departmentName ?? 'Entire location'} · started by{' '}
            {audit.startedByUserName}
          </Text>
        </View>
        <StatusPill
          label={audit.status}
          tone={
            audit.status === 'InProgress'
              ? 'pending'
              : audit.status === 'Completed'
              ? 'success'
              : 'neutral'
          }
        />
      </View>

      {!isOnline ? (
        <ErrorBanner message="You're offline. Scans will be queued and synced automatically." />
      ) : pendingCount > 0 ? (
        <Panel>
          <View style={styles.syncRow}>
            <Text style={styles.rowSub}>
              {pendingCount} scan{pendingCount === 1 ? '' : 's'} waiting to sync.
            </Text>
            <PrimaryButton
              label="Sync Now"
              variant="secondary"
              loading={syncing}
              onPress={runSync}
            />
          </View>
        </Panel>
      ) : null}

      <Panel title="Progress">
        <View style={styles.countsGrid}>
          <CountTile label="Expected" value={audit.expectedCount} tone="neutral" />
          <CountTile label="Found" value={audit.foundCount} tone="success" />
          <CountTile label="Missing" value={audit.missingCount} tone="danger" />
          <CountTile
            label="Unexpected"
            value={unexpectedOnlyCount}
            tone="pending"
          />
          <CountTile
            label="Wrong Location"
            value={wrongLocationCount}
            tone="info"
          />
        </View>
      </Panel>

      {inProgress ? (
        <Pressable
          onPress={() => {
            setScanFeedback(null);
            setScanning(true);
          }}
          style={({ pressed }) => [styles.scanButton, pressed && styles.pressed]}
        >
          <QrCode size={22} color={colors.white} />
          <Text style={styles.scanButtonLabel}>Scan Assets</Text>
        </Pressable>
      ) : null}

      <Panel title="Items" subtitle={`${items.length} recorded`}>
        {items.length === 0 ? (
          <Text style={styles.muted}>No items recorded yet.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.assetTag}</Text>
                  <Text style={styles.rowSub}>{item.assetName}</Text>
                </View>
                <StatusPill
                  label={item.resultState}
                  tone={toneForAuditResult(item.resultState)}
                />
              </View>
            ))}
          </View>
        )}
      </Panel>

      {inProgress ? (
        <Panel title="Complete Audit">
          <TextInput
            style={styles.textArea}
            placeholder="Closing remarks (optional)…"
            placeholderTextColor={colors.slate400}
            value={completionRemarks}
            onChangeText={setCompletionRemarks}
            multiline
          />
          <PrimaryButton
            label="Complete Audit"
            variant="danger"
            loading={completing}
            onPress={handleComplete}
            style={{ marginTop: 12 }}
          />
        </Panel>
      ) : (
        audit.remarks ? (
          <Panel title="Remarks">
            <Text style={styles.rowSub}>{audit.remarks}</Text>
          </Panel>
        ) : null
      )}
    </ScrollView>
  );
}

function CountTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: StatusTone;
}) {
  return (
    <View style={[styles.tile, { backgroundColor: statusTone[tone].bg }]}>
      <Text style={[styles.tileValue, { color: statusTone[tone].fg }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: statusTone[tone].fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  content: { padding: 16, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: colors.slate900 },
  subtitle: { fontSize: 12, color: colors.slate400, marginTop: 4 },
  muted: { color: colors.slate400, fontSize: 13 },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  countsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    flexBasis: '30%',
    flexGrow: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  tileValue: { fontSize: 20, fontWeight: '700' },
  tileLabel: { fontSize: 11, fontWeight: '600' },
  scanButton: {
    backgroundColor: colors.blue500,
    borderRadius: 14,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scanButtonLabel: { color: colors.white, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.slate900 },
  rowSub: { fontSize: 12, color: colors.slate400, marginTop: 2 },
  textArea: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 10,
    padding: 12,
    minHeight: 60,
    fontSize: 14,
    color: colors.slate900,
    textAlignVertical: 'top',
  },
  cameraContainer: { flex: 1, backgroundColor: colors.black },
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarTitle: { color: colors.white, fontSize: 13, fontWeight: '600' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: {
    width: 240,
    height: 240,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.white,
  },
  hint: { color: colors.white, marginTop: 16, fontSize: 13 },
  liveCounts: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  liveCountsText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  feedbackSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 40,
    borderRadius: 14,
    padding: 16,
  },
  feedbackText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
