import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Alert } from '../../lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles, TAB_BAR_CLEARANCE } from '../../constants/theme';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import { listBackups, createBackupNow, shareBackup, BackupSummary } from '../../lib/backup';
import Button from '../../components/Button';
import SectionLabel from '../../components/SectionLabel';

function formatDate(ts: string) {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()} ${hours}:${minutes}`;
}

export default function BackupsScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const [backups, setBackups] = useState<BackupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setBackups(await listBackups());
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || String(e));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleExportNow = async () => {
    setExporting(true);
    try {
      const id = await createBackupNow();
      await load();
      await shareBackup(id);
    } catch (e: any) {
      Alert.alert(t('common.error'), t('backups.exportFailed'));
    }
    setExporting(false);
  };

  const handleShare = async (id: string) => {
    setSharingId(id);
    try {
      await shareBackup(id);
    } catch (e: any) {
      Alert.alert(t('common.error'), t('backups.exportFailed'));
    }
    setSharingId(null);
  };

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <ScreenHeader title={t('backups.title')} onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Button
          title={t('backups.exportNow')}
          onPress={handleExportNow}
          loading={exporting}
          icon="cloud-download-outline"
        />

        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.noteText}>{t('backups.restoreNote')}</Text>
        </View>

        <SectionLabel style={{ marginTop: Spacing.lg }}>{t('backups.history')}</SectionLabel>

        {loading ? (
          <SkeletonList count={4} />
        ) : backups.length === 0 ? (
          <EmptyState icon="archive-outline" message={t('backups.noBackupsYet')} iconSize={48} />
        ) : (
          backups.map((b) => (
            <View key={b.id} style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name="document-text-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.rowDate}>{formatDate(b.created_at)}</Text>
              <TouchableOpacity onPress={() => handleShare(b.id)} disabled={sharingId === b.id} hitSlop={8}>
                {sharingId === b.id ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="share-outline" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={{ height: TAB_BAR_CLEARANCE }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
  },
  noteText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDate: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
