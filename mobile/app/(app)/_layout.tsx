import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/theme/colors';

// Guards every screen under (app) - unauthenticated access redirects
// to /login instead of rendering. Session-expiration (a 401 from any
// API call) is handled the same way, since signOut() from
// lib/auth-context.tsx clears `user` and this layout re-evaluates.
export default function AppLayout() {
  const { user, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.blue500} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.slate900,
        headerTitleStyle: { fontWeight: '600', fontSize: 16 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.slate50 },
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: 'PPS Asset Scanner' }} />
      <Stack.Screen name="scan" options={{ title: 'Scan Asset', presentation: 'fullScreenModal' }} />
      <Stack.Screen name="search" options={{ title: 'Search Assets' }} />
      <Stack.Screen name="recent-scans" options={{ title: 'Recent Scans' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile & Settings' }} />
      <Stack.Screen name="asset/new" options={{ title: 'Add Asset' }} />
      <Stack.Screen name="asset/[id]" options={{ title: 'Asset Details' }} />
      <Stack.Screen name="asset/[id]/transfer" options={{ title: 'Transfer Asset' }} />
      <Stack.Screen name="audit/index" options={{ title: 'Audit' }} />
      <Stack.Screen name="audit/[id]" options={{ title: 'Audit Session' }} />
      <Stack.Screen
        name="gate-pass/scan"
        options={{ title: 'Scan Gate Pass', presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="gate-pass/[gatePassNumber]" options={{ title: 'Gate Pass' }} />
      <Stack.Screen
        name="asset/scan-pr"
        options={{ title: 'Scan PR / PO', presentation: 'fullScreenModal' }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.slate50,
  },
});
