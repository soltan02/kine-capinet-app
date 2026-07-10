import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, Modal, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../constants/theme';
import { Profile } from '../lib/supabase';

interface StaffPickerProps {
  label: string;
  staff: Profile[];
  selectedStaffId: string | null;
  onSelect: (staffId: string | null) => void;
  placeholder?: string;
}

// Admin-facing picker for assigning which staff member (kiné or admin)
// performed/will perform a session — mirrors PatientPicker's dropdown +
// search modal, adapted for staff profiles and an explicit "unassign" row.
export default function StaffPicker({ label, staff, selectedStaffId, onSelect, placeholder }: StaffPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedStaff = staff.find((s) => s.id === selectedStaffId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) => s.full_name.toLowerCase().includes(q));
  }, [staff, query]);

  const handleOpen = () => {
    setQuery('');
    setOpen(true);
  };

  const handleSelect = (staffId: string | null) => {
    onSelect(staffId);
    setOpen(false);
  };

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.field} onPress={handleOpen} activeOpacity={0.7}>
        <Text style={[styles.value, !selectedStaff && styles.placeholder]} numberOfLines={1}>
          {selectedStaff?.full_name || placeholder || t('appointments.unassigned')}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <SafeAreaView style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('appointments.assignedTo')}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('clients.searchPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
              {query ? (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                !query ? (
                  <TouchableOpacity
                    style={[styles.row, !selectedStaffId && styles.rowSelected]}
                    onPress={() => handleSelect(null)}
                  >
                    <Text style={styles.rowText}>{t('appointments.unassigned')}</Text>
                    {!selectedStaffId ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : null}
                  </TouchableOpacity>
                ) : null
              }
              renderItem={({ item }) => {
                const isSelected = item.id === selectedStaffId;
                return (
                  <TouchableOpacity
                    style={[styles.row, isSelected && styles.rowSelected]}
                    onPress={() => handleSelect(item.id)}
                  >
                    <View>
                      <Text style={styles.rowText}>{item.full_name}</Text>
                      <Text style={styles.rowRole}>{t(`settings.roles.${item.role}`)}</Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>{t('appointments.noStaffAvailable')}</Text>}
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
  placeholder: { color: Colors.textMuted, fontWeight: '400' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 46,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
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
  rowRole: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontSize: FontSize.sm, padding: Spacing.xl },
});
