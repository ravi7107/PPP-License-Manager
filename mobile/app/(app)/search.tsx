import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react-native';
import { searchAssets } from '@/api/assets';
import { StatusPill, toneForAssetStatus } from '@/components/StatusPill';
import { ErrorBanner } from '@/components/ErrorBanner';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth, canManageAssets } from '@/lib/auth-context';
import { colors } from '@/theme/colors';
import { ApiError } from '@/types/api';

// Manual fallback to the QR scanner (section 6/23: performance -
// "debounce manual search") - hits the same GET /Asset/list the web
// app's asset table uses (AssetService.GetPagedAsync's Contains match
// across AssetTag/AssetName/SerialNumber/HostName/Manufacturer/Model),
// never a locally-cached copy of the asset table.
export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = canManageAssets(user?.role);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const resultsQuery = useQuery({
    queryKey: ['asset-search', debouncedQuery],
    queryFn: () =>
      searchAssets({ search: debouncedQuery, page: 1, pageSize: 30 }),
    enabled: debouncedQuery.length >= 2,
  });

  const apiError = resultsQuery.error as ApiError | undefined;

  return (
    <View style={styles.screen}>
      <View style={styles.searchBox}>
        <SearchIcon size={16} color={colors.slate400} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by tag, serial, name, or host"
          placeholderTextColor={colors.slate400}
          value={query}
          onChangeText={setQuery}
          autoFocus
          accessibilityLabel="Search assets"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {debouncedQuery.length < 2 ? (
          <Text style={styles.muted}>
            Type at least 2 characters to search assets.
          </Text>
        ) : resultsQuery.isLoading ? (
          <ActivityIndicator color={colors.blue500} style={{ marginTop: 16 }} />
        ) : resultsQuery.isError ? (
          <ErrorBanner
            message={apiError?.message ?? 'Could not search assets right now.'}
          />
        ) : (resultsQuery.data?.items.length ?? 0) === 0 ? (
          <View style={{ gap: 12 }}>
            <Text style={styles.muted}>No assets match &quot;{debouncedQuery}&quot;.</Text>
            {canManage ? (
              <PrimaryButton
                label="Add as New Asset"
                variant="secondary"
                onPress={() =>
                  router.push(
                    `/(app)/asset/new?assetTag=${encodeURIComponent(debouncedQuery)}`
                  )
                }
              />
            ) : null}
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <Text style={styles.resultCount}>
              {resultsQuery.data!.totalRecords} result
              {resultsQuery.data!.totalRecords === 1 ? '' : 's'}
            </Text>
            {resultsQuery.data!.items.map((asset) => (
              <Pressable
                key={asset.id}
                onPress={() => router.push(`/(app)/asset/${asset.id}`)}
                style={styles.row}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTag}>{asset.assetTag}</Text>
                  <Text style={styles.rowTitle}>{asset.assetName}</Text>
                  <Text style={styles.rowSub}>
                    {asset.departmentName}
                    {asset.manufacturer ? ` · ${asset.manufacturer}` : ''}
                    {asset.model ? ` ${asset.model}` : ''}
                  </Text>
                </View>
                <StatusPill label={asset.status} tone={toneForAssetStatus(asset.status)} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate50 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: colors.white,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.slate900 },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  muted: { color: colors.slate400, fontSize: 13, marginTop: 8 },
  resultCount: { color: colors.slate400, fontSize: 12, marginBottom: 4 },
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
