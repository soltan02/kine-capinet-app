import React, { useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';
import { Client } from '../lib/supabase';
import TextField from './TextField';
import DateTimeField from './DateTimeField';
import Button from './Button';
import { generateCertificate, CertificateFields } from '../lib/certificate';

interface Props {
  visible: boolean;
  client: Client | null;
  defaultSessionsCount: number;
  defaultPeriodStart: string; // 'YYYY-MM-DD' or ''
  defaultPeriodEnd: string;
  onClose: () => void;
  onError: (message: string) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toDisplayDate = (iso: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function CertificateModal({ visible, client, defaultSessionsCount, defaultPeriodStart, defaultPeriodEnd, onClose, onError }: Props) {
  const { t } = useTranslation();
  const { isDesktop } = useResponsive();
  const [sessionsCount, setSessionsCount] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [certDate, setCertDate] = useState('');
  const [prescribingDoctor, setPrescribingDoctor] = useState('');
  const [motif, setMotif] = useState('');
  const [ordreNumber, setOrdreNumber] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (visible && client) {
      setSessionsCount(String(defaultSessionsCount || ''));
      setPeriodStart(defaultPeriodStart);
      setPeriodEnd(defaultPeriodEnd);
      setCertDate(todayIso());
      setPrescribingDoctor('');
      setMotif(client.diagnosis || '');
      setOrdreNumber('');
    }
  }, [visible, client]);

  if (!client) return null;

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    const fields: CertificateFields = {
      patientName: `${client.first_name} ${client.last_name}`,
      dob: toDisplayDate(client.date_of_birth || ''),
      sessionsCount,
      periodStart: toDisplayDate(periodStart),
      periodEnd: toDisplayDate(periodEnd),
      prescribingDoctor,
      motif,
      certificateDate: toDisplayDate(certDate),
      ordreNumber,
    };
    try {
      await generateCertificate(fields);
      onClose();
    } catch {
      onError(t('clients.certificateFailed'));
    }
    setGenerating(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, isDesktop && styles.overlayDesktop]}>
        <View style={[styles.sheet, isDesktop && styles.sheetDesktop]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('clients.generateCertificate')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <TextField
              label={t('clients.certSessionsCount')}
              value={sessionsCount}
              onChangeText={setSessionsCount}
              keyboardType="numeric"
            />
            <DateTimeField mode="date" label={t('clients.certPeriodStart')} value={periodStart} onChange={setPeriodStart} />
            <DateTimeField mode="date" label={t('clients.certPeriodEnd')} value={periodEnd} onChange={setPeriodEnd} />
            <TextField
              label={t('clients.certPrescribingDoctor')}
              value={prescribingDoctor}
              onChangeText={setPrescribingDoctor}
              placeholder={t('clients.certPrescribingDoctorPlaceholder')}
            />
            <TextField
              label={t('clients.certMotif')}
              value={motif}
              onChangeText={setMotif}
              multiline
              numberOfLines={3}
            />
            <DateTimeField mode="date" label={t('clients.certDate')} value={certDate} onChange={setCertDate} />
            <TextField
              label={t('clients.certOrdreNumber')}
              value={ordreNumber}
              onChangeText={setOrdreNumber}
              placeholder={t('clients.certOrdreNumberPlaceholder')}
            />
          </ScrollView>

          <Button
            title={t('clients.certificateGenerate')}
            onPress={handleGenerate}
            loading={generating}
            icon="document-text-outline"
            style={{ marginTop: Spacing.sm }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  overlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    maxHeight: '88%',
    ...Shadow.lg,
  },
  sheetDesktop: {
    width: '100%',
    maxWidth: 480,
    borderRadius: BorderRadius.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  body: {
    marginBottom: Spacing.sm,
  },
});
