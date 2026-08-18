import React, { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { QrCode, Search, ClipboardCheck, History, LogOut, PackagePlus } from 'lucide-react-native';
import { useAuth, canManageAssets } from '@/lib/auth-context';
import { getRecentAudits } from '@/api/audits';
import { getRecentScans, RecentScanEntry } from '@/lib/recent-scans';
import { Panel } from '@/components/Panel';
import { StatusPill } from '@/components/StatusPill';
import { OfflineBanner } from '@/components/OfflineBanner';
import { colors } from '@/theme/colors';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const canManage = canManageAssets(user?.role);
  const [recentScans, setRecentScans] = useState<RecentScanEntry[]>([]);

  const loadRecentScans = useCallback(() => {
    getRecentScans().then(setRecentScans).catch(() => setRecentScans([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecentScans();
    }, [loadRecentScans])
  );

  const pendingAuditsQuery = useQuery({
    queryKey: ['audits', 'InProgress'],
    queryFn: () => getRecentAudits('InProgress', 5),
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={pendingAuditsQuery.isFetching}
          onRefresh={() => {
            loadRecentScans();
            pendingAuditsQuery.refetch();
          }}
        />
      }
    >
      <OfflineBanner />

      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{user?.fullName}</Text>
          <View style={styles.metaRow}>
            <StatusPill label={user?.role ?? ''} tone="info" />
            {user?.companyName ? (
              <Text style={styles.company}>{user.companyName}</Text>
            ) : null}
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/(app)/profile')}
          accessibilityRole="button"
          accessibilityLabel="Profile and settings"
          style={styles.avatarButton}
        >
          <Text style={styles.avatarInitial}>
            {(user?.fullName ?? '?').charAt(0).toUpperCase()}
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push('/(app)/scan')}
        accessibilityRole="button"
        accessibilityLabel="Scan an asset QR code"
        style={({ pressed }) => [styles.scanButton, pressed && styles.pressed]}
      >
        <QrCode size={28} color={colors.white} />
        <Text style={styles.scanButtonLabel}>Scan QR</Text>
      </Pressable>

      <View style={styles.quickActions}>
        <QuickAction
          icon={<Search size={20} color={colors.blue600} />}
          label="Search"
          onPress={() => router.push('/(app)/search')}
        />
        <QuickAction
          icon={<ClipboardCheck size={20} color={colors.blue600} />}
          label="Audit"
          onPress={() => router.push('/(app)/audit')}
        />
        {canManage ? (
          <QuickAction
            icon={<PackagePlus size={20} color={colors.blue600} />}
            label="Add Asset"
            onPress={() => router.push('/(app)/asset/new')}
          />
        ) : null}
        <QuickAction
          icon={<History size={20} color={colors.blue600} />}
          label="Recent"
          onPress={() => router.push('/(app)/recent-scans')}
        />
        <QuickAction
          icon={<LogOut size={20} color={colors.red600} />}
          label="Sign Out"
          onPress={() => signOut()}
        />
      </View>

      <Panel title="Pending Audits" subtitle="Sessions in progress">
        {pendingAuditsQuery.isLoading ? (
          <Text style={styles.muted}>Loading…</Text>
        ) : (pendingAuditsQuery.data?.length ?? 0) === 0 ? (
          <Text style={styles.muted}>No audit sessions in progress.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {pendingAuditsQuery.data!.map((audit) => (
              <Pressable
                key={audit.id}
                onPress={() => router.push(`/(app)/audit/${audit.id}`)}
                style={styles.row}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{audit.locationName}</Text>
                  <Text style={styles.rowSub}>
                    {audit.foundCount}/{audit.expectedCount} scanned
                    {audit.departmentName ? ` · ${audit.departmentName}` : ''}
                  </Text>
                </View>
                <StatusPill label="In Progress" tone="pending" />
              </Pressable>
            ))}
          </View>
        )}
      </Panel>

      <Panel
        title="Recent Scans"
        subtitle={`${recentScans.length} total`}
        right={
          recentScans.length > 0 ? (
            <Pressable onPress={() => router.push('/(app)/recent-scans')}>
              <Text style={styles.link}>View all</Text>
            </Pressable>
          ) : undefined
        }
      >
        {recentScans.length === 0 ? (
          <Text style={styles.muted}>
            Nothing scanned yet - tap Scan QR to get started.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {recentScans.slice(0, 3).map((scan) => (
              <Pressable
                key={`${scan.assetId}-${scan.scannedAt}`}
                onPress={() => router.push(`/(app)/asset/${scan.assetId}`)}
                style={styles.row}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{scan.assetTag}</Text>
                  <Text style={styles.rowSub}>{scan.assetName}</Text>
                </View>
                <Text style={styles.rowTime}>
                  {new Date(scan.scannedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </Panel>
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
    >
      {icon}
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16, gap: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { fontSize: 20, fontWeight: '700', color: colors.slate900 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  company: { fontSize: 12, color: colors.slate400 },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blue50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: colors.blue600, fontWeight: '700' },
  scanButton: {
    backgroundColor: colors.blue500,
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanButtonLabel: { color: colors.white, fontSize: 17, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickAction: {
    flexGrow: 1,
    flexBasis: '22%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    minHeight: 64,
    justifyContent: 'center',
  },
  quickActionLabel: { fontSize: 11, fontWeight: '600', color: colors.slate700 },
  muted: { color: colors.slate400, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.slate900 },
  rowSub: { fontSize: 12, color: colors.slate400, marginTop: 2 },
  rowTime: { fontSize: 12, color: colors.slate400 },
  link: { fontSize: 12, color: colors.blue600, fontWeight: '600' },
});
