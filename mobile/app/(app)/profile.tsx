import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { getQueue, processQueue } from '@/lib/sync-queue';
import { useIsOnline } from '@/lib/network';
import { API_ENV_NAME } from '@/lib/env';
import { Panel } from '@/components/Panel';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusPill } from '@/components/StatusPill';
import { colors } from '@/theme/colors';

// Section 22: user/role/environment/sync status/logout - deliberately
// does NOT show the API base URL itself ("do not expose sensitive
// configuration to normal users"), only the environment name
// (Development/Staging/Production) set at build time via app.config.ts.
export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const isOnline = useIsOnline();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const loadQueueStatus = useCallback(() => {
    getQueue()
      .then((queue) =>
        setPendingCount(
          queue.filter((item) => item.status !== 'SYNCED').length
        )
      )
      .catch(() => setPendingCount(0));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadQueueStatus();
    }, [loadQueueStatus])
  );

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await processQueue();
    } finally {
      loadQueueStatus();
      setSyncing(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Panel title="Account">
        <Row label="Name" value={user?.fullName} />
        <Row label="Email" value={user?.email} />
        <Row label="Role" value={user?.role} />
        <Row label="Entity" value={user?.companyName ?? 'Not assigned'} />
      </Panel>

      <Panel title="Connection">
        <Row label="Environment" value={API_ENV_NAME} />
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Status</Text>
          <StatusPill
            label={isOnline ? 'Online' : 'Offline'}
            tone={isOnline ? 'success' : 'neutral'}
          />
        </View>
      </Panel>

      <Panel
        title="Sync"
        subtitle={
          pendingCount === 0
            ? 'Everything is synced'
            : `${pendingCount} item${pendingCount === 1 ? '' : 's'} waiting to sync`
        }
      >
        <PrimaryButton
          label="Sync Now"
          variant="secondary"
          disabled={pendingCount === 0 || !isOnline}
          loading={syncing}
          onPress={handleSyncNow}
        />
      </Panel>

      <PrimaryButton
        label="Sign Out"
        variant="danger"
        onPress={() => signOut()}
        style={{ marginTop: 8 }}
      />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16, gap: 16 },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  fieldLabel: { fontSize: 13, color: colors.slate400 },
  fieldValue: { fontSize: 13, fontWeight: '600', color: colors.slate900 },
});
