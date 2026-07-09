import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles } from '../constants/theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  iconSize?: number;
  variant?: 'fill' | 'card';
  action?: { label: string; onPress: () => void };
}

export default function EmptyState({ icon, message, iconSize = 56, variant = 'fill', action }: EmptyStateProps) {
  const circle = Math.round(iconSize * 1.6);
  const content = (
    <>
      <View style={[styles.iconCircle, { width: circle, height: circle, borderRadius: circle / 2 }]}>
        <Ionicons name={icon} size={iconSize} color={Colors.primary} />
      </View>
      <Text style={CommonStyles.emptyStateText}>{message}</Text>
      {action ? (
        <TouchableOpacity style={styles.actionBtn} onPress={action.onPress} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color={Colors.white} />
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );

  if (variant === 'card') {
    return <View style={styles.card}>{content}</View>;
  }

  return <View style={CommonStyles.emptyState}>{content}</View>;
}

const styles = StyleSheet.create({
  iconCircle: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
