import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
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
import { useClientsStore, useAuthStore } from '../../lib/store';
import { usePermissions } from '../../lib/permissions';
import DateTimeField from '../../components/DateTimeField';
import { Client, ClientAttachment } from '../../lib/supabase';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles, TAB_BAR_CLEARANCE } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { pickDocument, pickImage, uploadClientDocument, openDocument, deleteClientDocument, PickedFile } from '../../lib/documents';
import SectionLabel from '../../components/SectionLabel';
import SelectableChip from '../../components/SelectableChip';
import TextField from '../../components/TextField';

interface Props {
  navigation: any;
  route?: { params?: { client?: Client } };
}

export default function AddEditClientScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { addClient, updateClient } = useClientsStore();
  const { profile } = useAuthStore();
  const existingClient = route?.params?.client;
  const isEditing = !!existingClient;

  const [form, setForm] = useState({
    first_name: existingClient?.first_name || '',
    last_name: existingClient?.last_name || '',
    phone: existingClient?.phone || '',
    email: existingClient?.email || '',
    date_of_birth: existingClient?.date_of_birth || '',
    gender: existingClient?.gender || '' as 'male' | 'female' | '',
    address: existingClient?.address || '',
    diagnosis: existingClient?.diagnosis || '',
    medical_history: existingClient?.medical_history || '',
    contraindications: existingClient?.contraindications || '',
    treatment_goals: existingClient?.treatment_goals || '',
    sessions_prescribed: String(existingClient?.sessions_prescribed || '10'),
    cnam_number: existingClient?.cnam_number || '',
    notes: existingClient?.notes || '',
    attachments: existingClient?.attachments || [],
    is_active: existingClient?.is_active ?? true,
  });

  const { can } = usePermissions();
  const canManageDocs = can('sessions:view'); // admin + kiné only (confidential)
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  const setField = (key: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  // Persist the attachments array immediately (edit mode) so files aren't
  // orphaned if the user leaves without hitting the main Save.
  const persistAttachments = async (next: ClientAttachment[]) => {
    setForm((prev) => ({ ...prev, attachments: next }));
    if (isEditing && existingClient) {
      await updateClient(existingClient.id, { attachments: next } as any);
    }
  };

  const doUpload = async (file: PickedFile | null) => {
    if (!file || !existingClient) return;
    setUploading(true);
    try {
      const att = await uploadClientDocument(existingClient.id, file);
      await persistAttachments([...(form.attachments || []), att]);
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message === 'permission_denied' ? t('clients.permissionDenied') : t('clients.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleUploadFile = async () => {
    try { await doUpload(await pickDocument()); }
    catch (e: any) { Alert.alert(t('common.error'), t('clients.uploadFailed')); }
  };

  const handleAddPhoto = () => {
    Alert.alert(t('clients.addPhoto'), undefined, [
      { text: t('clients.takePhoto'), onPress: async () => { try { await doUpload(await pickImage(true)); } catch (e: any) { Alert.alert(t('common.error'), e?.message === 'permission_denied' ? t('clients.permissionDenied') : t('clients.uploadFailed')); } } },
      { text: t('clients.chooseFromGallery'), onPress: async () => { try { await doUpload(await pickImage(false)); } catch (e: any) { Alert.alert(t('common.error'), e?.message === 'permission_denied' ? t('clients.permissionDenied') : t('clients.uploadFailed')); } } },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleOpenDoc = async (att: ClientAttachment) => {
    try {
      await openDocument(att);
    } catch (e: any) {
      const isPopupBlocked = e?.message === 'popup_blocked';
      Alert.alert(t('common.error'), isPopupBlocked ? t('clients.popupBlocked') : t('clients.openFailed'));
    }
  };

  const removeAttachment = (att: ClientAttachment) => {
    Alert.alert(t('clients.deleteDocumentConfirm'), att.name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (att.path) await deleteClientDocument(att.path);
            await persistAttachments((form.attachments || []).filter((a: ClientAttachment) => a.id !== att.id));
          } catch {
            Alert.alert(t('common.error'), t('clients.uploadFailed'));
          }
        },
      },
    ]);
  };

  const validate = () => {
    const newErrors: Partial<Record<keyof typeof form, string>> = {};
    if (!form.first_name.trim()) newErrors.first_name = t('common.required');
    if (!form.last_name.trim()) newErrors.last_name = t('common.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (loading) return; // prevent duplicate submissions
    if (!validate()) return;
    setLoading(true);
    try {
      const clientData = {
        ...form,
        gender: form.gender || undefined,
        sessions_prescribed: Number(form.sessions_prescribed) || 10,
        created_by: profile?.id,
      };

      if (isEditing && existingClient) {
        const { error } = await updateClient(existingClient.id, clientData);
        if (error) throw new Error(error);
        await supabase.from('audit_logs').insert([{
          user_id: profile?.id,
          action: 'edit_patient',
          details: t('clients.editedPatientLog', { name: `${form.first_name} ${form.last_name}` }),
        }]);
      } else {
        const { error } = await addClient(clientData as any);
        if (error) throw new Error(error);
        await supabase.from('audit_logs').insert([{
          user_id: profile?.id,
          action: 'create_patient',
          details: t('clients.createdPatientLog', { name: `${form.first_name} ${form.last_name}` }),
        }]);
      }
      Alert.alert(t('common.success'), isEditing ? t('clients.patientUpdated') : t('clients.patientCreated'));
      navigation.goBack();
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const field = (
    label: string,
    fieldKey: keyof typeof form,
    opts: { placeholder?: string; keyboardType?: any; multiline?: boolean; required?: boolean } = {}
  ) => (
    <TextField
      label={label}
      value={String(form[fieldKey] || '')}
      onChangeText={(v) => setField(fieldKey, v)}
      error={errors[fieldKey]}
      placeholder={opts.placeholder}
      keyboardType={opts.keyboardType}
      multiline={opts.multiline}
      required={opts.required}
    />
  );

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? t('clients.editClient') : t('clients.addClient')}
          </Text>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>{t('common.save')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Section: Identity */}
          <View style={styles.sectionCard}>
            <SectionLabel>
              <Ionicons name="person-outline" size={14} /> {t('clients.clientInfo')}
            </SectionLabel>
            <View style={styles.rowFields}>
              <View style={{ flex: 1 }}>
                {field(t('clients.firstName'), 'first_name', { required: true })}
              </View>
              <View style={{ flex: 1 }}>
                {field(t('clients.lastName'), 'last_name', { required: true })}
              </View>
            </View>
            {field(t('common.phone'), 'phone', { keyboardType: 'phone-pad' })}
            <DateTimeField
              mode="date"
              value={form.date_of_birth}
              onChange={(v) => setField('date_of_birth', v)}
              label={t('clients.dateOfBirth')}
            />

            {/* Gender toggle */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{t('clients.gender')}</Text>
              <View style={styles.genderRow}>
                {(['male', 'female'] as const).map((g) => (
                  <SelectableChip
                    key={g}
                    label={t(`common.${g}`)}
                    selected={form.gender === g}
                    onPress={() => setField('gender', form.gender === g ? '' : g)}
                    icon={g === 'male' ? 'male-outline' : 'female-outline'}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Section: Advanced EHR Clinical details */}
          <View style={styles.sectionCard}>
            <SectionLabel>
              <Ionicons name="medkit-outline" size={14} /> {t('clients.medicalRecord')}
            </SectionLabel>
            {field(t('clients.diagnosis'), 'diagnosis', { multiline: true })}
            {field(t('clients.contraindications'), 'contraindications', { multiline: true, placeholder: t('clients.contraindicationsPlaceholder') })}
            {field(t('clients.treatmentGoals'), 'treatment_goals', { multiline: true, placeholder: t('clients.treatmentGoalsPlaceholder') })}
            {field(t('clients.sessionsPrescribed'), 'sessions_prescribed', { keyboardType: 'numeric' })}
            {field(t('clients.cnamNumber'), 'cnam_number', { placeholder: '0000-000-000' })}
          </View>

          {canManageDocs && (
            <View style={styles.sectionCard}>
              <SectionLabel>
                <Ionicons name="attach-outline" size={14} /> {t('clients.medicalDocuments')}
              </SectionLabel>

              {!isEditing ? (
                <Text style={styles.emptyAttachmentText}>{t('clients.saveFirstForDocs')}</Text>
              ) : (
                <>
                  <View style={styles.docBtnRow}>
                    <TouchableOpacity style={styles.docBtn} onPress={handleUploadFile} disabled={uploading} activeOpacity={0.85}>
                      <Ionicons name="document-attach-outline" size={18} color={Colors.primary} />
                      <Text style={styles.docBtnText}>{t('clients.uploadFile')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.docBtn} onPress={handleAddPhoto} disabled={uploading} activeOpacity={0.85}>
                      <Ionicons name="camera-outline" size={18} color={Colors.primary} />
                      <Text style={styles.docBtnText}>{t('clients.addPhoto')}</Text>
                    </TouchableOpacity>
                  </View>

                  {uploading ? (
                    <View style={styles.uploadingRow}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={styles.uploadingText}>{t('clients.uploading')}</Text>
                    </View>
                  ) : null}

                  {(form.attachments || []).length === 0 ? (
                    <Text style={styles.emptyAttachmentText}>{t('clients.noDocuments')}</Text>
                  ) : (
                    (form.attachments || []).map((attachment: ClientAttachment) => {
                      const isImg = (attachment.mime || '').startsWith('image/');
                      return (
                        <View key={attachment.id} style={styles.attachmentCard}>
                          <View style={styles.docIconWrap}>
                            <Ionicons name={isImg ? 'image-outline' : 'document-text-outline'} size={20} color={Colors.primary} />
                          </View>
                          <TouchableOpacity style={{ flex: 1 }} onPress={() => handleOpenDoc(attachment)} activeOpacity={0.7}>
                            <Text style={styles.attachmentName} numberOfLines={1}>{attachment.name}</Text>
                            <Text style={styles.attachmentMeta}>
                              {attachment.size ? `${Math.round(attachment.size / 1024)} Ko · ` : ''}{t('clients.openDocument')}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => removeAttachment(attachment)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </>
              )}
            </View>
          )}

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
    fontSize: FontSize.lg,
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
  scroll: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    ...Shadow.sm,
  },
  fieldGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  rowFields: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  genderRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  docBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  docBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryLight,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  docBtnText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  uploadingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  docIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAttachmentText: {
    marginTop: Spacing.md,
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
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
});
