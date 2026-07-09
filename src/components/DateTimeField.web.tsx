import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/theme';
import type { DateTimeFieldProps } from './DateTimeField';

// Web variant: a real native <input type="date|time"> (react-dom on web).
// HTML date value is 'YYYY-MM-DD' and time value is 'HH:MM' — the exact
// formats the app already stores, so save logic is unchanged.
export default function DateTimeField({ mode, value, onChange, label, required, error }: DateTimeFieldProps) {
  return (
    <View style={styles.group}>
      {label ? (
        <Text style={styles.label}>
          {label} {required ? <Text style={styles.star}>*</Text> : null}
        </Text>
      ) : null}
      <View style={[styles.field, error && styles.fieldError]}>
        <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={18} color={Colors.primary} />
        {React.createElement('input', {
          type: mode,
          value: value || '',
          onChange: (e: any) => onChange(e.target.value),
          style: {
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: FontSize.md,
            color: Colors.textPrimary,
            fontFamily: 'inherit',
          },
        })}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs },
  star: { color: Colors.danger },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    height: 50,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  fieldError: { borderColor: Colors.danger },
  errorText: { color: Colors.danger, fontSize: FontSize.xs, marginTop: 3 },
});
