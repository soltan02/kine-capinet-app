import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuditStore } from '../../lib/auditStore';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles, TAB_BAR_CLEARANCE } from '../../constants/theme';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}`;
}

function ActionIcon({ action }: { action: string }) {
  if (action.includes('create') || action.includes('add')) {
    return <Ionicons name="add-circle-outline" size={18} color={Colors.success} />;
  }
  if (action.includes('update') || action.includes('edit')) {
    return <Ionicons name="create-outline" size={18} color={Colors.info} />;
  }
  if (action.includes('delete')) {
    return <Ionicons name="trash-outline" size={18} color={Colors.danger} />;
  }
  if (action.includes('login') || action.includes('logout')) {
    return <Ionicons name="log-in-outline" size={18} color={Colors.warning} />;
  }
  return <Ionicons name="ellipse-outline" size={18} color={Colors.textMuted} />;
}

export default function AuditLogScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const { logs, loading, fetchLogs } = useAuditStore();

  useEffect(() => {
    fetchLogs();
  }, []);

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
          {logs.map((log) => (
            <View key={log.id} style={styles.logRow}>
              <View style={styles.logIcon}>
                <ActionIcon action={log.action} />
              </View>
              <View style={styles.logInfo}>
                <View style={styles.logTop}>
                  <Text style={styles.logUserName} numberOfLines={1}>
                    {log.user?.full_name || '—'}
                  </Text>
                  <Text style={styles.logTime}>{formatTimestamp(log.created_at)}</Text>
                </View>
                <Text style={styles.logAction}>{log.action}</Text>
                {log.details && (
                  <Text style={styles.logDetails} numberOfLines={2}>
                    {log.details}
                  </Text>
                )}
              </View>
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