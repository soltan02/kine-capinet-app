import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/theme';

export interface DateTimeFieldProps {
  mode: 'date' | 'time';
  value: string; // date -> 'YYYY-MM-DD', time -> 'HH:MM'
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toDate = (mode: 'date' | 'time', value: string): Date => {
  const d = new Date();
  if (mode === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, day] = value.split('-').map(Number);
    return new Date(y, m - 1, day);
  }
  if (mode === 'time' && /^\d{1,2}:\d{2}/.test(value)) {
    const [h, min] = value.split(':').map(Number);
    d.setHours(h, min, 0, 0);
  }
  return d;
};
const fromDate = (mode: 'date' | 'time', d: Date): string =>
  mode === 'date'
    ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    : `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function DateTimeField({ mode, value, onChange, label, placeholder, required, error }: DateTimeFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <View style={styles.group}>
      {label ? (
        <Text style={styles.label}>
          {label} {required ? <Text style={styles.star}>*</Text> : null}
        </Text>
      ) : null}
      <TouchableOpacity
        style={[styles.field, error && styles.fieldError]}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={18} color={Colors.primary} />
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value || placeholder || (mode === 'date' ? 'AAAA-MM-JJ' : 'HH:MM')}
        </Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {show ? (
        <DateTimePicker
          value={toDate(mode, value)}
          mode={mode}
          is24Hour
          display="default"
          onChange={(event, selected) => {
            setShow(false);
            if (event.type === 'set' && selected) onChange(fromDate(mode, selected));
          }}
        />
      ) : null}
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
  value: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '500' },
  placeholder: { color: Colors.textMuted, fontWeight: '400' },
  errorText: { color: Colors.danger, fontSize: FontSize.xs, marginTop: 3 },
});
