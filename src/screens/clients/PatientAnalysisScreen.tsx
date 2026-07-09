import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles } from '../../constants/theme';
import ScreenHeader from '../../components/ScreenHeader';
import { analyzePatient } from '../../lib/ai';

// Renders the model's lightly-formatted French text: **Heading** lines become
// section titles, bullet-ish lines get an accent, everything else is body text.
function renderAnalysis(text: string) {
  const blocks: React.ReactNode[] = [];
  const lines = text.split('\n');
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const headingMatch = line.match(/^\*\*(.+?)\*\*:?\s*(.*)$/);
    if (headingMatch) {
      blocks.push(
        <Text key={`h-${i}`} style={styles.sectionTitle}>{headingMatch[1].trim()}</Text>
      );
      if (headingMatch[2]) {
        blocks.push(<Text key={`hb-${i}`} style={styles.body}>{headingMatch[2].trim()}</Text>);
      }
      return;
    }
    const isBullet = /^[-•*]\s+/.test(line);
    const clean = line.replace(/^[-•*]\s+/, '').replace(/\*\*/g, '');
    blocks.push(
      <View key={`p-${i}`} style={isBullet ? styles.bulletRow : undefined}>
        {isBullet ? <Text style={styles.bulletDot}>•</Text> : null}
        <Text style={[styles.body, isBullet && { flex: 1 }]}>{clean}</Text>
      </View>
    );
  });
  return blocks;
}

export default function PatientAnalysisScreen({ navigation, route }: { navigation: any; route: any }) {
  const { t } = useTranslation();
  const clientId: string = route.params?.clientId;
  const clientName: string | undefined = route.params?.clientName;

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setErrorKey(null);
    setAnalysis(null);
    const { analysis: result, error } = await analyzePatient(clientId);
    if (error) setErrorKey(error);
    else setAnalysis(result || '');
    setLoading(false);
  }, [clientId]);

  useEffect(() => { run(); }, [run]);

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <ScreenHeader
        title={t('ai.title')}
        subtitle={clientName}
        onBack={() => navigation.goBack()}
        actions={!loading ? [{ icon: 'refresh', onPress: run, accessibilityLabel: t('ai.regenerate') }] : []}
      />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>{t('ai.analyzing')}</Text>
          </View>
        ) : errorKey ? (
          <View style={styles.center}>
            <Ionicons
              name={errorKey === 'ai.noData' ? 'information-circle-outline' : 'cloud-offline-outline'}
              size={48}
              color={Colors.textMuted}
            />
            <Text style={styles.errorText}>{t(errorKey)}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={run} activeOpacity={0.85}>
              <Ionicons name="refresh" size={18} color={Colors.white} />
              <Text style={styles.retryBtnText}>{t('ai.regenerate')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.card}>{renderAnalysis(analysis || '')}</View>
            <View style={styles.disclaimer}>
              <Ionicons name="shield-checkmark-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.disclaimerText}>{t('ai.disclaimer')}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  retryBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  body: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 2,
  },
  bulletDot: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    lineHeight: 21,
    fontWeight: '800',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
  },
  disclaimerText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 17,
  },
});
