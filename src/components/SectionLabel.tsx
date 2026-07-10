import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing } from '../constants/theme';

// The uppercase muted section-title pattern repeated in nearly every screen.
export default function SectionLabel({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.extrabold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
});
