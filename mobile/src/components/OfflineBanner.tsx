import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { useIsOnline } from '@/lib/network';

// A persistent, unmissable strip rather than a one-off toast, since
// being offline changes what several screens can do (section 8/17).
export function OfflineBanner() {
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        You&apos;re offline. Scans are being saved and will sync automatically.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.amber50,
    borderBottomWidth: 1,
    borderBottomColor: colors.amber500 + '4D',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: {
    color: colors.amber600,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
