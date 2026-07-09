import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isYesterday, type Locale } from 'date-fns';
import { fr, arDZ } from 'date-fns/locale';
import { useAuditStore } from '../../lib/auditStore';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles, TAB_BAR_CLEARANCE } from '../../constants/theme';
import i18n from '../../lib/i18n';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import { AuditLog } from '../../lib/supabase';

function formatTime(ts: string) {
  const d = new Date(ts);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Categorizes an action string (e.g. "edit_payment", "add_session_note")
// into a visual type — used for both the icon and a readable fallback label.
function classifyAction(action: string): 'create' | 'update' | 'delete' | 'auth' | 'other' {
  if (action.startsWith('add_') || action.startsWith('create_')) return 'create';
  if (action.startsWith('edit_') || action.startsWith('update_') || action.includes('password')) return 'update';
  if (action.startsWith('delete_') || action.includes('delete')) return 'delete';
  if (action.includes('login') || action.includes('logout')) return 'auth';
  return 'other';
}

const ACTION_ICONS: Record<ReturnType<typeof classifyAction>, { icon: string; color: string }> = {
  create: { icon: 'add-circle-outline', color: Colors.success },
  update: { icon: 'create-outline', color: Colors.info },
  delete: { icon: 'trash-outline', color: Colors.danger },
  auth: { icon: 'log-in-outline', color: Colors.warning },
  other: { icon: 'ellipse-outline', color: Colors.textMuted },
};

function actionLabel(t: any, action: string): string {
  const key = `settings.auditActions.${action}`;
  const translated = t(key);
  if (translated !== key) return translated;
  // Fallback: prettify an unmapped action code (e.g. "some_new_action" → "Some new action")
  const words = action.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function groupByDay(logs: AuditLog[], t: any, locale: Locale) {
  const groups: { key: string; label: string; entries: AuditLog[] }[] = [];
  for (const log of logs) {
    const d = new Date(log.created_at);
    const key = format(d, 'yyyy-MM-dd');
    let group = groups.find((g) => g.key === key);
    if (!group) {
      const label = isToday(d) ? t('common.today') : isYesterday(d) ? t('common.yesterday') : format(d, 'dd MMMM yyyy', { locale });
      group = { key, label, entries: [] };
      groups.push(group);
    }
    group.entries.push(log);
  }
  return groups;
}

export default function AuditLogScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const { logs, loading, fetchLogs } = useAuditStore();
  const locale = i18n.language === 'ar' ? arDZ : fr;

  useEffect(() => {
    fetchLogs();
  }, []);

  const groups = useMemo(() => groupByDay(logs, t, locale), [logs, locale]);

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <ScreenHeader
        title={t('settings.auditLogs')}
        onBack={() => navigation.goBack()}
        actions={[{ icon: 'refresh-outline', onPress: () => fetchLogs(), accessibilityLabel: t('common.loading') }]}
      />

      {loading ? (
        <SkeletonList count={6} />
      ) : logs.length === 0 ? (
        <EmptyState icon="shield-outline" message={t('settings.noAuditLogs')} iconSize={48} />
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {groups.map((group) => (
            <View key={group.key} style={styles.dayGroup}>
              <View style={styles.dayHeaderRow}>
                <Text style={styles.dayHeaderText}>{group.label}</Text>
                <Text style={styles.dayHeaderCount}>{group.entries.length}</Text>
              </View>
              {group.entries.map((log) => {
                const category = classifyAction(log.action);
                const { icon, color } = ACTION_ICONS[category];
                return (
                  <View key={log.id} style={styles.logRow}>
                    <View style={[styles.logIcon, { backgroundColor: color + '18' }]}>
                      <Ionicons name={icon as any} size={18} color={color} />
                    </View>
                    <View style={styles.logInfo}>
                      <View style={styles.logTop}>
                        <Text style={styles.logUserName} numberOfLines={1}>
                          {log.user?.full_name || '—'}
                        </Text>
                        <Text style={styles.logTime}>{formatTime(log.created_at)}</Text>
                      </View>
                      <Text style={[styles.logAction, { color }]}>{actionLabel(t, log.action)}</Text>
                      {log.details && (
                        <Text style={styles.logDetails} numberOfLines={2}>
                          {log.details}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
          <View style={{ height: TAB_BAR_CLEARANCE }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.lg },
  dayGroup: {
    marginBottom: Spacing.md,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  dayHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dayHeaderCount: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    backgroundColor: Colors.inputBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  logRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  logIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logInfo: { flex: 1 },
  logTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  logUserName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  logTime: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  logAction: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  logDetails: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});