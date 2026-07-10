import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, Modal, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../constants/theme';
import { Client } from '../lib/supabase';
import { useResponsive } from '../hooks/useResponsive';

interface PatientPickerProps {
  label: string;
  clients: Client[];
  selectedClientId: string | null;
  onSelect: (clientId: string) => void;
  placeholder?: string;
}

// Dropdown + search field for picking a patient — replaces the inline chip
// list, which became unwieldy once a clinic has more than a handful of
// patients (couldn't find someone by scanning, no way to filter by name).
export default function PatientPicker({ label, clients, selectedClientId, onSelect, placeholder }: PatientPickerProps) {
  const { t } = useTranslation();
  const { isDesktop } = useResponsive();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedName = selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : '';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(q));
  }, [clients, query]);

  const handleOpen = () => {
    setQuery('');
    setOpen(true);
  };

  const handleSelect = (clientId: string) => {
    onSelect(clientId);
    setOpen(false);
  };

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.field} onPress={handleOpen} activeOpacity={0.7}>
        <Text style={[styles.value, !selectedName && styles.placeholder]} numberOfLines={1}>
          {selectedName || placeholder || t('appointments.selectClient')}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={[styles.overlay, isDesktop && styles.overlayDesktop]}>
          <SafeAreaView style={[styles.sheet, isDesktop && styles.sheetDesktop]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('appointments.selectClient')}</Text>
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
              renderItem={({ item }) => {
                const isSelected = item.id === selectedClientId;
                return (
                  <TouchableOpacity
                    style={[styles.row, isSelected && styles.rowSelected]}
                    onPress={() => handleSelect(item.id)}
                  >
                    <Text style={styles.rowText}>{item.first_name} {item.last_name}</Text>
                    {isSelected ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : null}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyText}>{t('appointments.noClientsAvailable')}</Text>}
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
  overlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '80%',
    ...Shadow.lg,
  },
  sheetDesktop: {
    width: '100%',
    maxWidth: 480,
    maxHeight: 560,
    borderRadius: BorderRadius.xxl,
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
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontSize: FontSize.sm, padding: Spacing.xl },
});
