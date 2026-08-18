import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { getOfficeLocations } from '@/api/locations';
import { getDepartments } from '@/api/departments';
import { getRecentAudits, startAudit } from '@/api/audits';
import { useAuth, canManageAssets } from '@/lib/auth-context';
import { Panel } from '@/components/Panel';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusPill } from '@/components/StatusPill';
import { ErrorBanner } from '@/components/ErrorBanner';
import { colors } from '@/theme/colors';
import { ApiError, AssetAuditResponse } from '@/types/api';

// Start/browse physical audit ("stocktake") sessions - the new backend
// module (AssetAuditController). Starting one snapshots every asset
// currently expected at a Location (+ optional Department) as of "now"
// (see backend AssetAuditService.ResolveExpectedAssetIdsAsync) - real
// data, never a fabricated expected count (section 10).
export default function AuditListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = canManageAssets(user?.role);

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const locationsQuery = useQuery({
    queryKey: ['office-locations'],
    queryFn: getOfficeLocations,
    enabled: canManage,
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    enabled: canManage,
  });

  const activeQuery = useQuery({
    queryKey: ['audits', 'InProgress'],
    queryFn: () => getRecentAudits('InProgress', 20),
  });

  const recentQuery = useQuery({
    queryKey: ['audits', 'Completed'],
    queryFn: () => getRecentAudits('Completed', 10),
  });

  if (!canManage) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <ErrorBanner message="You don't have permission to run asset audits." />
        <AuditSessionList
          title="In Progress"
          query={activeQuery}
          pillLabel="In Progress"
          pillTone="pending"
          onOpen={(id) => router.push(`/(app)/audit/${id}`)}
          emptyLabel="No audit sessions in progress."
        />
      </ScrollView>
    );
  }

  const selectedLocation =
    locationsQuery.data?.find((l) => l.id === selectedLocationId) ?? null;

  const availableDepartments = selectedLocation
    ? (departmentsQuery.data ?? []).filter(
        (d) => d.isActive && d.companyId === selectedLocation.companyId
      )
    : [];

  const handleStart = async () => {
    if (!selectedLocationId) return;

    setStarting(true);
    setStartError(null);

    try {
      const result = await startAudit({
        locationId: selectedLocationId,
        departmentId: selectedDepartmentId,
      });

      queryClient.invalidateQueries({ queryKey: ['audits'] });
      router.push(`/(app)/audit/${result.audit.id}`);
    } catch (err) {
      const apiError = err as ApiError;
      setStartError(apiError.message ?? 'Could not start the audit session.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Panel title="Start New Audit" subtitle="Choose the location to reconcile">
        {locationsQuery.isLoading ? (
          <ActivityIndicator color={colors.blue500} />
        ) : (
          <View style={{ gap: 6 }}>
            {(locationsQuery.data ?? [])
              .filter((l) => l.isActive)
              .map((loc) => {
                const selected = selectedLocationId === loc.id;
                return (
                  <Pressable
                    key={loc.id}
                    onPress={() => {
                      setSelectedLocationId(loc.id);
                      setSelectedDepartmentId(null);
                    }}
                    style={[styles.optionRow, selected && styles.optionRowSelected]}
                  >
                    <Text style={styles.rowTitle}>{loc.locationName}</Text>
                    <Text style={styles.rowSub}>{loc.city}</Text>
                  </Pressable>
                );
              })}
          </View>
        )}

        {selectedLocation ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Department (optional)</Text>
            <View style={{ gap: 6, marginTop: 6 }}>
              <Pressable
                onPress={() => setSelectedDepartmentId(null)}
                style={[
                  styles.optionRow,
                  selectedDepartmentId === null && styles.optionRowSelected,
                ]}
              >
                <Text style={styles.rowTitle}>Entire location</Text>
              </Pressable>
              {availableDepartments.map((dept) => {
                const selected = selectedDepartmentId === dept.id;
                return (
                  <Pressable
                    key={dept.id}
                    onPress={() => setSelectedDepartmentId(dept.id)}
                    style={[styles.optionRow, selected && styles.optionRowSelected]}
                  >
                    <Text style={styles.rowTitle}>{dept.departmentName}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {startError ? (
          <View style={{ marginTop: 12 }}>
            <ErrorBanner message={startError} />
          </View>
        ) : null}

        <PrimaryButton
          label="Start Audit"
          disabled={!selectedLocationId}
          loading={starting}
          onPress={handleStart}
          style={{ marginTop: 14 }}
        />
      </Panel>

      <AuditSessionList
        title="In Progress"
        query={activeQuery}
        pillLabel="In Progress"
        pillTone="pending"
        onOpen={(id) => router.push(`/(app)/audit/${id}`)}
        emptyLabel="No audit sessions in progress."
      />

      <AuditSessionList
        title="Recently Completed"
        query={recentQuery}
        pillLabel="Completed"
        pillTone="success"
        onOpen={(id) => router.push(`/(app)/audit/${id}`)}
        emptyLabel="No completed audits yet."
      />
    </ScrollView>
  );
}

function AuditSessionList({
  title,
  query,
  pillLabel,
  pillTone,
  onOpen,
  emptyLabel,
}: {
  title: string;
  query: UseQueryResult<AssetAuditResponse[], unknown>;
  pillLabel: string;
  pillTone: 'pending' | 'success';
  onOpen: (id: number) => void;
  emptyLabel: string;
}) {
  return (
    <Panel title={title}>
      {query.isLoading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : (query.data?.length ?? 0) === 0 ? (
        <Text style={styles.muted}>{emptyLabel}</Text>
      ) : (
        <View style={{ gap: 10 }}>
          {query.data!.map((audit) => (
            <Pressable
              key={audit.id}
              onPress={() => onOpen(audit.id)}
              style={styles.row}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{audit.locationName}</Text>
                <Text style={styles.rowSub}>
                  {audit.foundCount}/{audit.expectedCount} found
                  {audit.departmentName ? ` · ${audit.departmentName}` : ''}
                </Text>
              </View>
              <StatusPill label={pillLabel} tone={pillTone} />
            </Pressable>
          ))}
        </View>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16, gap: 16 },
  muted: { color: colors.slate400, fontSize: 13 },
  field: {
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  fieldLabel: { fontSize: 12, color: colors.slate400 },
  optionRow: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  optionRowSelected: {
    borderColor: colors.blue500,
    backgroundColor: colors.blue50,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.slate900 },
  rowSub: { fontSize: 12, color: colors.slate400, marginTop: 2 },
});
