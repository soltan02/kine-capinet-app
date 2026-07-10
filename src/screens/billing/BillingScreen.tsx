import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr, arDZ } from 'date-fns/locale';
import { supabase, Payment, PaymentMethod } from '../../lib/supabase';
import { Alert } from '../../lib/alert';
import { usePermissions } from '../../lib/permissions';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles, TAB_BAR_CLEARANCE } from '../../constants/theme';
import i18n from '../../lib/i18n';
import { buildInvoiceText } from '../../lib/invoice';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import { SkeletonList } from '../../components/Skeleton';
import SelectableChip from '../../components/SelectableChip';
import ResponsiveContainer from '../../components/ResponsiveContainer';
import { useResponsive } from '../../hooks/useResponsive';

const METHOD_ICONS: Record<PaymentMethod, string> = {
  cash: 'cash-outline',
  cnam: 'shield-checkmark-outline',
  card: 'card-outline',
  other: 'ellipsis-horizontal-outline',
};

const METHOD_COLORS: Record<PaymentMethod, string> = {
  cash: Colors.cash,
  cnam: Colors.cnam,
  card: Colors.cardPayment,
  other: Colors.other,
};

function SummaryCard({ label, amount, icon, color }: { label: string; amount: number; icon: string; color: string }) {
  return (
    <View style={[styles.summaryCard, { borderTopColor: color }]}>
      <View style={[styles.summaryIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.summaryAmount}>{amount.toFixed(3)}</Text>
      <Text style={styles.summaryLabel}>TND</Text>
      <Text style={styles.summarySubLabel}>{label}</Text>
    </View>
  );
}

export default function BillingScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const canManage = can('billing:manage');
  const canViewTotals = can('billing:viewTotals');
  const { isDesktop } = useResponsive();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterMethod, setFilterMethod] = useState<PaymentMethod | 'all'>('all');
  const locale = i18n.language === 'ar' ? arDZ : fr;

  useEffect(() => {
    loadPayments();
    const unsub = navigation.addListener('focus', () => loadPayments());
    return unsub;
  }, [navigation]);

  const deletePayment = (p: Payment) => {
    Alert.alert(t('billing.deletePaymentConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const { error: delErr } = await supabase.from('payments').delete().eq('id', p.id);
          if (delErr) { Alert.alert(t('common.error'), delErr.message); return; }
          loadPayments();
        },
      },
    ]);
  };

  const loadPayments = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('payments')
      .select('*, client:clients(id, first_name, last_name)')
      .order('paid_at', { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
    } else {
      setPayments((data as Payment[]) || []);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const now = new Date();
  const thisMonthPayments = payments.filter((p) => {
    const d = new Date(p.paid_at);
    return p.status === 'paid' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalRevenue = payments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
  const monthRevenue = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const cashTotal = payments.filter((p) => p.payment_method === 'cash' && p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
  const cnamTotal = payments.filter((p) => p.payment_method === 'cnam' && p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);

  const filtered = filterMethod === 'all' ? payments : payments.filter((p) => p.payment_method === filterMethod);

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <StatusBar barStyle={Colors.statusBarStyle} />
      <ScreenHeader
        title={t('billing.title')}
        subtitle={t('billing.paymentsRecorded', { count: payments.length })}
        onBack={() => navigation.navigate('Dashboard')}
        actions={[{ icon: 'add', onPress: () => navigation.navigate('AddPayment', {}), accessibilityLabel: t('billing.addPayment') }]}
      />

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
        {/* Summary Cards — revenue totals are admin-only. Desktop gets a
            static wrapping grid (every card visible at once, like a real
            dashboard); mobile keeps the horizontal swipe strip. */}
        {canViewTotals && (
          isDesktop ? (
            <View style={styles.summaryGrid}>
              <SummaryCard label={t('billing.totalRevenue')} amount={totalRevenue} icon="stats-chart" color={Colors.primary} />
              <SummaryCard label={t('billing.monthlyRevenue')} amount={monthRevenue} icon="calendar" color={Colors.success} />
              <SummaryCard label={t('billing.methods.cash')} amount={cashTotal} icon="cash-outline" color={Colors.cash} />
              <SummaryCard label={t('billing.methods.cnam')} amount={cnamTotal} icon="shield-checkmark-outline" color={Colors.cnam} />
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll}>
              <SummaryCard label={t('billing.totalRevenue')} amount={totalRevenue} icon="stats-chart" color={Colors.primary} />
              <SummaryCard label={t('billing.monthlyRevenue')} amount={monthRevenue} icon="calendar" color={Colors.success} />
              <SummaryCard label={t('billing.methods.cash')} amount={cashTotal} icon="cash-outline" color={Colors.cash} />
              <SummaryCard label={t('billing.methods.cnam')} amount={cnamTotal} icon="shield-checkmark-outline" color={Colors.cnam} />
            </ScrollView>
          )
        )}

        {/* Method filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {(['all', 'cash', 'cnam', 'other'] as const).map((method) => (
            <View key={method} style={{ marginRight: Spacing.sm }}>
              <SelectableChip
                label={method === 'all' ? t('common.all') : t(`billing.methods.${method}`)}
                selected={filterMethod === method}
                onPress={() => setFilterMethod(method)}
                icon={method !== 'all' ? (METHOD_ICONS[method] as any) : undefined}
                color={method !== 'all' ? METHOD_COLORS[method] : undefined}
              />
            </View>
          ))}
        </ScrollView>

        {/* Payment list */}
        <View style={styles.listContainer}>
          {loading ? (
            <SkeletonList count={5} padded={false} />
          ) : filtered.length === 0 ? (
            <EmptyState icon="cash-outline" message={t('billing.noBillingRecords')} iconSize={64} />
          ) : (
            filtered.map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                t={t}
                locale={locale}
                canManage={canManage}
                onEdit={() => navigation.navigate('AddPayment', { payment })}
                onDelete={() => deletePayment(payment)}
              />
            ))
          )}
        </View>
        <View style={{ height: TAB_BAR_CLEARANCE }} />
      </ScrollView>
      </ResponsiveContainer>
    </SafeAreaView>
  );
}

