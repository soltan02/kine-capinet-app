import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';
import { usePermissions } from '../../lib/permissions';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles, TAB_BAR_CLEARANCE } from '../../constants/theme';

interface Props {
  navigation: any;
  route: any;
}

export default function AddSessionNoteScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const { can } = usePermissions();
  const editNote = route?.params?.note;
  const isEditing = !!editNote;
  const clientId = route?.params?.clientId ?? editNote?.client_id;
  const appointmentId = route?.params?.appointmentId ?? editNote?.appointment_id;

  const [painBefore, setPainBefore] = useState<number | null>(editNote?.pain_before ?? null);
  const [painAfter, setPainAfter] = useState<number | null>(editNote?.pain_after ?? null);

  // Checkbox templates
  const [electrotherapy, setElectrotherapy] = useState(!!editNote?.electrotherapy);
  const [manualTherapy, setManualTherapy] = useState(!!editNote?.manual_therapy);
  const [exercises, setExercises] = useState(!!editNote?.exercises);
  const [stretching, setStretching] = useState(!!editNote?.stretching);

  const [treatmentDetails, setTreatmentDetails] = useState(editNote?.treatment_details || '');
  const [therapistNotes, setTherapistNotes] = useState(editNote?.therapist_notes || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (loading) return;
    if (!can('sessions:manage')) {
      Alert.alert(t('common.error'), t('sessions.unauthorized'));
      navigation.goBack();
      return;
    }
    if (!clientId) {
      Alert.alert(t('common.error'), t('sessions.clientRequired'));
      return;
    }
    setLoading(true);

    const payload = {
      pain_before: painBefore,
      pain_after: painAfter,
      electrotherapy,
      manual_therapy: manualTherapy,
      exercises,
      stretching,
      treatment_details: treatmentDetails || null,
      therapist_notes: therapistNotes || null,
    };

    const { error: sessionError } = isEditing
      ? await supabase.from('session_logs').update(payload).eq('id', editNote.id)
      : await supabase.from('session_logs').insert([{
          client_id: clientId,
          appointment_id: appointmentId || null,
          therapist_id: profile?.id,
          ...payload,
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
        }]);

    await supabase.from('audit_logs').insert([{
      user_id: profile?.id,
      action: isEditing ? 'edit_session_note' : 'add_session_note',
      details: `Note de séance ${isEditing ? 'modifiée' : 'ajoutée'} pour le patient ${clientId}`,
    }]);

    setLoading(false);

    if (sessionError) {
      Alert.alert(t('common.error'), sessionError.message);
    } else {
      Alert.alert(t('common.success'), isEditing ? t('sessions.noteUpdated') : t('sessions.noteSaved'));
      navigation.goBack();
    }
  };

  const PainScale = ({ selected, onSelect, label }: { selected: number | null, onSelect: (v: number) => void, label: string }) => (
    <View style={styles.painBlock}>
      <Text style={styles.painBlockLabel}>{label}</Text>
      <View style={styles.painGrid}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => {
          const isSelected = selected === v;
          const color = v <= 3 ? Colors.success : v <= 6 ? Colors.warning : Colors.danger;
          return (
            <TouchableOpacity
              key={v}
              style={[styles.painBtn, isSelected && { backgroundColor: color, borderColor: color }]}
              onPress={() => onSelect(v)}
            >
              <Text style={[styles.painBtnText, isSelected && { color: Colors.white }]}>{v}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const CheckboxRow = ({ value, onValueChange, label }: { value: boolean, onValueChange: (v: boolean) => void, label: string }) => (
    <TouchableOpacity
      style={styles.checkboxRow}
      onPress={() => onValueChange(!value)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={value ? 'checkbox' : 'square-outline'}
        size={24}
        color={value ? Colors.primary : Colors.textMuted}
      />
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? t('sessions.editNote') : t('sessions.title')}</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={Colors.white} /> : <Text style={styles.saveBtnText}>{t('common.save')}</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Pain section */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>{t('sessions.painScoreSection')}</Text>
            <PainScale selected={painBefore} onSelect={setPainBefore} label={t('sessions.painBefore')} />
            <View style={styles.divider} />
            <PainScale selected={painAfter} onSelect={setPainAfter} label={t('sessions.painAfter')} />
          </View>

          {/* Treatment Checkbox Checklists */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>{t('sessions.treatmentsPerformed')}</Text>
            <CheckboxRow value={electrotherapy} onValueChange={setElectrotherapy} label={t('sessions.electrotherapy')} />
            <CheckboxRow value={manualTherapy} onValueChange={setManualTherapy} label={t('sessions.manualTherapy')} />
            <CheckboxRow value={exercises} onValueChange={setExercises} label={t('sessions.exercisesReinforcement')} />
            <CheckboxRow value={stretching} onValueChange={setStretching} label={t('sessions.stretching')} />
          </View>

          {/* Detailed notes */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>{t('sessions.sessionDetails')}</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder={t('sessions.treatmentDetailsPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              value={treatmentDetails}
              onChangeText={setTreatmentDetails}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TextInput
              style={[styles.input, styles.multiline, { marginTop: Spacing.md }]}
              placeholder={t('sessions.therapistNotesPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              value={therapistNotes}
              onChangeText={setTherapistNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
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
  scroll: { flex: 1, paddingHorizontal: Spacing.lg },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    ...Shadow.sm,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  painBlock: {
    marginBottom: Spacing.sm,
  },
  painBlockLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  painGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  painBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.inputBg,
  },
  painBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  checkboxLabel: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  multiline: {
    height: 90,
    paddingTop: Spacing.sm,
  },
});
