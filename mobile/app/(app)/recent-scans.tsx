import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { History } from 'lucide-react-native';
import { clearRecentScans, getRecentScans, RecentScanEntry } from '@/lib/recent-scans';
import { StatusPill, toneForAssetStatus } from '@/components/StatusPill';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/theme/colors';

// The full local scan history (section 16) - a lightweight convenience
// list only, never a mirror of the asset database. Tapping any entry
// re-fetches the asset live from the backend rather than showing
// stale cached details.
export default function RecentScansScreen() {
  const router = useRouter();
  const [scans, setScans] = useState<RecentScanEntry[]>([]);

  const load = useCallback(() => {
    getRecentScans().then(setScans).catch(() => setScans([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleClear = () => {
    if (scans.length === 0) return;

    Alert.alert('Clear Recent Scans', 'This only clears your local history on this device - it does not change any asset data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearRecentScans();
          setScans([]);
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {scans.length === 0 ? (
        <View style={styles.empty}>
          <History size={28} color={colors.slate400} />
          <Text style={styles.muted}>
            Nothing scanned yet - tap Scan QR from the dashboard to get started.
          </Text>
        </View>
      ) : (
        <>
          <View style={{ gap: 10 }}>
            {scans.map((scan) => (
              <Pressable
                key={`${scan.assetId}-${scan.scannedAt}`}
                onPress={() => router.push(`/(app)/asset/${scan.assetId}`)}
                style={styles.row}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTag}>{scan.assetTag}</Text>
                  <Text style={styles.rowTitle}>{scan.assetName}</Text>
                  <Text style={styles.rowSub}>
                    {scan.locationName ?? 'Unknown location'} ·{' '}
                    {new Date(scan.scannedAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <StatusPill label={scan.status} tone={toneForAssetStatus(scan.status)} />
              </Pressable>
            ))}
          </View>

          <PrimaryButton
            label="Clear History"
            variant="secondary"
            onPress={handleClear}
            style={{ marginTop: 20 }}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  content: { padding: 16 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  muted: { color: colors.slate400, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 10,
    padding: 12,
  },
  rowTag: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: colors.slate400,
    fontWeight: '600',
  },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.slate900, marginTop: 2 },
  rowSub: { fontSize: 12, color: colors.slate400, marginTop: 2 },
});
