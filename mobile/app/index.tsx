import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/theme/colors';

// Entry point - decides between /login and /(app)/dashboard once
// session restoration (see lib/auth-context.tsx) has finished reading
// SecureStore. Shows a brief spinner rather than flashing the login
// screen before a valid session is found.
export default function Index() {
  const { user, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.blue500} />
      </View>
    );
  }

  return <Redirect href={user ? '/(app)/dashboard' : '/login'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.slate50,
  },
});
