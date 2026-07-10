import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';

interface SelectDropdownOption {
  value: string;
  label: string;
}

interface SelectDropdownProps {
  label: string;
  options: SelectDropdownOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

// Dropdown for a small, static, non-searchable list of options — mirrors
// PatientPicker/StaffPicker's field + modal chrome, minus the search bar.
export default function SelectDropdown({ label, options, selectedValue, onSelect }: SelectDropdownProps) {
  const { isDesktop } = useResponsive();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === selectedValue);

  const handleSelect = (value: string) => {
    onSelect(value);
    setOpen(false);
  };

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.field} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={styles.value} numberOfLines={1}>{selected?.label || ''}</Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={[styles.overlay, isDesktop && styles.overlayDesktop]}>
          <SafeAreaView style={[styles.sheet, isDesktop && styles.sheetDesktop]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    style={[styles.row, isSelected && styles.rowSelected]}
                    onPress={() => handleSelect(item.value)}
                  >
                    <Text style={styles.rowText}>{item.label}</Text>
                    {isSelected ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{ paddingBottom: Spacing.xl }}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary, marginBottom: Spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    height: 50,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
  },
  value: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '500' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  overlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetDesktop: {
    width: '100%',
    maxWidth: 480,
    maxHeight: 560,
    borderRadius: BorderRadius.xxl,
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '80%',
    ...Shadow.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  sheetTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rowSelected: { backgroundColor: Colors.primaryLight },
  rowText: { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: '500' },
});
