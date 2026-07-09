import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Alert } from '../../lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Appointment, AppointmentStatus } from '../../lib/supabase';
import { useAppointmentsStore } from '../../lib/store';
import { usePermissions } from '../../lib/permissions';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import { getStatusColor } from '../../components/StatusBadge';

interface Props {
  navigation: any;
  route?: { params?: { appointment?: Appointment } };
}

const STATUSES: AppointmentStatus[] = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];

export default function AppointmentDetail({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { updateAppointment, deleteAppointment } = useAppointmentsStore();
  const { can } = usePermissions();
  const appointment = route?.params?.appointment;
  const [status, setStatus] = useState<AppointmentStatus>(appointment?.status || 'scheduled');

  const handleDelete = () => {
    if (!appointment?.id) return;
    Alert.alert(t('appointments.deleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteAppointment(appointment.id);
          if (error) { Alert.alert(t('common.error'), error); return; }
          navigation.goBack();
        },
      },
    ]);
  };

  const clientName = useMemo(() => {
    if (!appointment?.client) return t('common.patient');
    return `${appointment.client.first_name} ${appointment.client.last_name}`;
  }, [appointment, t]);

  const handleStatusChange = async (nextStatus: AppointmentStatus) => {
    if (!appointment?.id) return;
    const previousStatus = status;
    setStatus(nextStatus);
    const { error } = await updateAppointment(appointment.id, { status: nextStatus });
    if (error) {
      setStatus(previousStatus);
      Alert.alert(t('common.error'), error);
    }
  };

  if (!appointment) {
    return (
      <SafeAreaView style={CommonStyles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title={t('appointments.title')} onBack={() => navigation.goBack()} />
        <EmptyState icon="calendar-outline" message={t('appointments.noAppointmentToShow')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title={t('appointments.editAppointment')} onBack={() => navigation.goBack()} />

      <View style={styles.card}>
        <Text style={styles.title}>{clientName}</Text>
        <Text style={styles.meta}>{appointment.date} · {appointment.start_time}</Text>
        <Text style={styles.meta}>{appointment.duration_minutes} min · {t(`appointments.types.${appointment.type}`)}</Text>
        {appointment.notes ? <Text style={styles.notes}>{appointment.notes}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t('appointments.updateStatus')}</Text>
        <View style={styles.chipRow}>
          {STATUSES.map((item) => {
            const active = item === status;
            const color = getStatusColor(item);
            return (
              <TouchableOpacity
                key={item}
                style={[styles.chip, active && { borderColor: color, backgroundColor: color + '1A' }]}
                onPress={() => handleStatusChange(item)}
              >
                <Text style={[styles.chipText, active && { color }]}>{t(`appointments.statuses.${item}`)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {can('appointments:manage') ? (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
          <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          <Text style={styles.deleteBtnText}>{t('appointments.deleteAppointment')}</Text>
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dangerLight,
  },
  deleteBtnText: {
    color: Colors.danger,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    ...Shadow.sm,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  meta: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  notes: {
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.sm,
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
  chipText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
