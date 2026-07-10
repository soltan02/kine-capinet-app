import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';
import { useSessionReminders } from '../hooks/useSessionReminders';

// Dashboard bell — shows how many of the current user's own assigned
// sessions are starting within the next hour (see useSessionReminders).
// In-app only: it detects while the app is open, it isn't an OS push
// notification that would arrive with the app closed.
export default function NotificationBell() {
  const { t } = useTranslation();
  const { isDesktop } = useResponsive();
  const reminders = useSessionReminders();
  const [open, setOpen] = useState(false);
  const hasReminders = reminders.length > 0;

  return (
    <>
      <TouchableOpacity
        style={[styles.bellBtn, Platform.OS === 'web' && ({ cursor: 'pointer' } as any)]}
        onPress={() => setOpen(true)}
        accessibilityLabel={t('dashboard.reminders')}
      >
        <Ionicons name={hasReminders ? 'notifications' : 'notifications-outline'} size={20} color={Colors.primary} />
        {hasReminders ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{reminders.length > 9 ? '9+' : reminders.length}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.panel, isDesktop && styles.panelDesktop]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>{t('dashboard.reminders')}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {reminders.length === 0 ? (
              <Text style={styles.emptyText}>{t('dashboard.noReminders')}</Text>
            ) : (
              reminders.map((r) => {
                const clientName = r.appointment.client
                  ? `${r.appointment.client.first_name} ${r.appointment.client.last_name}`
                  : t('common.patient');
                return (
                  <View key={r.appointment.id} style={styles.reminderRow}>
                    <View style={[styles.dot, r.urgent && styles.dotUrgent]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reminderName}>{clientName}</Text>
                      <Text style={styles.reminderTime}>
                        {t('dashboard.inMinutes', { count: Math.max(1, Math.round(r.minutesUntil)) })} · {r.appointment.start_time?.slice(0, 5)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 3,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.card,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.white,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'flex-end',
    padding: Spacing.md,
  },
  panel: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginTop: 60,
    ...Shadow.lg,
  },
  panelDesktop: {
    marginTop: 70,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  panelTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    paddingVertical: Spacing.md,
    textAlign: 'center',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.info,
  },
  dotUrgent: {
    backgroundColor: Colors.danger,
  },
  reminderName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  reminderTime: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
