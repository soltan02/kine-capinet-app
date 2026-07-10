import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../constants/theme';

type BannerType = 'error' | 'success' | 'info';

const CONFIG: Record<BannerType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  error: { icon: 'alert-circle-outline', color: Colors.danger, bg: Colors.dangerLight },
  success: { icon: 'checkmark-circle-outline', color: Colors.success, bg: Colors.successLight },
  info: { icon: 'information-circle-outline', color: Colors.info, bg: Colors.infoLight },
};

// Inline form-level feedback banner — replaces the several ad hoc
// errorBanner/errorBox styles duplicated per screen. Purely additive: the
// existing Alert.alert confirmations (deletes, etc.) are untouched, since
// those are deliberate interruption points, not validation feedback.
export default function InlineBanner({ type = 'error', message }: { type?: BannerType; message: string }) {
  const cfg = CONFIG[type];
  return (
    <View style={[styles.banner, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      <Text style={[styles.text, { color: cfg.color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  text: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