function PaymentRow({ payment, t, locale, canManage, onEdit, onDelete }: { payment: Payment; t: any; locale: any; canManage: boolean; onEdit: () => void; onDelete: () => void }) {
  const methodColor = METHOD_COLORS[payment.payment_method];
  const clientName = payment.client
    ? `${payment.client.first_name} ${payment.client.last_name}`
    : '—';
  const statusColor = payment.status === 'paid' ? Colors.success
    : payment.status === 'pending' ? Colors.warning
    : payment.status === 'partial' ? Colors.accent
    : Colors.textMuted;

  const handleExport = async () => {
    try {
      await Share.share({
        title: t('billing.invoice'),
        message: buildInvoiceText(payment, payment.client),
      });
    } catch {
      // Ignore share errors
    }
  };

  return (
    <View style={styles.paymentRow}>
      <View style={[styles.methodCircle, { backgroundColor: methodColor + '18' }]}>
        <Ionicons name={METHOD_ICONS[payment.payment_method] as any} size={20} color={methodColor} />
      </View>
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentClient}>{clientName}</Text>
        <View style={styles.paymentMeta}>
          <Text style={styles.paymentMethod}>{t(`billing.methods.${payment.payment_method}`)}</Text>
          {payment.cnam_reference && (
            <Text style={styles.paymentRef}> · {payment.cnam_reference}</Text>
          )}
          <Text style={styles.paymentMeta}>
            {' · '}{format(new Date(payment.paid_at), 'dd MMM yyyy', { locale })}
          </Text>
        </View>
        {payment.notes ? <Text style={styles.paymentNote} numberOfLines={2}>{payment.notes}</Text> : null}
      </View>
      <View style={styles.paymentRight}>
        <Text style={styles.paymentAmount}>{Number(payment.amount).toFixed(3)}</Text>
        <Text style={styles.paymentCurrency}>TND</Text>
        <View style={styles.rowActions}>
          <TouchableOpacity onPress={handleExport} hitSlop={6}>
            <Ionicons name="share-outline" size={17} color={Colors.primary} />
          </TouchableOpacity>
          {canManage ? (
            <>
              <TouchableOpacity onPress={onEdit} hitSlop={6}>
                <Ionicons name="pencil" size={16} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onDelete} hitSlop={6}>
                <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              </TouchableOpacity>
            </>
          ) : null}
        </View>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]}>
          <Text style={styles.statusDotText}>{t(`billing.statuses.${payment.status}`)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  errorBannerText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    flex: 1,
  },
  summaryScroll: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginRight: Spacing.md,
    width: 130,
    borderTopWidth: 4,
    ...Shadow.sm,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  summaryAmount: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  summarySubLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  filterRow: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    flexGrow: 0,
  },
  listContainer: {
    paddingHorizontal: Spacing.md,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  methodCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentClient: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  paymentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  paymentMethod: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  paymentNote: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  paymentRef: {
    fontSize: FontSize.xs,
    color: Colors.info,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: 4,
  },
  paymentAmount: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  paymentCurrency: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  statusDot: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  statusDotText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
});
