import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, statusTone, StatusTone } from '@/theme/colors';

interface StatusPillProps {
  label: string;
  tone: StatusTone;
}

// Mirrors the web app's nova-pill convention, including "never rely on
// color alone" (section 25) - every pill pairs a colored dot with the
// text label, and the label itself carries the meaning.
export function StatusPill({ label, tone }: StatusPillProps) {
  const palette = statusTone[tone];

  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <View style={[styles.dot, { backgroundColor: palette.dot }]} />
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

// Maps a backend status string to a tone - shared so the Dashboard,
// Asset Details, Search results, and Audit results screens all color
// the same status word the same way.
export function toneForAssetStatus(status: string): StatusTone {
  const normalized = status.toLowerCase();
  if (normalized === 'available') return 'success';
  if (normalized === 'assigned') return 'info';
  if (normalized === 'maintenance') return 'pending';
  if (normalized === 'retired' || normalized === 'inactive') return 'neutral';
  return 'neutral';
}

export function toneForAuditResult(state: string): StatusTone {
  switch (state) {
    case 'Found':
      return 'success';
    case 'Missing':
      return 'danger';
    case 'Unexpected':
      return 'pending';
    case 'WrongLocation':
      return 'info';
    default:
      return 'neutral';
  }
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate700,
  },
});
