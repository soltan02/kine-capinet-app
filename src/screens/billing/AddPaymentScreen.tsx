import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { supabase, PaymentMethod, PaymentStatus, Payment } from '../../lib/supabase';
import { useAuthStore, useClientsStore } from '../../lib/store';
import { usePermissions } from '../../lib/permissions';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles, TAB_BAR_CLEARANCE } from '../../constants/theme';
import SectionLabel from '../../components/SectionLabel';
import SelectableChip from '../../components/SelectableChip';
import TextField from '../../components/TextField';
import PatientPicker from '../../components/PatientPicker';

interface Props {
  navigation: any;
  route?: { params?: { clientId?: string; appointmentId?: string; payment?: Payment } };
}

// 'card' intentionally not offered — clinics reported almost nobody pays by
// card; the 'card' value stays supported in the type/DB for any past records.
const METHODS: { key: PaymentMethod; icon: string; color: string }[] = [
  { key: 'cash', icon: 'cash-outline', color: Colors.cash },
  { key: 'cnam', icon: 'shield-checkmark-outline', color: Colors.cnam },
  { key: 'other', icon: 'ellipsis-horizontal-outline', color: Colors.other },
];

const STATUSES: PaymentStatus[] = ['paid', 'pending', 'partial', 'waived'];

