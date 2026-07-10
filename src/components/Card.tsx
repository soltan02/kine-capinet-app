import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors, Spacing, BorderRadius, Shadow } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'flat' | 'elevated';
  style?: StyleProp<ViewStyle>;
}

// Thin wrapper over the shared card look — used instead of each screen
// re-declaring the same backgroundColor/borderRadius/shadow block.
export default function Card({ children, variant = 'flat', style }: CardProps) {
  return <View style={[styles.base, variant === 'elevated' && Shadow.md, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
});
