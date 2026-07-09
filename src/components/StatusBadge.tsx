import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/theme';
import { AppointmentStatus } from '../lib/supabase';

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  scheduled: Colors.scheduled,
  confirmed: Colors.confirmed,
  completed: Colors.completed,
  cancelled: Colors.cancelled,
  no_show: Colors.no_show,
};

export function getStatusColor(status: AppointmentStatus): string {
  return APPOINTMENT_STATUS_COLORS[status] ?? Colors.textMuted;
}

interface StatusBadgeProps {
  status: AppointmentStatus;
  label: string;
  variant?: 'pill' | 'dot';
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, label, variant = 'pill', size = 'md' }: StatusBadgeProps) {
  const color = getStatusColor(status);

  if (variant === 'dot') {
    return (
      <View style={styles.dotRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.dotLabel, size === 'sm' && styles.dotLabelSm, { color }]}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.pill, size === 'sm' && styles.pillSm, { backgroundColor: color + '14', borderColor: color + '33' }]}>
      <View style={[styles.pillDot, size === 'sm' && styles.pillDotSm, { backgroundColor: color }]} />
      <Text style={[styles.pillText, size === 'sm' && styles.pillTextSm, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pillSm: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    gap: 4,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillDotSm: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  pillText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  pillTextSm: {
    fontSize: 10,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  dotLabelSm: {
    fontSize: FontSize.xs,
  },
});
