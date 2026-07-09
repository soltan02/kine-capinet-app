import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr, arDZ } from 'date-fns/locale';
import { SessionLog } from '../lib/supabase';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../constants/theme';
import i18n from '../lib/i18n';

const painColor = (v: number) => (v <= 3 ? Colors.success : v <= 6 ? Colors.warning : Colors.danger);

const CHART_HEIGHT = 84;

interface Props {
  sessions: SessionLog[]; // newest-first
  sessionsPrescribed?: number;
}

export default function ProgressTimeline({ sessions, sessionsPrescribed }: Props) {
  const { t } = useTranslation();
  const locale = i18n.language === 'ar' ? arDZ : fr;

  const chrono = [...sessions].sort(
    (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  );
  const completed = sessions.length;
  const prescribed = sessionsPrescribed || 0;
  const pct = prescribed > 0 ? Math.min(100, Math.round((completed / prescribed) * 100)) : 0;

  const withPain = chrono.filter((s) => s.pain_before != null && s.pain_after != null);
  const avgReduction = withPain.length
    ? withPain.reduce((sum, s) => sum + ((s.pain_before as number) - (s.pain_after as number)), 0) / withPain.length
    : 0;

  return (
    <View>
      {/* Summary stats */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {completed}
            {prescribed > 0 ? <Text style={styles.summaryValueMuted}>/{prescribed}</Text> : null}
          </Text>
          <Text style={styles.summaryLabel}>{t('progress.sessionsCompleted')}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: avgReduction > 0 ? Colors.success : Colors.textPrimary }]}>
            {avgReduction > 0 ? `−${avgReduction.toFixed(1)}` : '—'}
          </Text>
          <Text style={styles.summaryLabel}>{t('progress.avgPainReduction')}</Text>
        </View>
      </View>

      {/* Prescribed progress bar */}
      {prescribed > 0 ? (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>{t('progress.treatmentPlan')}</Text>
            <Text style={styles.progressPct}>{pct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
        </View>
      ) : null}

      {/* Pain trend chart */}
      {withPain.length > 0 ? (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t('progress.painTrend')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartRow}>
            {chrono.map((s, i) => {
              const before = s.pain_before ?? 0;
              const after = s.pain_after ?? 0;
              return (
                <View key={s.id} style={styles.chartCol}>
                  <View style={styles.chartTrack}>
                    <View
                      style={[
                        styles.chartBar,
                        { height: (before / 10) * CHART_HEIGHT, backgroundColor: painColor(before) + '55' },
                      ]}
                    />
                    <View
                      style={[
                        styles.chartAfter,
                        { bottom: (after / 10) * CHART_HEIGHT, backgroundColor: painColor(after) },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartLabel}>{i + 1}</Text>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: Colors.warning + '55' }]} />
              <Text style={styles.legendText}>{t('progress.painBefore')}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: Colors.success }]} />
              <Text style={styles.legendText}>{t('progress.painAfter')}</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Timeline */}
      <Text style={styles.timelineHeader}>{t('progress.history')}</Text>
      <View style={styles.timeline}>
        {sessions.map((s, idx) => {
          const before = s.pain_before;
          const after = s.pain_after;
          const isLast = idx === sessions.length - 1;
          return (
            <View key={s.id} style={styles.node}>
              <View style={styles.nodeRail}>
                <View style={styles.nodeDot} />
                {!isLast ? <View style={styles.nodeLine} /> : null}
              </View>
              <View style={styles.nodeCard}>
                <Text style={styles.nodeDate}>
                  {format(new Date(s.started_at), 'dd MMM yyyy', { locale })}
                </Text>
                {before != null || after != null ? (
                  <View style={styles.painPills}>
                    <View style={[styles.painPill, { backgroundColor: painColor(before ?? 0) + '22' }]}>
                      <Text style={[styles.painPillText, { color: painColor(before ?? 0) }]}>{before ?? '—'}/10</Text>
                    </View>
                    <Text style={styles.painArrow}>→</Text>
                    <View style={[styles.painPill, { backgroundColor: painColor(after ?? 0) + '22' }]}>
                      <Text style={[styles.painPillText, { color: painColor(after ?? 0) }]}>{after ?? '—'}/10</Text>
                    </View>
                  </View>
                ) : null}
                {s.treatment_details ? (
                  <Text style={styles.nodeNote} numberOfLines={2}>{s.treatment_details}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadow.sm,
  },
  summaryValue: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  summaryValueMuted: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textMuted },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2, textAlign: 'center' },
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  progressLabel: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },
  progressPct: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primary },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.borderLight, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  chartTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  chartRow: { alignItems: 'flex-end', gap: 10, paddingRight: Spacing.sm },
  chartCol: { alignItems: 'center', gap: 4 },
  chartTrack: {
    width: 16,
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  chartBar: { width: '100%', borderRadius: 4 },
  chartAfter: { position: 'absolute', left: 0, right: 0, height: 3, borderRadius: 2 },
  chartLabel: { fontSize: 10, color: Colors.textMuted },
  legendRow: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  timelineHeader: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  timeline: {},
  node: { flexDirection: 'row', gap: Spacing.md },
  nodeRail: { alignItems: 'center', width: 16 },
  nodeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    marginTop: 4,
  },
  nodeLine: { width: 2, flex: 1, backgroundColor: Colors.border, marginVertical: 2 },
  nodeCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  nodeDate: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  painPills: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  painPill: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  painPillText: { fontSize: FontSize.xs, fontWeight: '800' },
  painArrow: { color: Colors.textMuted, fontWeight: '700' },
  nodeNote: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm, lineHeight: 19 },
});
