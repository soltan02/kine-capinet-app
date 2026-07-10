import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '../constants/theme';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  required?: boolean;
}

// Shared labeled-input primitive — replaces AddEditClientScreen's local
// FormField and the inline TextInput+label markup duplicated across the
// other form screens.
export default function TextField({ label, error, icon, required, multiline, ...inputProps }: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>
        {label} {required ? <Text style={styles.required}>*</Text> : null}
      </Text>
      <View style={[styles.inputRow, multiline && styles.inputRowMultiline, focused && styles.inputRowFocused, error && styles.inputRowError]}>
        {icon ? <Ionicons name={icon} size={18} color={focused ? Colors.primary : Colors.textMuted} style={styles.icon} /> : null}
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          placeholderTextColor={Colors.textMuted}
          multiline={multiline}
          onFocus={(e) => { setFocused(true); inputProps.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); inputProps.onBlur?.(e); }}
          {...inputProps}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  required: {
    color: Colors.danger,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  inputRowMultiline: {
    minHeight: 90,
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  inputRowFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  inputRowError: {
    borderColor: Colors.danger,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  inputMultiline: {
    textAlignVertical: 'top',
  },
  error: {
    color: Colors.danger,
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
});
