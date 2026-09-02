import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getByGatePassNumber, transferMovement, receiveMovement } from '@/api/materialMovements';
import { useAuth, canHandleGatePass } from '@/lib/auth-context';
import { Panel } from '@/components/Panel';
import { StatusPill, toneForMovementStatus } from '@/components/StatusPill';
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

function formatDateTime(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString();
}

// Facility's mobile "scan the gate pass, tap the one action that's
// currently valid" screen. The action offered is entirely driven by the
// movement's current Status - AwaitingTransfer -> Confirm Transfer
// (Outward), Dispatched -> Confirm Receipt (Inward), anything else is
// read-only. No offline queueing here (matches asset/[id]/transfer.tsx's
// existing online-only behavior) - both actions need a live server
// decision.
export default function GatePassDetailScreen() {
  const { gatePassNumber: rawGatePassNumber } = useLocalSearchParams<{
    gatePassNumber: string;
  }>();
  // useLocalSearchParams already decodes the route segment - matches
  // every other dynamic-route screen in this app (asset/[id].tsx,
  // asset/[id]/transfer.tsx, audit/[id].tsx), none of which re-decode.
  const gatePassNumber = rawGatePassNumber ?? '';
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const movementQuery = useQuery({
    queryKey: ['gate-pass', gatePassNumber],
    queryFn: () => getByGatePassNumber(gatePassNumber),
    enabled: gatePassNumber.length > 0 && canHandleGatePass(user?.role),
  });

  if (!canHandleGatePass(user?.role)) {
    return (
      <View style={styles.centered}>
        <ErrorBanner message="You don't have permission to handle gate passes." />
      </View>
    );
  }

  if (movementQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Looking up {gatePassNumber}…</Text>
      </View>
    );
  }

  if (movementQuery.isError || !movementQuery.data) {
    const apiError = movementQuery.error as ApiError | undefined;
    return (
      <View style={styles.screen}>
        <ErrorBanner
          message={
            apiError?.status === 404
              ? `No movement found for gate pass ${gatePassNumber}.`
              : apiError?.message ?? 'Could not look up this gate pass.'
          }
        />
        <PrimaryButton
          label="Scan Again"
          variant="secondary"
          onPress={() => router.replace('/(app)/gate-pass/scan')}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  const movement = movementQuery.data;
  const dispatch = movement.dispatch;

  const applyResult = (updated: typeof movement) => {
    queryClient.setQueryData(['gate-pass', gatePassNumber], updated);
  };

  const handleTransfer = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await transferMovement(movement.id);
      applyResult(updated);
    } catch (err) {
      const apiError = err as ApiError;
      setSubmitError(apiError.message ?? 'The transfer could not be confirmed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceive = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await receiveMovement(movement.id, {
        discrepancyNotes: discrepancyNotes.trim() || null,
      });
      applyResult(updated);
    } catch (err) {
      const apiError = err as ApiError;
      setSubmitError(apiError.message ?? 'The receipt could not be confirmed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tag}>{dispatch?.gatePassNumber ?? gatePassNumber}</Text>
          <Text style={styles.name}>{movement.movementNumber ?? movement.movementType}</Text>
        </View>
        <StatusPill label={movement.status} tone={toneForMovementStatus(movement.status)} />
      </View>

      <Panel title="Movement">
        <Field label="Type" value={movement.movementType} />
        <Field label="Requested By" value={movement.requestedByUserName} />
        <Field label="Requested On" value={formatDateTime(movement.requestedAt)} />
        <Field label="Vendor" value={movement.vendorName} />
        <Field label="Purpose" value={movement.purpose} />
      </Panel>

      <Panel title="From">
        <Field label="Entity" value={movement.fromCompanyName} />
        <Field label="Location" value={movement.fromLocationName} />
        <Field label="Department" value={movement.fromDepartmentName} />
      </Panel>

      <Panel title="To">
        <Field label="Entity" value={movement.toCompanyName} />
        <Field label="Location" value={movement.toLocationName} />
        <Field label="Department" value={movement.toDepartmentName} />
      </Panel>

      {movement.items.length > 0 ? (
        <Panel title={`Items (${movement.items.length})`}>
          <View style={{ gap: 10 }}>
            {movement.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    {item.assetTag ? `${item.assetTag} — ${item.assetName}` : item.itemName}
                  </Text>
                  <Text style={styles.rowSub}>
                    {item.materialType} · Qty {item.quantity}
                    {item.unitOfMeasure ? ` ${item.unitOfMeasure}` : ''}
                    {item.condition ? ` · ${item.condition}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Panel>
      ) : null}

      {dispatch ? (
        <Panel title="Gate Pass">
          <Field label="Gate Pass Number" value={dispatch.gatePassNumber} />
          <Field label="Generated By" value={dispatch.dispatchedByUserName} />
          <Field label="Generated On" value={formatDateTime(dispatch.dispatchedAt)} />
          <Field label="Transferred By" value={dispatch.transferredByUserName} />
          <Field label="Transferred On" value={formatDateTime(dispatch.transferredAt)} />
          <Field label="Transporter" value={dispatch.transporterName} />
          <Field label="Vehicle" value={dispatch.vehicleNumber} />
        </Panel>
      ) : null}

      <Panel title="Action">
        {submitError ? (
          <View style={{ marginBottom: 12 }}>
            <ErrorBanner message={submitError} />
          </View>
        ) : null}

        {movement.status === 'AwaitingTransfer' ? (
          <PrimaryButton
            label="Confirm Transfer (Outward)"
            loading={submitting}
            onPress={handleTransfer}
          />
        ) : movement.status === 'Dispatched' ? (
          <View style={{ gap: 10 }}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Discrepancy Notes (optional)</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Note any damage, shortage, or mismatch…"
                placeholderTextColor={colors.slate400}
                value={discrepancyNotes}
                onChangeText={setDiscrepancyNotes}
                multiline
              />
            </View>
            <PrimaryButton
              label="Confirm Receipt (Inward)"
              loading={submitting}
              onPress={handleReceive}
            />
          </View>
        ) : (
          <Text style={styles.muted}>
            {movement.status === 'Received' || movement.status === 'Completed'
              ? `Already received${
                  formatDateTime(dispatch?.transferredAt)
                    ? ` — transferred ${formatDateTime(dispatch?.transferredAt)}`
                    : ''
                }.`
              : `No action available while this movement is ${movement.status}.`}
          </Text>
        )}
      </Panel>

      <PrimaryButton
        label="Scan Another Gate Pass"
        variant="secondary"
        onPress={() => router.replace('/(app)/gate-pass/scan')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 16, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tag: { fontFamily: 'Courier', fontSize: 13, color: colors.slate400, fontWeight: '600' },
  name: { fontSize: 20, fontWeight: '700', color: colors.slate900, marginTop: 2 },
  field: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
    gap: 4,
  },
  fieldLabel: { fontSize: 12, color: colors.slate400 },
  fieldValue: { fontSize: 14, fontWeight: '600', color: colors.slate900 },
  muted: { color: colors.slate400, fontSize: 13 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
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
