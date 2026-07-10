import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr, arDZ } from 'date-fns/locale';
import { supabase, Client, Appointment, Payment, SessionLog, ClientAttachment } from '../../lib/supabase';
import { useClientsStore } from '../../lib/store';
import { usePermissions } from '../../lib/permissions';
import { useResponsive } from '../../hooks/useResponsive';
import { openDocument, getDocumentUrl } from '../../lib/documents';
import { exportPatientPdf } from '../../lib/patientExport';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles, TAB_BAR_CLEARANCE } from '../../constants/theme';
import i18n from '../../lib/i18n';
import ScreenHeader from '../../components/ScreenHeader';
import EmptyState from '../../components/EmptyState';
import { getStatusColor } from '../../components/StatusBadge';
import ProgressTimeline from '../../components/ProgressTimeline';
import { SkeletonList } from '../../components/Skeleton';
import Button from '../../components/Button';
import DocumentViewerModal from '../../components/DocumentViewerModal';
import CertificateModal from '../../components/CertificateModal';

const TABS = ['info', 'appointments', 'sessions', 'progress', 'billing'] as const;
type Tab = typeof TABS[number];

const PAYMENT_METHOD_COLORS: Record<Payment['payment_method'], string> = {
  cash: Colors.cash,
  cnam: Colors.cnam,
  card: Colors.cardPayment,
  other: Colors.other,
};

