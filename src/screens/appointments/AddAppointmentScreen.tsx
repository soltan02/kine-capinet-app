import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles, TAB_BAR_CLEARANCE } from '../../constants/theme';
import { AppointmentStatus, AppointmentType, supabase } from '../../lib/supabase';
import { useAppointmentsStore, useAuthStore, useClientsStore } from '../../lib/store';
import DateTimeField from '../../components/DateTimeField';

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

interface Props {
  navigation: any;
  route?: { params?: { defaultDate?: string; clientId?: string } };
}

const TYPES: AppointmentType[] = ['initial', 'session', 'assessment', 'discharge'];
const STATUSES: AppointmentStatus[] = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];

export default function AddAppointmentScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { clients, fetchClients } = useClientsStore();
  const { addAppointment } = useAppointmentsStore();
  const profile = useAuthStore((state) => state.profile);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(route?.params?.clientId || null);
  const [date, setDate] = useState(route?.params?.defaultDate || '');
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState('45');
  const [type, setType] = useState<AppointmentType>('session');
  const [status, setStatus] = useState<AppointmentStatus>('scheduled');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSave = async () => {
    if (saving) return; // prevent duplicate submissions
    if (!selectedClientId) {
      Alert.alert(t('common.error'), t('appointments.clientRequired'));
      return;
    }

    if (!date || !startTime || !duration || Number(duration) <= 0) {
      Alert.alert(t('common.error'), t('appointments.fieldsRequired'));
      return;
    }

    setSaving(true);

    // Conflict detection: same day, overlapping time, same therapist or same patient
    const newStart = toMinutes(startTime);
    const newEnd = newStart + Number(duration);
    const { data: sameDay } = await supabase
      .from('appointments')
      .select('id, start_time, duration_minutes, assigned_to, client_id, status')
      .eq('date', date)
      .neq('status', 'cancelled');
    const conflict = (sameDay || []).find((a: any) => {
      const s = toMinutes(a.start_time);
      const e = s + (a.duration_minutes || 0);
      const overlaps = newStart < e && s < newEnd;
      const sameTherapist = a.assigned_to && a.assigned_to === profile?.id;
      const samePatient = a.client_id === selectedClientId;
      return overlaps && (sameTherapist || samePatient);
    });
    if (conflict) {
      setSaving(false);
      Alert.alert(t('appointments.conflictTitle'), t('appointments.conflictMessage'));
      return;
    }

    const { error } = await addAppointment({
      client_id: selectedClientId,
      assigned_to: profile?.id,
      date,
      start_time: startTime,
      duration_minutes: Number(duration),
      type,
      status,
      notes,
      created_by: profile?.id,
    });
    setSaving(false);

    if (!error) {
      Alert.alert(t('common.success'), t('appointments.saved'));
      navigation.goBack();
    } else if (error.includes('appointment_conflict')) {
      Alert.alert(t('appointments.conflictTitle'), t('appointments.conflictMessage'));
    } else {
      Alert.alert(t('common.error'), error);
    }
  };

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('appointments.addAppointment')}</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.saveBtnText}>{t('common.save')}</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>{t('appointments.selectClient')}</Text>
            {clients.length === 0 ? (
              <Text style={styles.helperText}>{t('appointments.noClientsAvailable')}</Text>
            ) : (
              clients.map((client) => {
                const isSelected = selectedClientId === client.id;
                return (
                  <TouchableOpacity
                    key={client.id}
                    style={[styles.clientChip, isSelected && styles.clientChipActive]}
                    onPress={() => setSelectedClientId(client.id)}
                  >
                    <Text style={[styles.clientChipText, isSelected && styles.clientChipTextActive]}>
                      {client.first_name} {client.last_name}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>{t('appointments.dateTime')}</Text>
            <DateTimeField mode="date" value={date} onChange={setDate} label={t('common.date')} />
            <DateTimeField mode="time" value={startTime} onChange={setStartTime} label={t('common.time')} />
            <Text style={styles.miniLabel}>{t('appointments.duration')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('appointments.duration')}
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>{t('appointments.selectType')}</Text>
            <View style={styles.chipRow}>
              {TYPES.map((item) => {
                const active = item === type;
                return (
                  <TouchableOpacity key={item} style={[styles.chip, active && styles.chipActive]} onPress={() => setType(item)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(`appointments.types.${item}`)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>{t('appointments.selectStatus')}</Text>
            <View style={styles.chipRow}>
              {STATUSES.map((item) => {
                const active = item === status;
                return (
                  <TouchableOpacity key={item} style={[styles.chip, active && styles.chipActive]} onPress={() => setStatus(item)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{t(`appointments.statuses.${item}`)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>{t('common.notes')}</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder={t('common.notes')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          <View style={{ height: TAB_BAR_CLEARANCE }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 70,
    alignItems: 'center',
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  scroll: { flex: 1, paddingHorizontal: Spacing.md },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    ...Shadow.sm,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  miniLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  helperText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  clientChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.inputBg,
  },
  clientChipActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  clientChipText: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  clientChipTextActive: {
    color: Colors.accent,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputSpacing: {
    marginTop: Spacing.sm,
  },
  multiline: {
    height: 110,
    paddingTop: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.inputBg,
  },
  chipActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  chipText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.accent,
  },
});
