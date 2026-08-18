import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';

// One consistent, sanitized error surface (section 18/23: never show a
// raw stack trace or backend internals) - every screen that can fail
// renders its caught, friendly ApiError.message through this.
export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.red50,
    borderWidth: 1,
    borderColor: colors.red500 + '4D',
    borderRadius: 10,
    padding: 12,
  },
  text: {
    color: colors.red600,
    fontSize: 13,
    lineHeight: 18,
  },
});