export default function ClientDetailScreen({ navigation, route }: { navigation: any; route: any }) {
  const { t } = useTranslation();
  const { deleteClient } = useClientsStore();
  const client: Client = route.params.client;
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const locale = i18n.language === 'ar' ? arDZ : fr;
  const { can } = usePermissions();
  const canViewDocs = can('sessions:view'); // admin + kiné only
  const canAnalyze = can('ai:analyze'); // admin + kiné only
  const canViewBilling = can('billing:view'); // admin + receptionist only
  const visibleTabs = canViewBilling ? TABS : TABS.filter((tab) => tab !== 'billing');
  const [exporting, setExporting] = useState(false);
  const [showExportChoice, setShowExportChoice] = useState(false);
  const [viewerAtt, setViewerAtt] = useState<ClientAttachment | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [certDefaults, setCertDefaults] = useState({ sessionsCount: 0, periodStart: '', periodEnd: '' });
  const { isDesktop } = useResponsive();

  // On web, a 3-button Alert.alert falls back to window.confirm(), which
  // only supports two outcomes AND consumes the browser's user-activation
  // state — so the window.open() inside exportPatientPdf gets silently
  // popup-blocked by the time it runs. Use a real in-app modal instead,
  // whose button taps are genuine DOM clicks and preserve the gesture.
  const handleExportPdf = () => {
    if (exporting) return;
    if (Platform.OS === 'web') {
      setShowExportChoice(true);
      return;
    }
    Alert.alert(
      t('clients.exportFile'),
      undefined,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('clients.exportWithoutBilling'), onPress: () => runExport(false) },
        { text: t('clients.exportWithBilling'), onPress: () => runExport(true) },
      ]
    );
  };

  const chooseExport = (includeBilling: boolean) => {
    setShowExportChoice(false);
    runExport(includeBilling);
  };

  const runExport = async (includeBilling: boolean) => {
    setExporting(true);
    try {
      await exportPatientPdf(client, includeBilling);
    } catch {
      Alert.alert(t('common.error'), t('clients.exportFailed'));
    }
    setExporting(false);
  };

  // On web, viewing goes through an in-app preview instead of a new
  // window.open() tab — some browser extensions block window.open()
  // outright regardless of the site's own pop-up permission, and there's
  // no site-level fix for that. Native keeps the external-viewer flow via
  // openDocument()/Linking, which isn't affected by any of this.
  const openDoc = async (att: ClientAttachment) => {
    if (Platform.OS === 'web') {
      setViewerAtt(att);
      setViewerUrl(null);
      try {
        const url = att.path ? await getDocumentUrl(att.path) : att.url || null;
        if (!url) throw new Error('no_url');
        setViewerUrl(url);
      } catch {
        setViewerAtt(null);
        Alert.alert(t('common.error'), t('clients.openFailed'));
      }
      return;
    }
    try {
      await openDocument(att);
    } catch {
      Alert.alert(t('common.error'), t('clients.openFailed'));
    }
  };

  const handleOpenCertificate = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('date')
      .eq('client_id', client.id)
      .eq('status', 'completed')
      .order('date', { ascending: true });
    const dates = (data || []).map((a: any) => a.date as string);
    setCertDefaults({
      sessionsCount: dates.length,
      periodStart: dates[0] || '',
      periodEnd: dates[dates.length - 1] || '',
    });
    setShowCertificate(true);
  };

  const fullName = `${client.first_name} ${client.last_name}`;
  const initials = `${client.first_name[0]}${client.last_name[0]}`.toUpperCase();

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  // Reload the active tab when returning from an add/edit screen.
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => loadTabData());
    return unsub;
  }, [navigation, activeTab]);

  const loadTabData = async () => {
    setLoading(true);
    if (activeTab === 'appointments') {
      const { data } = await supabase
        .from('appointments')
        .select('*')
        .eq('client_id', client.id)
        .order('date', { ascending: false });
      setAppointments((data as Appointment[]) || []);
    } else if (activeTab === 'sessions' || activeTab === 'progress') {
      const { data } = await supabase
        .from('session_logs')
        .select('*')
        .eq('client_id', client.id)
        .order('started_at', { ascending: false });
      setSessions((data as SessionLog[]) || []);
    } else if (activeTab === 'billing') {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('client_id', client.id)
        .order('paid_at', { ascending: false });
      setPayments((data as Payment[]) || []);
    }
    setLoading(false);
  };

  const canManageSessions = can('sessions:manage');
  const canManageBilling = can('billing:manage');
  const canViewBillingTotals = can('billing:viewTotals');

  const confirmDelete = (title: string, onConfirm: () => Promise<void>) => {
    Alert.alert(title, undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await onConfirm();
            loadTabData();
          } catch (e: any) {
            Alert.alert(t('common.error'), e?.message || String(e));
          }
        },
      },
    ]);
  };

  const deleteSession = (note: SessionLog) =>
    confirmDelete(t('sessions.deleteNoteConfirm'), async () => {
      const { error } = await supabase.from('session_logs').delete().eq('id', note.id);
      if (error) throw error;
    });

  const deletePayment = (p: Payment) =>
    confirmDelete(t('billing.deletePaymentConfirm'), async () => {
      const { error } = await supabase.from('payments').delete().eq('id', p.id);
      if (error) throw error;
    });

  const handleDelete = () => {
    Alert.alert(
      t('clients.deleteConfirm'),
      t('clients.deleteWarning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteClient(client.id);
            if (error) {
              Alert.alert(t('common.error'), error);
              return;
            }
            navigation.goBack();
          },
        },
      ]
    );
  };

  const InfoRow = ({ icon, label, value }: { icon: string; label: string; value?: string }) => (
    value ? (
      <View style={styles.infoRow}>
        <View style={styles.infoIconWrap}>
          <Ionicons name={icon as any} size={16} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      </View>
    ) : null
  );

  const tabLabels: Record<Tab, string> = {
    info: t('clients.clientInfo'),
    appointments: t('clients.appointments'),
    sessions: t('clients.sessionNotes'),
    progress: t('clients.progress'),
    billing: t('clients.billing'),
  };

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <ScreenHeader
        variant="overlay"
        onBack={() => navigation.goBack()}
        actions={[
          ...(canViewDocs ? [{ icon: (exporting ? 'hourglass-outline' : 'document-text-outline') as any, onPress: handleExportPdf, accessibilityLabel: t('clients.exportFile') }] : []),
          { icon: 'pencil-outline', onPress: () => navigation.navigate('AddClient', { client }), accessibilityLabel: t('common.edit') },
        ]}
      />

      {/* Client hero */}
      <View style={styles.heroSection}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText}>{initials}</Text>
        </View>
        <Text style={styles.heroName}>{fullName}</Text>
        {client.diagnosis ? (
          <Text style={styles.heroDiagnosis}>{client.diagnosis}</Text>
        ) : null}
        <View style={styles.heroBadges}>
          {client.cnam_number ? (
            <View style={styles.cnamBadge}>
              <Text style={styles.cnamBadgeText}>CNAM: {client.cnam_number}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {visibleTabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tabLabels[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'info' && (
          <View style={styles.infoCard}>
            <InfoRow icon="call-outline" label={t('common.phone')} value={client.phone} />
            <InfoRow icon="mail-outline" label={t('common.email')} value={client.email} />
            <InfoRow icon="calendar-outline" label={t('clients.dateOfBirth')} value={client.date_of_birth} />
            <InfoRow icon="person-outline" label={t('clients.gender')} value={client.gender ? t(`common.${client.gender}`) : undefined} />
            <InfoRow icon="location-outline" label={t('common.address')} value={client.address} />
            <InfoRow icon="medkit-outline" label={t('clients.diagnosis')} value={client.diagnosis} />
            <InfoRow icon="document-text-outline" label={t('clients.medicalHistory')} value={client.medical_history} />
            <InfoRow icon="card-outline" label={t('clients.cnamNumber')} value={client.cnam_number} />
            <InfoRow icon="clipboard-outline" label={t('common.notes')} value={client.notes} />

            {canViewDocs && client.attachments && client.attachments.length > 0 ? (
              <View style={styles.attachmentBlock}>
                <Text style={styles.infoLabel}>{t('clients.medicalDocuments')}</Text>
                {client.attachments.map((attachment) => {
                  const isImg = (attachment.mime || '').startsWith('image/');
                  return (
                    <TouchableOpacity key={attachment.id} style={styles.attachmentItem} onPress={() => openDoc(attachment)} activeOpacity={0.7}>
                      <Ionicons name={isImg ? 'image-outline' : 'document-text-outline'} size={18} color={Colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.attachmentName} numberOfLines={1}>{attachment.name}</Text>
                        {attachment.notes ? <Text style={styles.attachmentMeta}>{attachment.notes}</Text> : null}
                      </View>
                      <Ionicons name="open-outline" size={16} color={Colors.textMuted} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            {canViewDocs ? (
              <Button
                title={t('clients.generateCertificate')}
                onPress={handleOpenCertificate}
                icon="ribbon-outline"
                variant="secondary"
                style={{ marginTop: Spacing.lg }}
              />
            ) : null}

            {canAnalyze ? (
              <Button
                title={t('ai.analyzeButton')}
                onPress={() => navigation.navigate('PatientAnalysis', { clientId: client.id, clientName: fullName })}
                icon="sparkles"
                style={{ marginTop: Spacing.sm }}
              />
            ) : null}

            <Button
              title={t('common.delete')}
              onPress={handleDelete}
              variant="danger"
              icon="trash-outline"
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        )}

        {activeTab === 'appointments' && (
          loading ? <SkeletonList count={4} padded={false} /> :
          appointments.length === 0 ? (
            <EmptyState icon="calendar-outline" message={t('appointments.noAppointments')} iconSize={56} />
          ) : (
            appointments.map((appt) => {
              const statusColor = getStatusColor(appt.status);
              return (
                <View key={appt.id} style={styles.listCard}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCardDate}>
                      {format(new Date(appt.date), 'dd MMM yyyy', { locale })} · {appt.start_time?.slice(0, 5)}
                    </Text>
                    <Text style={styles.listCardType}>{t(`appointments.types.${appt.type}`)}</Text>
                  </View>
                  <Text style={[styles.listCardStatus, { color: statusColor }]}>
                    {t(`appointments.statuses.${appt.status}`)}
                  </Text>
                </View>
              );
            })
          )
        )}

        {activeTab === 'sessions' && (
          loading ? <SkeletonList count={4} padded={false} /> :
          sessions.length === 0 ? (
            <EmptyState icon="document-text-outline" message={t('sessions.noNotes')} iconSize={56} />
          ) : (
            sessions.map((note) => {
              const treatments = [
                note.electrotherapy ? t('sessions.electrotherapy') : null,
                note.manual_therapy ? t('sessions.manualTherapy') : null,
                note.exercises ? t('sessions.exercisesReinforcement') : null,
                note.stretching ? t('sessions.stretching') : null,
              ].filter(Boolean);

              return (
                <View key={note.id} style={styles.sessionCard}>
                  <View style={styles.rowHeader}>
                    <Text style={styles.sessionDate}>
                      {format(new Date(note.started_at), 'dd MMM yyyy', { locale })}
                    </Text>
                    {canManageSessions ? (
                      <View style={styles.rowActions}>
                        <TouchableOpacity onPress={() => navigation.navigate('AddSessionNote', { note })} hitSlop={8}>
                          <Ionicons name="pencil" size={16} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteSession(note)} hitSlop={8}>
                          <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.painRow}>
                    <Text style={styles.painLabel}>{t('sessions.painScale')}:</Text>
                    <View style={styles.painBadge}>
                      <Text style={styles.painValue}>{note.pain_before ?? '—'}/10 → {note.pain_after ?? '—'}/10</Text>
                    </View>
                  </View>
                  {treatments.length > 0 ? (
                    <Text style={styles.sessionNote}><Text style={styles.sessionNoteLabel}>{t('sessions.proceduresLabel')}: </Text>{treatments.join(' · ')}</Text>
                  ) : null}
                  {note.treatment_details ? <Text style={styles.sessionNote}><Text style={styles.sessionNoteLabel}>{t('sessions.treatmentDone')}: </Text>{note.treatment_details}</Text> : null}
                  {note.therapist_notes ? <Text style={styles.sessionNote}><Text style={styles.sessionNoteLabel}>{t('sessions.progressNotes')}: </Text>{note.therapist_notes}</Text> : null}
                </View>
              );
            })
          )
        )}

        {activeTab === 'progress' && (
          loading ? <SkeletonList count={3} padded={false} /> :
          sessions.length === 0 ? (
            <EmptyState icon="pulse-outline" message={t('progress.noData')} iconSize={56} />
          ) : (
            <ProgressTimeline sessions={sessions} sessionsPrescribed={client.sessions_prescribed} />
          )
        )}

        {activeTab === 'billing' && (
          loading ? <SkeletonList count={3} padded={false} /> :
          payments.length === 0 ? (
            <EmptyState icon="cash-outline" message={t('billing.noBillingRecords')} iconSize={56} />
          ) : (
            <>
              {canViewBillingTotals && (
                <View style={styles.billingTotal}>
                  <Text style={styles.billingTotalLabel}>{t('billing.totalRevenue')}</Text>
                  <Text style={styles.billingTotalAmount}>
                    {payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0).toFixed(3)} TND
                  </Text>
                </View>
              )}
              {payments.map((p) => {
                const methodColor = PAYMENT_METHOD_COLORS[p.payment_method];
                return (
                <View key={p.id} style={styles.listCard}>
                  <TouchableOpacity
                    style={styles.paymentMain}
                    activeOpacity={canManageBilling ? 0.7 : 1}
                    disabled={!canManageBilling}
                    onPress={() => navigation.navigate('AddPayment', { payment: p, clientId: client.id })}
                  >
                    <View style={[styles.methodIcon, { backgroundColor: methodColor + '18' }]}>
                      <Ionicons
                        name={p.payment_method === 'cash' ? 'cash-outline' : 'card-outline'}
                        size={18}
                        color={methodColor}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listCardDate}>
                        {format(new Date(p.paid_at), 'dd MMM yyyy', { locale })}
                      </Text>
                      <Text style={styles.listCardType}>{t(`billing.methods.${p.payment_method}`)}</Text>
                      {p.cnam_reference ? <Text style={styles.cnamRef}>{t('billing.refLabel')}: {p.cnam_reference}</Text> : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.paymentAmount}>{p.amount.toFixed(3)} TND</Text>
                      <Text style={[styles.paymentStatus, { color: p.status === 'paid' ? Colors.success : p.status === 'pending' || p.status === 'partial' ? Colors.warning : Colors.textMuted }]}>
                        {t(`billing.statuses.${p.status}`)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {canManageBilling ? (
                    <TouchableOpacity onPress={() => deletePayment(p)} hitSlop={8} style={styles.rowDeleteBtn}>
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                );
              })}
            </>
          )
        )}
        <View style={{ height: TAB_BAR_CLEARANCE }} />
      </ScrollView>

      {/* FAB */}
      {(activeTab === 'appointments' || activeTab === 'sessions' || activeTab === 'billing') && (
        <TouchableOpacity
          style={CommonStyles.fab}
          onPress={() => {
            if (activeTab === 'appointments') navigation.navigate('AddAppointment', { clientId: client.id });
            else if (activeTab === 'sessions') navigation.navigate('AddSessionNote', { clientId: client.id });
            else if (activeTab === 'billing') navigation.navigate('AddPayment', { clientId: client.id });
          }}
        >
          <Ionicons name="add" size={28} color={Colors.white} />
        </TouchableOpacity>
      )}

      <Modal visible={showExportChoice} animationType="fade" transparent onRequestClose={() => setShowExportChoice(false)}>
        <View style={[styles.exportOverlay, isDesktop && styles.exportOverlayDesktop]}>
          <View style={[styles.exportSheet, isDesktop && styles.exportSheetDesktop]}>
            <Text style={styles.exportSheetTitle}>{t('clients.exportFile')}</Text>
            <TouchableOpacity style={styles.exportOption} onPress={() => chooseExport(false)}>
              <Text style={styles.exportOptionText}>{t('clients.exportWithoutBilling')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportOption} onPress={() => chooseExport(true)}>
              <Text style={styles.exportOptionText}>{t('clients.exportWithBilling')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportCancel} onPress={() => setShowExportChoice(false)}>
              <Text style={styles.exportCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <DocumentViewerModal
        visible={!!viewerAtt}
        url={viewerUrl}
        mime={viewerAtt?.mime}
        onClose={() => { setViewerAtt(null); setViewerUrl(null); }}
      />

      <CertificateModal
        visible={showCertificate}
        client={client}
        defaultSessionsCount={certDefaults.sessionsCount}
        defaultPeriodStart={certDefaults.periodStart}
        defaultPeriodEnd={certDefaults.periodEnd}
        onClose={() => setShowCertificate(false)}
        onError={(msg) => Alert.alert(t('common.error'), msg)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingTop: 70,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  heroAvatarText: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.white,
  },
  heroName: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.3,
  },
  heroDiagnosis: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    textAlign: 'center',
  },
  heroBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  cnamBadge: {
    backgroundColor: Colors.infoLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  cnamBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.info,
  },
  tabBar: {
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexGrow: 0,
  },
  tab: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginTop: 2,
  },
  attachmentBlock: {
    marginTop: Spacing.md,
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  attachmentName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  attachmentMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  listCardDate: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  listCardType: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  listCardStatus: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  sessionCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  sessionDate: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  rowActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  paymentMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rowDeleteBtn: {
    paddingLeft: Spacing.sm,
  },
  painRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  painLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  painBadge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  painValue: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.warning,
  },
  sessionNote: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  sessionNoteLabel: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  billingTotal: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billingTotalLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  billingTotalAmount: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentAmount: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  paymentStatus: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    marginTop: 2,
  },
  cnamRef: {
    fontSize: FontSize.xs,
    color: Colors.info,
    marginTop: 2,
  },
  exportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  exportOverlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    ...Shadow.lg,
  },
  exportSheetDesktop: {
    width: '100%',
    maxWidth: 420,
    borderRadius: BorderRadius.xxl,
  },
  exportSheetTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  exportOption: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exportOptionText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  exportCancel: {
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
    alignItems: 'center',
  },
  exportCancelText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});
