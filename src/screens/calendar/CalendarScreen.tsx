import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { format, startOfWeek, addDays, addWeeks, addMonths, isSameDay } from 'date-fns';
import { fr, arDZ } from 'date-fns/locale';
import { useAppointmentsStore } from '../../lib/store';
import { Appointment } from '../../lib/supabase';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles, TAB_BAR_CLEARANCE } from '../../constants/theme';
import i18n from '../../lib/i18n';
import ScreenHeader from '../../components/ScreenHeader';
import StatusBadge, { getStatusColor } from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import ResponsiveContainer from '../../components/ResponsiveContainer';
import { useHover } from '../../hooks/useHover';
import { useResponsive } from '../../hooks/useResponsive';

type ViewMode = 'day' | 'week' | 'month';
const MODES: ViewMode[] = ['day', 'week', 'month'];

const parseDay = (s: string) => new Date(s + 'T00:00:00');
const fmtKey = (d: Date) => format(d, 'yyyy-MM-dd');

export default function CalendarScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const { appointments, loading, error, fetchAppointments } = useAppointmentsStore();
  const { isDesktop } = useResponsive();
  const [selectedDate, setSelectedDate] = useState(fmtKey(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [refreshing, setRefreshing] = useState(false);
  const loadedMonthRef = useRef<string>('');
  const locale = i18n.language === 'ar' ? arDZ : fr;

  const ensureLoaded = (dateStr: string, force = false) => {
    const key = dateStr.slice(0, 7); // yyyy-MM
    if (!force && key === loadedMonthRef.current) return Promise.resolve({ error: null });
    loadedMonthRef.current = key;
    const d = parseDay(dateStr);
    const start = format(new Date(d.getFullYear(), d.getMonth() - 1, 1), 'yyyy-MM-dd');
    const end = format(new Date(d.getFullYear(), d.getMonth() + 2, 0), 'yyyy-MM-dd');
    return fetchAppointments(start, end);
  };

  useEffect(() => {
    ensureLoaded(selectedDate);
  }, [selectedDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await ensureLoaded(selectedDate, true);
    setRefreshing(false);
  };

  const apptsForDate = (dateStr: string) =>
    appointments
      .filter((a) => a.date === dateStr)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const datesWithAppts = new Set(appointments.map((a) => a.date));
  const dayAppointments = apptsForDate(selectedDate);

  // Month marked dots
  const markedDates: Record<string, any> = {};
  appointments.forEach((appt) => {
    const color = getStatusColor(appt.status);
    if (!markedDates[appt.date]) markedDates[appt.date] = { dots: [] };
    if (markedDates[appt.date].dots.length < 3) markedDates[appt.date].dots.push({ color });
  });
  if (markedDates[selectedDate]) {
    markedDates[selectedDate].selected = true;
    markedDates[selectedDate].selectedColor = Colors.primary;
  } else {
    markedDates[selectedDate] = { selected: true, selectedColor: Colors.primary };
  }

  const shiftDate = (dir: number) => {
    const d = parseDay(selectedDate);
    const next = viewMode === 'week' ? addWeeks(d, dir) : viewMode === 'month' ? addMonths(d, dir) : addDays(d, dir);
    setSelectedDate(fmtKey(next));
  };

  const weekStart = startOfWeek(parseDay(selectedDate), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const renderAppointmentList = () => {
    if (loading) return <SkeletonList count={4} padded={false} />;
    if (dayAppointments.length === 0) {
      return (
        <EmptyState
          icon="calendar-outline"
          message={t('appointments.noAppointments')}
          iconSize={48}
          variant="card"
          action={{ label: t('appointments.addAppointment'), onPress: () => navigation.navigate('AddAppointment', { defaultDate: selectedDate }) }}
        />
      );
    }
    return dayAppointments.map((appt) => (
      <AppointmentTimeSlot
        key={appt.id}
        appointment={appt}
        onPress={() => navigation.navigate('AppointmentDetail', { appointment: appt })}
        t={t}
      />
    ));
  };

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <StatusBar barStyle={Colors.statusBarStyle} />

      <ScreenHeader
        title={t('appointments.title')}
        onBack={() => navigation.navigate('Dashboard')}
        actions={[{ icon: 'add', onPress: () => navigation.navigate('AddAppointment', {}), accessibilityLabel: t('appointments.addAppointment') }]}
      />

      {/* View mode segmented control */}
      <View style={styles.segment}>
        {MODES.map((mode) => {
          const active = viewMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              onPress={() => setViewMode(mode)}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {t(`appointments.view_${mode}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      <ResponsiveContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {(() => {
          const navSection = (
            <>
              {viewMode === 'month' && (
                <View style={styles.calendarWrap}>
                  <Calendar
                    current={selectedDate}
                    key={selectedDate.slice(0, 7)}
                    onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
                    markedDates={markedDates}
                    markingType="multi-dot"
                    theme={{
                      calendarBackground: Colors.card,
                      selectedDayBackgroundColor: Colors.primary,
                      selectedDayTextColor: Colors.white,
                      todayTextColor: Colors.primary,
                      dayTextColor: Colors.textPrimary,
                      textDisabledColor: Colors.textMuted,
                      monthTextColor: Colors.textPrimary,
                      arrowColor: Colors.primary,
                      dotColor: Colors.primary,
                      textMonthFontWeight: '700',
                      textDayFontSize: FontSize.sm,
                      textMonthFontSize: FontSize.lg,
                    }}
                  />
                </View>
              )}

              {viewMode === 'week' && (
                <View style={styles.weekWrap}>
                  <View style={styles.navRow}>
                    <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.navBtn}>
                      <Ionicons name="chevron-back" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.navLabel}>{format(weekStart, 'MMMM yyyy', { locale })}</Text>
                    <TouchableOpacity onPress={() => shiftDate(1)} style={styles.navBtn}>
                      <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.weekStrip, isDesktop && styles.weekStripDesktop]}>
                    {weekDays.map((d) => {
                      const key = fmtKey(d);
                      const isSelected = key === selectedDate;
                      const isToday = isSameDay(d, new Date());
                      const has = datesWithAppts.has(key);
                      return (
                        <TouchableOpacity key={key} style={styles.weekCell} onPress={() => setSelectedDate(key)} activeOpacity={0.8}>
                          <Text style={[styles.weekDow, isSelected && styles.weekDowSelected]}>
                            {format(d, 'EEEEEE', { locale })}
                          </Text>
                          <View style={[styles.weekNum, isSelected && styles.weekNumSelected, !isSelected && isToday && styles.weekNumToday]}>
                            <Text style={[styles.weekNumText, isSelected && styles.weekNumTextSelected, !isSelected && isToday && styles.weekNumTextToday]}>
                              {format(d, 'd')}
                            </Text>
                          </View>
                          <View style={[styles.weekDot, has && !isSelected && styles.weekDotOn]} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {viewMode === 'day' && (
                <View style={styles.navRow}>
                  <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.navBtn}>
                    <Ionicons name="chevron-back" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.navLabelDay}>{format(parseDay(selectedDate), 'EEEE dd MMMM', { locale })}</Text>
                  <TouchableOpacity onPress={() => shiftDate(1)} style={styles.navBtn}>
                    <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </>
          );

          const listSection = (
            <>
              {/* Selected day header (month + week modes) */}
              {viewMode !== 'day' && (
                <View style={styles.dayHeader}>
                  <Text style={styles.dayTitle}>
                    {format(parseDay(selectedDate), 'EEEE dd MMMM', { locale })}
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{dayAppointments.length}</Text>
                  </View>
                </View>
              )}
              <View style={styles.apptList}>{renderAppointmentList()}</View>
            </>
          );

          if (!isDesktop) {
            return (
              <>
                {navSection}
                {listSection}
              </>
            );
          }

          // Desktop: the calendar/week/day navigator becomes a fixed-width
          // left column, appointments for the selected day sit in a wide
          // scrollable right column — a real calendar-app layout instead
          // of everything stacked full-width down the page.
          return (
            <View style={styles.desktopGrid}>
              <View style={styles.desktopNavCol}>{navSection}</View>
              <View style={styles.desktopListCol}>{listSection}</View>
            </View>
          );
        })()}
        <View style={{ height: TAB_BAR_CLEARANCE }} />
      </ScrollView>
      </ResponsiveContainer>
    </SafeAreaView>
  );
}

function AppointmentTimeSlot({ appointment, onPress, t }: { appointment: Appointment; onPress: () => void; t: any }) {
  const statusColor = getStatusColor(appointment.status);
  const clientName = appointment.client
    ? `${appointment.client.first_name} ${appointment.client.last_name}`
    : '—';
  const { hovered, hoverProps } = useHover();

  return (
    <TouchableOpacity
      style={[styles.timeSlot, Platform.OS === 'web' && ({ cursor: 'pointer' } as any)]}
      onPress={onPress}
      activeOpacity={0.85}
      {...hoverProps}
    >
      <View style={styles.timeColumn}>
        <Text style={styles.startTime}>{appointment.start_time?.slice(0, 5)}</Text>
        <View style={styles.timeLine} />
        <Text style={styles.endTime}>{getEndTime(appointment.start_time, appointment.duration_minutes)}</Text>
      </View>
      <View style={[styles.apptCard, { borderLeftColor: statusColor }, hovered && styles.apptCardHovered]}>
        <View style={CommonStyles.rowBetween}>
          <Text style={styles.apptClientName}>{clientName}</Text>
          <StatusBadge status={appointment.status} label={t(`appointments.statuses.${appointment.status}`)} size="sm" />
        </View>
        <Text style={styles.apptType}>{t(`appointments.types.${appointment.type}`)}</Text>
        <View style={styles.apptMeta}>
          <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.apptMetaText}>{appointment.duration_minutes} min</Text>
          {!!appointment.notes && (
            <>
              <Text style={styles.apptMetaDot}>·</Text>
              <Ionicons name="document-text-outline" size={12} color={Colors.textMuted} />
            </>
          )}
        </View>
        <View style={styles.assigneeRow}>
          <Ionicons
            name={appointment.profile ? 'person-circle-outline' : 'person-outline'}
            size={12}
            color={appointment.profile ? Colors.accent : Colors.textMuted}
          />
          <Text style={[styles.assigneeText, !appointment.profile && styles.assigneeTextMuted]}>
            {appointment.profile?.full_name || t('appointments.unassigned')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const endMinutes = h * 60 + m + durationMinutes;
  return `${String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    padding: 3,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Colors.card,
    ...Shadow.sm,
  },
  segmentText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  segmentTextActive: {
    color: Colors.primary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.dangerLight,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  errorBannerText: { color: Colors.danger, fontSize: FontSize.sm, flex: 1 },
  desktopGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.lg,
  },
  desktopNavCol: { width: 360 },
  desktopListCol: { flex: 1, minWidth: 0 },
  weekStripDesktop: { flexWrap: 'wrap' },
  calendarWrap: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadow.md,
  },
  weekWrap: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.sm,
    ...Shadow.md,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  navLabelDay: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  weekDow: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  weekDowSelected: { color: Colors.primary },
  weekNum: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNumSelected: { backgroundColor: Colors.primary },
  weekNumToday: { borderWidth: 1.5, borderColor: Colors.primary },
  weekNumText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  weekNumTextSelected: { color: Colors.white },
  weekNumTextToday: { color: Colors.primary },
  weekDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' },
  weekDotOn: { backgroundColor: Colors.accent },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  dayTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  countBadge: {
    backgroundColor: Colors.accentLight,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.accent },
  apptList: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
  timeSlot: { flexDirection: 'row', marginBottom: Spacing.sm, gap: Spacing.sm },
  timeColumn: { width: 50, alignItems: 'center', paddingTop: 4 },
  startTime: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary },
  timeLine: { width: 2, flex: 1, backgroundColor: Colors.border, marginVertical: 4, borderRadius: 1 },
  endTime: { fontSize: FontSize.xs, color: Colors.textMuted },
  apptCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    borderLeftWidth: 4,
    ...Shadow.sm,
  },
  apptCardHovered: {
    backgroundColor: Colors.inputBg,
  },
  apptClientName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  apptType: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 3 },
  apptMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  apptMetaText: { fontSize: FontSize.xs, color: Colors.textMuted },
  apptMetaDot: { color: Colors.textMuted },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  assigneeText: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: '600' },
  assigneeTextMuted: { color: Colors.textMuted, fontWeight: '500' },
});
