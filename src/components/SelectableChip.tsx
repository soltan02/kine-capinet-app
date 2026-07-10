import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../constants/theme';
import { useHover } from '../hooks/useHover';

interface SelectableChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}

// The role/method/status/client picker chip pattern duplicated across
// AddPaymentScreen, AddAppointmentScreen, AddUserScreen, UserManagementScreen.
export default function SelectableChip({ label, selected, onPress, icon, color }: SelectableChipProps) {
  const activeColor = color || Colors.primary;
  const { hovered, hoverProps } = useHover();
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && { borderColor: activeColor, backgroundColor: activeColor + '18' },
        !selected && hovered && styles.hovered,
        Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
      ]}
      onPress={onPress}
      activeOpacity={0.75}
      {...hoverProps}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? activeColor : Colors.textMuted} /> : null}
      <Text style={[styles.text, selected && { color: activeColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.inputBg,
  },
  text: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
  },
  hovered: {
    backgroundColor: Colors.border,
  },
});
