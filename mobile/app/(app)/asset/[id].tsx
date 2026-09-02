import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { History } from 'lucide-react-native';
import { getAssetFullDetail } from '@/api/assets';
import { getAssetAssignmentHistory, returnAsset } from '@/api/transfers';
import { getRecentAudits, recordAuditScan } from '@/api/audits';
import { useAuth, canManageAssets } from '@/lib/auth-context';
import { Panel } from '@/components/Panel';
import { StatusPill, toneForAssetStatus } from '@/components/StatusPill';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/theme/colors';
import { ApiError } from '@/types/api';

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  );
}

function formatDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString();
}

export default function AssetDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const assetId = Number(id);
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recordingAudit, setRecordingAudit] = useState(false);

  const assetQuery = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => getAssetFullDetail(assetId),
    enabled: Number.isFinite(assetId),
  });

  const historyQuery = useQuery({
    queryKey: ['asset-history', assetId],
    queryFn: () => getAssetAssignmentHistory(assetId),
    enabled: historyOpen && Number.isFinite(assetId),
  });

  const activeAuditsQuery = useQuery({
    queryKey: ['audits', 'InProgress'],
    queryFn: () => getRecentAudits('InProgress', 5),
    enabled: canManageAssets(user?.role),
  });

  if (assetQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Loading asset…</Text>
      </View>
    );
  }

  if (assetQuery.isError || !assetQuery.data) {
    // react-query's default query-error type is `Error | null`, which
    // doesn't overlap enough with our custom ApiError shape for a direct
    // cast - route through `unknown` first, per tsc's own suggestion.
    const apiError = assetQuery.error as unknown as ApiError | undefined;
    return (
      <View style={styles.screen}>
        <ErrorBanner message={apiError?.message ?? 'Could not load this asset.'} />
      </View>
    );
  }

  const asset = assetQuery.data;
  const canManage = canManageAssets(user?.role);
  const activeAudits = activeAuditsQuery.data ?? [];

  const handleRecordInAudit = async (auditId: number) => {
    setRecordingAudit(true);
    try {
      const result = await recordAuditScan(auditId, { code: asset.assetTag });
      queryClient.invalidateQueries({ queryKey: ['audits'] });

      const label = result.wasDuplicate
        ? 'Already recorded in this audit session.'
        : `Recorded as ${result.item.resultState} in ${result.audit.locationName}.`;

      Alert.alert('Audit', label, [
        { text: 'OK' },
        {
          text: 'View Session',
          onPress: () => router.push(`/(app)/audit/${auditId}`),
        },
      ]);
    } catch (err) {
      const apiError = err as ApiError;
      Alert.alert('Could not record scan', apiError.message ?? 'Something went wrong.');
    } finally {
      setRecordingAudit(false);
    }
  };

  const handleReturn = async (assignmentId: number) => {
    Alert.alert('Return Asset', `Mark ${asset.assetTag} as returned?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Return',
        style: 'destructive',
        onPress: async () => {
          try {
            await returnAsset(assignmentId, {});
            queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
          } catch (err) {
            const apiError = err as ApiError;
            Alert.alert('Could not return asset', apiError.message ?? 'Something went wrong.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tag}>{asset.assetTag}</Text>
          <Text style={styles.name}>{asset.assetName}</Text>
        </View>
        <StatusPill label={asset.status} tone={toneForAssetStatus(asset.status)} />
      </View>

      <Panel title="Identity">
        <Field label="Asset Type" value={asset.assetType} />
        <Field label="Manufacturer" value={asset.manufacturer} />
        <Field label="Model" value={asset.model} />
        <Field label="Serial Number" value={asset.serialNumber} />
        <Field label="Host Name" value={asset.hostName} />
        <Field label="Processor" value={asset.processor} />
        <Field label="RAM" value={asset.ramGb ? `${asset.ramGb} GB` : undefined} />
        <Field label="Storage" value={asset.storageGb ? `${asset.storageGb} GB` : undefined} />
        <Field label="Graphics" value={asset.graphicsCard} />
        <Field label="Operating System" value={asset.operatingSystem} />
      </Panel>

      {(asset.userName || asset.departmentName || asset.companyName) && (
        <Panel title="Ownership">
          <Field label="Assigned Employee" value={asset.userName} />
          <Field label="Employee Code" value={asset.employeeCode} />
          <Field label="Department" value={asset.departmentName} />
          <Field label="Entity / Company" value={asset.companyName} />
        </Panel>
      )}

      {(asset.officeLocationName || asset.seatName || asset.floorName) && (
        <Panel title="Location">
          <Field label="Office Location" value={asset.officeLocationName} />
          <Field label="Floor" value={asset.floorName} />
          <Field label="Seat" value={asset.seatName ?? asset.seatCode} />
          <Field label="Work Mode" value={asset.workMode} />
        </Panel>
      )}

      <Panel title="Lifecycle">
        <Field label="Status" value={asset.status} />
        <Field label="Purchase Date" value={formatDate(asset.purchaseDate)} />
        <Field label="Warranty Expiry" value={formatDate(asset.warrantyExpiry)} />
        <Field label="Assigned On" value={formatDate(asset.assignedOn)} />
      </Panel>

      {asset.installedSoftware.length > 0 && (
        <Panel title="Installed Software">
          {asset.installedSoftware.map((sw) => (
            <View key={sw.softwareId} style={styles.field}>
              <Text style={styles.fieldLabel}>
                {sw.softwareName} {sw.version}
              </Text>
              <StatusPill
                label={sw.status}
                tone={sw.status === 'Active' ? 'success' : 'neutral'}
              />
            </View>
          ))}
        </Panel>
      )}

      {asset.remarks ? (
        <Panel title="Additional">
          <Field label="Notes" value={asset.remarks} />
        </Panel>
      ) : null}

      {canManage && (
        <Panel title="Actions">
          <View style={{ gap: 10 }}>
            <PrimaryButton
              label="Transfer Asset"
              onPress={() => router.push(`/(app)/asset/${assetId}/transfer`)}
            />

            {asset.assignmentId ? (
              <PrimaryButton
                label="Return Asset"
                variant="secondary"
                onPress={() => handleReturn(asset.assignmentId!)}
              />
            ) : null}

            {activeAudits.length === 1 ? (
              <PrimaryButton
                label={`Record in Audit: ${activeAudits[0].locationName}`}
                variant="secondary"
                loading={recordingAudit}
                onPress={() => handleRecordInAudit(activeAudits[0].id)}
              />
            ) : activeAudits.length > 1 ? (
              <PrimaryButton
                label="Record in an Audit Session"
                variant="secondary"
                onPress={() => router.push('/(app)/audit')}
              />
            ) : (
              <PrimaryButton
                label="Start an Audit"
                variant="secondary"
                onPress={() => router.push('/(app)/audit')}
              />
            )}
          </View>
        </Panel>
      )}

      <Panel
        title="History"
        right={
          <Text
            style={styles.link}
            onPress={() => setHistoryOpen((v) => !v)}
          >
            {historyOpen ? 'Hide' : 'View History'}
          </Text>
        }
      >
        {!historyOpen ? (
          <Text style={styles.muted}>Tap "View History" to load past assignments.</Text>
        ) : historyQuery.isLoading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : (historyQuery.data?.length ?? 0) === 0 ? (
          <Text style={styles.muted}>No assignment history.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {historyQuery.data!.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <History size={16} color={colors.slate400} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{entry.userName}</Text>
                  <Text style={styles.rowSub}>
                    {formatDate(entry.assignedOn)}
                    {entry.returnedOn ? ` – ${formatDate(entry.returnedOn)}` : ' – present'}
                  </Text>
                </View>
                <StatusPill label={entry.status} tone={toneForAssetStatus(entry.status)} />
              </View>
            ))}
          </View>
        )}
      </Panel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tag: {
    fontFamily: 'Courier',
    fontSize: 13,
    color: colors.slate400,
    fontWeight: '600',
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.slate900, marginTop: 2 },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  fieldLabel: { fontSize: 13, color: colors.slate400, flex: 1 },
  fieldValue: { fontSize: 13, fontWeight: '600', color: colors.slate900, flexShrink: 1, textAlign: 'right' },
  muted: { color: colors.slate400, fontSize: 13 },
  link: { fontSize: 12, color: colors.blue600, fontWeight: '600' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.slate900 },
  rowSub: { fontSize: 12, color: colors.slate400, marginTop: 2 },
});