export default function AddPaymentScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const { clients, fetchClients } = useClientsStore();
  const { can } = usePermissions();
  const editPayment = route?.params?.payment;
  const isEditing = !!editPayment;
  const [amount, setAmount] = useState(editPayment ? String(editPayment.amount) : '');
  const [method, setMethod] = useState<PaymentMethod>(editPayment?.payment_method || 'cash');
  const [status, setStatus] = useState<PaymentStatus>(editPayment?.status || 'paid');
  const [cnamRef, setCnamRef] = useState(editPayment?.cnam_reference || '');
  const [notes, setNotes] = useState(editPayment?.notes || '');
  const [packageName, setPackageName] = useState('');
  const [packageSessions, setPackageSessions] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    route?.params?.clientId ?? editPayment?.client_id ?? null
  );
  const appointmentId = route?.params?.appointmentId ?? editPayment?.appointment_id;
  // Only show the picker when no patient was already implied by how this
  // screen was opened (e.g. from the top-level Billing tab's "+" button).
  const needsClientPicker = !route?.params?.clientId && !editPayment;

  useEffect(() => {
    if (needsClientPicker) fetchClients();
  }, [needsClientPicker]);

  const handleSave = async () => {
    if (loading) return;
    if (!can('billing:manage')) {
      Alert.alert(t('common.error'), t('billing.unauthorized'));
      navigation.goBack();
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert(t('common.error'), t('billing.invalidAmount'));
      return;
    }
    if (!selectedClientId) {
      Alert.alert(t('common.error'), t('billing.clientRequired'));
      return;
    }
    setLoading(true);
    const paymentNotes = [
      notes,
      packageName ? `${t('billing.packageSection')}: ${packageName}` : null,
      packageSessions ? `${t('billing.packageSessionsLabel')}: ${packageSessions}` : null,
    ].filter(Boolean).join('\n');

    const { error } = isEditing
      ? await supabase.from('payments').update({
          amount: Number(amount),
          payment_method: method,
          status,
          cnam_reference: method === 'cnam' ? cnamRef : null,
          notes: paymentNotes || null,
        }).eq('id', editPayment.id)
      : await supabase.from('payments').insert([{
          client_id: selectedClientId,
          appointment_id: appointmentId || null,
          amount: Number(amount),
          payment_method: method,
          status,
          cnam_reference: method === 'cnam' ? cnamRef : null,
          notes: paymentNotes || null,
          paid_at: new Date().toISOString(),
          created_by: profile?.id,
        }]);

    await supabase.from('audit_logs').insert([{
      user_id: profile?.id,
      action: isEditing ? 'edit_payment' : 'add_payment',
      details: t('billing.paymentLog', { amount: Number(amount).toFixed(3), clientId: selectedClientId }),
    }]);
    setLoading(false);
    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      Alert.alert(t('common.success'), isEditing ? t('billing.paymentUpdated') : t('billing.paymentSaved'));
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? t('billing.editPayment') : t('billing.addPayment')}</Text>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.saveBtnText}>{t('common.save')}</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Patient (only when not already implied by how this screen was opened) */}
          {needsClientPicker && (
            <View style={styles.sectionCard}>
              {clients.length === 0 ? (
                <>
                  <SectionLabel>{t('billing.selectClient')}</SectionLabel>
                  <Text style={styles.helperText}>{t('appointments.noClientsAvailable')}</Text>
                </>
              ) : (
                <PatientPicker
                  label={t('billing.selectClient')}
                  clients={clients}
                  selectedClientId={selectedClientId}
                  onSelect={setSelectedClientId}
                />
              )}
            </View>
          )}

          {/* Amount */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>{t('billing.amount')}</Text>
            <View style={styles.amountRow}>
              <TextInput
                style={styles.amountInput}
                placeholder="0.000"
                placeholderTextColor={Colors.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
              <Text style={styles.currency}>TND</Text>
            </View>
          </View>

          {/* Payment method */}
          <View style={styles.sectionCard}>
            <SectionLabel>{t('billing.paymentMethod')}</SectionLabel>
            <View style={styles.methodGrid}>
              {METHODS.map(({ key, icon, color }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.methodBtn, method === key && { borderColor: color, backgroundColor: color + '12' }]}
                  onPress={() => setMethod(key)}
                >
                  <Ionicons name={icon as any} size={24} color={method === key ? color : Colors.textMuted} />
                  <Text style={[styles.methodLabel, method === key && { color }]}>
                    {t(`billing.methods.${key}`)}
                  </Text>
                  {method === key && (
                    <View style={[styles.selectedDot, { backgroundColor: color }]} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* CNAM reference */}
            {method === 'cnam' && (
              <View style={{ marginTop: Spacing.md }}>
                <TextField
                  label={t('billing.cnamReference')}
                  placeholder={t('billing.cnamRefPlaceholder')}
                  value={cnamRef}
                  onChangeText={setCnamRef}
                />
              </View>
            )}
          </View>

          {/* Status */}
          <View style={styles.sectionCard}>
            <SectionLabel>{t('billing.paymentStatus')}</SectionLabel>
            <View style={styles.statusRow}>
              {STATUSES.map((s) => {
                const color = s === 'paid' ? Colors.success : s === 'pending' ? Colors.warning : s === 'partial' ? Colors.accent : Colors.textMuted;
                return (
                  <SelectableChip
                    key={s}
                    label={t(`billing.statuses.${s}`)}
                    selected={status === s}
                    onPress={() => setStatus(s)}
                    color={color}
                  />
                );
              })}
            </View>
          </View>

          {/* Package / plan */}
          <View style={styles.sectionCard}>
            <SectionLabel>{t('billing.packageSection')}</SectionLabel>
            <TextField
              label={t('billing.packageSection')}
              placeholder={t('billing.packageNamePlaceholder')}
              value={packageName}
              onChangeText={setPackageName}
            />
            <TextField
              label={t('billing.packageSessionsLabel')}
              placeholder={t('billing.packageSessionsPlaceholder')}
              value={packageSessions}
              onChangeText={setPackageSessions}
              keyboardType="numeric"
            />
          </View>

          {/* Notes */}
          <View style={styles.sectionCard}>
            <TextField
              label={t('common.notes')}
              placeholder={t('common.notes')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={{ height: TAB_BAR_CLEARANCE }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 70,
    alignItems: 'center',
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  scroll: { flex: 1, paddingHorizontal: Spacing.md },
  amountCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    alignItems: 'center',
    ...Shadow.lg,
  },
  amountLabel: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '800',
    color: Colors.white,
    minWidth: 120,
    textAlign: 'center',
  },
  currency: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    ...Shadow.sm,
  },
  helperText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  methodBtn: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.inputBg,
    position: 'relative',
  },
  methodLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  selectedDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
