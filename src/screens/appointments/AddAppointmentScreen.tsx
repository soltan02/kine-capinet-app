import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { Appointment, AppointmentStatus, AppointmentType, supabase } from '../../lib/supabase';
import { useAppointmentsStore, useAuthStore, useClientsStore } from '../../lib/store';
import DateTimeField from '../../components/DateTimeField';
import SectionLabel from '../../components/SectionLabel';
import SelectableChip from '../../components/SelectableChip';
import TextField from '../../components/TextField';
import PatientPicker from '../../components/PatientPicker';

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

interface Props {
  navigation: any;
  route?: { params?: { defaultDate?: string; clientId?: string; appointment?: Appointment } };
}

const TYPES: AppointmentType[] = ['initial', 'session', 'assessment', 'discharge'];
const STATUSES: AppointmentStatus[] = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];

export default function AddAppointmentScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { clients, fetchClients } = useClientsStore();
  const { addAppointment, updateAppointment } = useAppointmentsStore();
  const profile = useAuthStore((state) => state.profile);
  const editAppointment = route?.params?.appointment;
  const isEditing = !!editAppointment;
  const [selectedClientId, setSelectedClientId] = useState<string | null>(editAppointment?.client_id || route?.params?.clientId || null);
  const [date, setDate] = useState(editAppointment?.date || route?.params?.defaultDate || '');
  const [startTime, setStartTime] = useState(editAppointment?.start_time?.slice(0, 5) || '09:00');
  const [duration, setDuration] = useState(String(editAppointment?.duration_minutes || '45'));
  const [type, setType] = useState<AppointmentType>(editAppointment?.type || 'session');
  const [status, setStatus] = useState<AppointmentStatus>(editAppointment?.status || 'scheduled');
  const [notes, setNotes] = useState(editAppointment?.notes || '');
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
    // (excluding this appointment itself when editing)
    const newStart = toMinutes(startTime);
    const newEnd = newStart + Number(duration);
    let conflictQuery = supabase
      .from('appointments')
      .select('id, start_time, duration_minutes, assigned_to, client_id, status')
      .eq('date', date)
      .neq('status', 'cancelled');
    if (isEditing && editAppointment) {
      conflictQuery = conflictQuery.neq('id', editAppointment.id);
    }
    const { data: sameDay } = await conflictQuery;
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

    const payload = {
      client_id: selectedClientId,
      assigned_to: profile?.id,
      date,
      start_time: startTime,
      duration_minutes: Number(duration),
      type,
      status,
      notes,
    };

    const { error } = isEditing && editAppointment
      ? await updateAppointment(editAppointment.id, payload)
      : await addAppointment({ ...payload, created_by: profile?.id });
    setSaving(false);

    if (!error) {
      Alert.alert(t('common.success'), isEditing ? t('appointments.updated') : t('appointments.saved'));
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
        <Text style={styles.headerTitle}>{isEditing ? t('appointments.editAppointment') : t('appointments.addAppointment')}</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.saveBtnText}>{t('common.save')}</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionCard}>
            {clients.length === 0 ? (
              <>
                <SectionLabel>{t('appointments.selectClient')}</SectionLabel>
                <Text style={styles.helperText}>{t('appointments.noClientsAvailable')}</Text>
              </>
            ) : (
              <PatientPicker
                label={t('appointments.selectClient')}
                clients={clients}
                selectedClientId={selectedClientId}
                onSelect={setSelectedClientId}
              />
            )}
          </View>

          <View style={styles.sectionCard}>
            <SectionLabel>{t('appointments.dateTime')}</SectionLabel>
            <DateTimeField mode="date" value={date} onChange={setDate} label={t('common.date')} />
            <DateTimeField mode="time" value={startTime} onChange={setStartTime} label={t('common.time')} />
            <TextField
              label={t('appointments.duration')}
              placeholder={t('appointments.duration')}
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.sectionCard}>
            <SectionLabel>{t('appointments.selectType')}</SectionLabel>
            <View style={styles.chipRow}>
              {TYPES.map((item) => (
                <SelectableChip
                  key={item}
                  label={t(`appointments.types.${item}`)}
                  selected={item === type}
                  onPress={() => setType(item)}
                  color={Colors.accent}
                />
              ))}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <SectionLabel>{t('appointments.selectStatus')}</SectionLabel>
            <View style={styles.chipRow}>
              {STATUSES.map((item) => (
                <SelectableChip
                  key={item}
                  label={t(`appointments.statuses.${item}`)}
                  selected={item === status}
                  onPress={() => setStatus(item)}
                  color={Colors.accent}
                />
              ))}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <TextField
              label={t('common.notes')}
              placeholder={t('common.notes')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
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
  helperText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
