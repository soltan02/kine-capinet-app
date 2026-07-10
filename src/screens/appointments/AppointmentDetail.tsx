import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Alert } from '../../lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles, TAB_BAR_CLEARANCE } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Appointment, AppointmentStatus, Profile } from '../../lib/supabase';
import { useAppointmentsStore, useAuthStore } from '../../lib/store';
import { usePermissions } from '../../lib/permissions';
import { fetchAssignableStaff } from '../../lib/staff';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import { getStatusColor } from '../../components/StatusBadge';
import StaffPicker from '../../components/StaffPicker';
import Button from '../../components/Button';

interface Props {
  navigation: any;
  route?: { params?: { appointment?: Appointment } };
}

const STATUSES: AppointmentStatus[] = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];

export default function AppointmentDetail({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { updateAppointment, deleteAppointment } = useAppointmentsStore();
  const { profile: myProfile } = useAuthStore();
  const { can, isAdmin, isTherapist } = usePermissions();
  const appointment = route?.params?.appointment;
  const [status, setStatus] = useState<AppointmentStatus>(appointment?.status || 'scheduled');
  const [assignedId, setAssignedId] = useState<string | null>(appointment?.assigned_to || null);
  const [assignedName, setAssignedName] = useState<string | null>(appointment?.profile?.full_name || null);
  const [staffList, setStaffList] = useState<Profile[]>([]);

  useEffect(() => {
    if (isAdmin) fetchAssignableStaff().then(setStaffList);
  }, [isAdmin]);

  const persistAssignment = async (staffId: string | null, name: string | null) => {
    if (!appointment?.id) return;
    const previousId = assignedId;
    const previousName = assignedName;
    setAssignedId(staffId);
    setAssignedName(name);
    const { error } = await updateAppointment(appointment.id, { assigned_to: staffId } as Partial<Appointment>);
    if (error) {
      setAssignedId(previousId);
      setAssignedName(previousName);
      Alert.alert(t('common.error'), error);
    }
  };

  const handleAssignSelf = () => persistAssignment(myProfile?.id || null, myProfile?.full_name || null);
  const handleUnassignSelf = () => persistAssignment(null, null);
  const handleAdminSelect = (staffId: string | null) => {
    const found = staffId ? staffList.find((s) => s.id === staffId) : null;
    persistAssignment(staffId, found?.full_name ?? null);
  };

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
      <ScreenHeader
        title={t('appointments.editAppointment')}
        onBack={() => navigation.goBack()}
        actions={can('appointments:manage') ? [{ icon: 'pencil-outline', onPress: () => navigation.navigate('AddAppointment', { appointment }), accessibilityLabel: t('common.edit') }] : []}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}>
        <View style={styles.card}>
          <Text style={styles.title}>{clientName}</Text>
          <Text style={styles.meta}>{appointment.date} · {appointment.start_time}</Text>
          <Text style={styles.meta}>{appointment.duration_minutes} min · {t(`appointments.types.${appointment.type}`)}</Text>
          {appointment.notes ? <Text style={styles.notes}>{appointment.notes}</Text> : null}
        </View>

        <View style={styles.card}>
          {isAdmin ? (
            <StaffPicker
              label={t('appointments.assignedTo')}
              staff={staffList}
              selectedStaffId={assignedId}
              onSelect={handleAdminSelect}
            />
          ) : (
            <>
              <Text style={styles.sectionLabel}>{t('appointments.assignedTo')}</Text>
              {isTherapist && !assignedId ? (
                <Button title={t('appointments.assignMe')} icon="person-add-outline" onPress={handleAssignSelf} />
              ) : isTherapist && assignedId === myProfile?.id ? (
                <Button title={t('appointments.unassignMe')} variant="secondary" icon="person-remove-outline" onPress={handleUnassignSelf} />
              ) : (
                <Text style={styles.meta}>{assignedName || t('appointments.unassigned')}</Text>
              )}
            </>
          )}
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
      </ScrollView>
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
