import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Check } from 'lucide-react-native';
import { getAssetFullDetail } from '@/api/assets';
import { assignAsset, transferAsset } from '@/api/transfers';
import { searchUsers } from '@/api/users';
import { useAuth, canManageAssets } from '@/lib/auth-context';
import { Panel } from '@/components/Panel';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ErrorBanner } from '@/components/ErrorBanner';
import { colors } from '@/theme/colors';
import { ApiError, UserResponse } from '@/types/api';

type Step = 'destination' | 'review';

// Transfer moves WHO holds an asset - not its seat. Mobile deliberately
// doesn't offer reseating (section 13: a mobile scan shouldn't be able
// to cause side effects a user didn't ask for) - the asset's current
// seat, if any, is preserved exactly as-is by resending its existing
// SeatId, matching TransferAssetRequest's documented "keep the asset
// on its current seat" behavior instead of silently unseating it.
export default function TransferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const assetId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('destination');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const assetQuery = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => getAssetFullDetail(assetId),
    enabled: Number.isFinite(assetId),
  });

  const usersQuery = useQuery({
    queryKey: ['users', debouncedSearch],
    queryFn: () => searchUsers(debouncedSearch, 1, 20),
    enabled: debouncedSearch.trim().length >= 2,
  });

  if (!canManageAssets(user?.role)) {
    return (
      <View style={styles.centered}>
        <ErrorBanner message="You don't have permission to transfer assets." />
      </View>
    );
  }

  if (assetQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.blue500} />
      </View>
    );
  }

  if (assetQuery.isError || !assetQuery.data) {
    return (
      <View style={styles.centered}>
        <ErrorBanner message="Could not load this asset." />
      </View>
    );
  }

  const asset = assetQuery.data;
  const isReassignment = Boolean(asset.assignmentId);

  const handleConfirm = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      if (isReassignment) {
        await transferAsset(asset.assignmentId!, {
          newUserId: selectedUser.id,
          remarks: remarks || null,
          // Preserve the current seat exactly - see file header comment.
          seatId: asset.seatId ?? null,
        });
      } else {
        await assignAsset({
          assetId: asset.assetId,
          userId: selectedUser.id,
          remarks: remarks || null,
          seatId: null,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });

      router.replace({
        pathname: `/(app)/asset/${assetId}`,
      });
    } catch (err) {
      const apiError = err as ApiError;
      setSubmitError(apiError.message ?? 'The transfer could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Panel title="Current">
        <SummaryRow label="Asset" value={`${asset.assetTag} — ${asset.assetName}`} />
        <SummaryRow label="Entity" value={asset.companyName} />
        <SummaryRow label="Location" value={asset.officeLocationName} />
        <SummaryRow label="Department" value={asset.departmentName} />
        <SummaryRow label="Assigned Employee" value={asset.userName ?? 'Unassigned'} />
      </Panel>

      {step === 'destination' ? (
        <Panel title="Destination" subtitle="Search for the employee to assign this asset to">
          <View style={styles.searchBox}>
            <Search size={16} color={colors.slate400} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, or employee code"
              placeholderTextColor={colors.slate400}
              value={search}
              onChangeText={setSearch}
              accessibilityLabel="Search for destination employee"
            />
          </View>

          {debouncedSearch.trim().length < 2 ? (
            <Text style={styles.muted}>Type at least 2 characters to search.</Text>
          ) : usersQuery.isLoading ? (
            <ActivityIndicator color={colors.blue500} style={{ marginTop: 8 }} />
          ) : (usersQuery.data?.items.length ?? 0) === 0 ? (
            <Text style={styles.muted}>No employees found.</Text>
          ) : (
            <View style={{ gap: 4, marginTop: 8 }}>
              {usersQuery.data!.items.map((candidate) => {
                const selected = selectedUser?.id === candidate.id;
                return (
                  <Pressable
                    key={candidate.id}
                    onPress={() => setSelectedUser(candidate)}
                    style={[styles.userRow, selected && styles.userRowSelected]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{candidate.fullName}</Text>
                      <Text style={styles.rowSub}>
                        {candidate.departmentName ?? candidate.email}
                      </Text>
                    </View>
                    {selected ? <Check size={18} color={colors.blue600} /> : null}
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Remarks (optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Add any notes for this transfer…"
              placeholderTextColor={colors.slate400}
              value={remarks}
              onChangeText={setRemarks}
              multiline
            />
          </View>

          <PrimaryButton
            label="Review Transfer"
            disabled={!selectedUser}
            onPress={() => setStep('review')}
            style={{ marginTop: 12 }}
          />
        </Panel>
      ) : (
        <Panel title="Review">
          <SummaryRow label="Asset" value={asset.assetTag} />
          <SummaryRow label="From" value={asset.userName ?? 'Unassigned'} />
          <SummaryRow label="To" value={selectedUser?.fullName} />
          <SummaryRow label="Department" value={selectedUser?.departmentName} />
          {remarks ? <SummaryRow label="Remarks" value={remarks} /> : null}

          {submitError ? (
            <View style={{ marginTop: 12 }}>
              <ErrorBanner message={submitError} />
            </View>
          ) : null}

          <View style={{ gap: 10, marginTop: 16 }}>
            <PrimaryButton
              label="Confirm Transfer"
              loading={submitting}
              onPress={handleConfirm}
            />
            <PrimaryButton
              label="Back"
              variant="secondary"
              disabled={submitting}
              onPress={() => setStep('destination')}
            />
          </View>
        </Panel>
      )}
    </ScrollView>
  );
}

function SummaryRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 16, gap: 16 },
  field: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    marginTop: 4,
    gap: 4,
  },
  fieldLabel: { fontSize: 12, color: colors.slate400 },
  fieldValue: { fontSize: 14, fontWeight: '600', color: colors.slate900 },
  muted: { color: colors.slate400, fontSize: 13, marginTop: 4 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.slate900 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  userRowSelected: { backgroundColor: colors.blue50 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.slate900 },
  rowSub: { fontSize: 12, color: colors.slate400, marginTop: 2 },
  textArea: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 10,
    padding: 12,
    minHeight: 70,
    fontSize: 14,
    color: colors.slate900,
    textAlignVertical: 'top',
  },
});
