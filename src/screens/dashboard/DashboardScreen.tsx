import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, isToday } from 'date-fns';
import { fr, arDZ } from 'date-fns/locale';
import { useAuthStore, useClientsStore, useAppointmentsStore } from '../../lib/store';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles, TAB_BAR_CLEARANCE } from '../../constants/theme';
import { Appointment } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import i18n from '../../lib/i18n';
import StatusBadge, { getStatusColor } from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import { usePermissions } from '../../lib/permissions';
import { isChecklistDismissed, dismissChecklist } from '../../lib/onboarding';
import ResponsiveContainer from '../../components/ResponsiveContainer';
import NotificationBell from '../../components/NotificationBell';
import { useResponsive } from '../../hooks/useResponsive';

function getGreeting(t: any) {
  const hour = new Date().getHours();
  if (hour < 12) return t('dashboard.greeting_morning');
  if (hour < 18) return t('dashboard.greeting_afternoon');
  return t('dashboard.greeting_evening');
}

function AppointmentCard({ appointment, onPress }: { appointment: Appointment; onPress: () => void }) {
  const { t } = useTranslation();
  const clientName = appointment.client
    ? `${appointment.client.first_name} ${appointment.client.last_name}`
    : '—';

  return (
    <TouchableOpacity style={styles.appointmentCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.apptTimeBar, { backgroundColor: getStatusColor(appointment.status) }]} />
      <View style={styles.apptContent}>
        <View style={CommonStyles.rowBetween}>
          <Text style={styles.apptTime}>{appointment.start_time?.slice(0, 5)}</Text>
          <StatusBadge status={appointment.status} label={t(`appointments.statuses.${appointment.status}`)} size="sm" />
        </View>
        <Text style={styles.apptClientName}>{clientName}</Text>
        <Text style={styles.apptType}>
          {t(`appointments.types.${appointment.type}`)} · {appointment.duration_minutes} min
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Hero tile — the day's headline number gets a gradient tile of its own;
// the rest become smaller supporting tiles below (StatTile).
function HeroStat({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <LinearGradient
      colors={[Colors.primary, Colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroStat}
    >
      <View>
        <Text style={styles.heroStatValue}>{value}</Text>
        <Text style={styles.heroStatLabel}>{label}</Text>
      </View>
      <View style={styles.heroStatIcon}>
        <Ionicons name={icon as any} size={20} color={Colors.white} />
      </View>
    </LinearGradient>
  );
}

function StatTile({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <View style={styles.statTile}>
      <View style={styles.statTileTop}>
        <View style={[styles.statTileIcon, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon as any} size={14} color={color} />
        </View>
        <Text style={styles.statTileLabel}>{label}</Text>
      </View>
      <Text style={styles.statTileValue}>{value}</Text>
    </View>
  );
}

export default function DashboardScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const { clients, fetchClients } = useClientsStore();
  const { appointments, fetchAppointments } = useAppointmentsStore();
  const { can } = usePermissions();
  const { isDesktop } = useResponsive();
  const [refreshing, setRefreshing] = React.useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [auditCount, setAuditCount] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [staffCount, setStaffCount] = useState<number | null>(null);
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayAppointments = appointments.filter((a) => a.date === todayStr);

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (profile?.role === 'admin' && profile.id) {
      isChecklistDismissed(profile.id).then(setChecklistDismissed);
    }
  }, [profile?.id]);

  const loadData = async () => {
    const weekAgo = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    const nextMonth = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    await Promise.all([fetchClients(), fetchAppointments(weekAgo, nextMonth)]);
    const { data } = await supabase
      .from('audit_logs')
      .select('id')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });
    setAuditCount((data || []).length);

    const { data: paymentsData } = await supabase
      .from('payments')
      .select('amount, status, paid_at')
      .eq('status', 'paid')
      .gte('paid_at', startOfMonth.toISOString());
    setMonthRevenue((paymentsData || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0));

    if (profile?.role === 'admin') {
      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
      setStaffCount(count ?? null);
    }
    setInitialLoading(false);
  };

  const handleDismissChecklist = () => {
    if (profile?.id) dismissChecklist(profile.id);
    setChecklistDismissed(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const thisWeekSessions = appointments.filter(
    (a) => a.status === 'completed' &&
      new Date(a.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  const thisMonthSessions = appointments.filter(
    (a) => {
      const d = new Date(a.date);
      const now = new Date();
      return a.status === 'completed' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
  ).length;
  const activeTreatmentCount = appointments.filter((a) => a.status === 'confirmed' || a.status === 'completed').length;
  const cancellationRate = appointments.length === 0 ? 0 : Math.round((appointments.filter((a) => a.status === 'cancelled').length / appointments.length) * 100);

  const checklistItems = [
    { done: (staffCount ?? 0) > 1, label: t('dashboard.checklist.addStaff'), onPress: () => navigation.navigate('Settings', { screen: 'UserManagement' }) },
    { done: clients.length > 0, label: t('dashboard.checklist.addPatient'), onPress: () => navigation.navigate('AddClient') },
    { done: appointments.length > 0, label: t('dashboard.checklist.addAppointment'), onPress: () => navigation.navigate('Calendar') },
  ];
  const showChecklist = profile?.role === 'admin' && !checklistDismissed && staffCount !== null && checklistItems.some((i) => !i.done);

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <StatusBar barStyle={Colors.statusBarStyle} backgroundColor={Colors.background} />
      <ResponsiveContainer>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting(t)},</Text>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{profile?.full_name?.split(' ')[0] || t('dashboard.doctorFallback')}</Text>
              {profile?.role ? (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{t(`settings.roles.${profile.role}`)}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.headerActions}>
            <NotificationBell />
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date pill */}
        <View style={styles.datePill}>
          <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
          <Text style={styles.dateText}>
            {format(new Date(), 'EEEE dd MMMM yyyy', { locale: i18n.language === 'ar' ? arDZ : fr })}
          </Text>
        </View>

        {(() => {
          const checklistSection = showChecklist ? (
            <View style={styles.checklistCard}>
              <View style={CommonStyles.rowBetween}>
                <Text style={styles.checklistTitle}>{t('dashboard.checklist.title')}</Text>
                <TouchableOpacity onPress={handleDismissChecklist} hitSlop={8}>
                  <Ionicons name="close" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              {checklistItems.map((item, i) => (
                <TouchableOpacity key={i} style={styles.checklistRow} onPress={item.onPress} activeOpacity={0.7}>
                  <Ionicons
                    name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={item.done ? Colors.success : Colors.textMuted}
                  />
                  <Text style={[styles.checklistLabel, item.done && styles.checklistLabelDone]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null;

          const statsSection = (
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={[CommonStyles.sectionTitle, styles.sectionMargin]}>
                {t('dashboard.quickStats')}
              </Text>
              <HeroStat icon="calendar" label={t('dashboard.todayAppointments')} value={todayAppointments.length} />
              <View style={styles.statsGrid}>
                <StatTile icon="people" label={t('dashboard.totalClients')} value={clients.length} color={Colors.primary} />
                <StatTile icon="checkmark-circle" label={t('dashboard.thisWeek')} value={`${thisWeekSessions} ${t('dashboard.sessions')}`} color={Colors.success} />
                {can('billing:viewTotals') && (
                  <StatTile icon="cash" label={t('dashboard.monthRevenue')} value={`${monthRevenue.toFixed(0)} TND`} color={Colors.secondary} />
                )}
                <StatTile icon="stats-chart" label={t('dashboard.thisMonth')} value={`${thisMonthSessions} ${t('dashboard.sessions')}`} color={Colors.info} />
              </View>
            </Animated.View>
          );

          const quickActionsSection = (
            <>
              <Text style={[CommonStyles.sectionTitle, styles.sectionMargin]}>{t('dashboard.quickAdd')}</Text>
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.quickAction}
                  onPress={() => navigation.navigate('AddClient')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.quickIcon, { backgroundColor: Colors.primaryLight }]}>
                    <Ionicons name="person-add-outline" size={24} color={Colors.primary} />
                  </View>
                  <Text style={styles.quickActionLabel}>{t('dashboard.newClient')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickAction}
                  onPress={() => navigation.navigate('Calendar')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.quickIcon, { backgroundColor: Colors.accentLight }]}>
                    <Ionicons name="calendar-outline" size={24} color={Colors.accent} />
                  </View>
                  <Text style={styles.quickActionLabel}>{t('dashboard.newAppointment')}</Text>
                </TouchableOpacity>
              </View>
            </>
          );

          const operationsSection = profile?.role === 'admin' ? (
            <View style={styles.operationsCard}>
              <Text style={styles.operationsTitle}>{t('dashboard.clinicalOverview')}</Text>
              <View style={styles.operationsGrid}>
                <View style={styles.operationPill}>
                  <Ionicons name="people-outline" size={18} color={Colors.primary} />
                  <Text style={styles.operationText}>{t('dashboard.activePatients', { count: activeTreatmentCount })}</Text>
                </View>
                <View style={styles.operationPill}>
                  <Ionicons name="alert-circle-outline" size={18} color={Colors.warning} />
                  <Text style={styles.operationText}>{t('dashboard.cancellationRate', { rate: cancellationRate })}</Text>
                </View>
                <View style={styles.operationPill}>
                  <Ionicons name="shield-outline" size={18} color={Colors.info} />
                  <Text style={styles.operationText}>{t('dashboard.actionsToday', { count: auditCount })}</Text>
                </View>
              </View>
            </View>
          ) : null;

          const scheduleSection = (
            <>
              <Text style={[CommonStyles.sectionTitle, styles.sectionMargin]}>
                {t('dashboard.todayAppointments')}
              </Text>
              {initialLoading ? (
                <SkeletonList count={3} padded={false} />
              ) : todayAppointments.length === 0 ? (
                <EmptyState icon="calendar-outline" message={t('dashboard.noAppointmentsToday')} iconSize={40} variant="card" />
              ) : (
                todayAppointments.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    onPress={() => navigation.navigate('AppointmentDetail', { appointment: appt })}
                  />
                ))
              )}
            </>
          );

          if (!isDesktop) {
            return (
              <>
                {checklistSection}
                {statsSection}
                {quickActionsSection}
                {operationsSection}
                {scheduleSection}
              </>
            );
          }

          // Desktop: stats/quick actions/operations form the main column,
          // today's schedule becomes a persistent side column instead of
          // just another stacked section — reads as a dashboard, not a
          // scrolled phone screen.
          return (
            <View style={styles.desktopGrid}>
              <View style={styles.desktopMain}>
                {checklistSection}
                {statsSection}
                {quickActionsSection}
                {operationsSection}
              </View>
              <View style={styles.desktopSide}>{scheduleSection}</View>
            </View>
          );
        })()}

        <View style={{ height: TAB_BAR_CLEARANCE }} />
      </ScrollView>
      </ResponsiveContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, paddingHorizontal: Spacing.md },
  desktopGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.lg,
  },
  desktopMain: { flex: 2, minWidth: 0 },
  desktopSide: { flex: 1, minWidth: 320 },
  checklistCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    ...Shadow.sm,
  },
  checklistTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  checklistLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  checklistLabelDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  greeting: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  userName: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  roleBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.accentLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
  },
  dateText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sectionMargin: { marginTop: Spacing.lg, marginBottom: Spacing.md },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadow.md,
  },
  heroStatValue: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  heroStatLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  heroStatIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statTile: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexBasis: '46%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  statTileIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTileLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    flexShrink: 1,
  },
  statTileValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  quickAction: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadow.md,
  },
  apptTimeBar: {
    width: 5,
  },
  apptContent: {
    flex: 1,
    padding: Spacing.sm,
  },
  apptTime: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  apptClientName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  apptType: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  operationsCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    ...Shadow.sm,
  },
  operationsTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  operationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  operationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.inputBg,
  },
  operationText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
