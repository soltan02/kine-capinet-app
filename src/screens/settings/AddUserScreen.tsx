import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Clipboard } from 'react-native';
import { supabase, UserRole } from '../../lib/supabase';
import { addLocalUser, isLocalModeEnabled } from '../../lib/localAuth';
import { useAuditStore } from '../../lib/auditStore';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles, TAB_BAR_CLEARANCE } from '../../constants/theme';
import ScreenHeader from '../../components/ScreenHeader';

const ROLES: { key: UserRole; icon: string }[] = [
  { key: 'admin', icon: 'ribbon-outline' },
  { key: 'therapist', icon: 'medkit-outline' },
  { key: 'receptionist', icon: 'desktop-outline' },
];

function generatePassword(length = 14) {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  try {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => charset[b % charset.length]).join('');
  } catch {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }
    return result;
  }
}

export default function AddUserScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const { logAction } = useAuditStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('therapist');
  const [loading, setLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert(t('common.error'), t('common.required'));
      return;
    }

    setLoading(true);
    try {
      const password = generatePassword();
      const localMode = await isLocalModeEnabled();

      if (localMode) {
        await addLocalUser({ full_name: fullName.trim(), email: email.trim().toLowerCase(), role: selectedRole, password });
        setGeneratedPassword(password);
        await logAction('create_user', `Utilisateur créé : ${fullName.trim()} (${selectedRole})`);
        Alert.alert(
          t('common.success'),
          `${t('settings.userCreatedAs', { name: fullName.trim(), role: t(`settings.roles.${selectedRole}` as any) })}\n\n${t('settings.generatedPasswordLabel')}: ${password}`
        );
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert(t('common.error'), t('settings.sessionExpired'));
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { full_name: fullName.trim(), email: email.trim().toLowerCase(), role: selectedRole },
      });

      if (error) {
        Alert.alert(t('common.error'), error.message || t('settings.createUserFailed'));
        setLoading(false);
        return;
      }

      const result = data as any;
      if (result?.error || result?.status === "error") {
        Alert.alert(t('common.error'), result?.message || result?.error || t('settings.createUserFailed'));
        setLoading(false);
        return;
      }

      const createdPassword = result?.password || password;
      setGeneratedPassword(createdPassword);
      await logAction("create_user", `Utilisateur créé : ${fullName.trim()} (${selectedRole})`);
      Alert.alert(
        t("common.success"),
        `${t('settings.userCreatedAs', { name: fullName.trim(), role: t(`settings.roles.${selectedRole}` as any) })}\n\n${t('settings.generatedPasswordLabel')}: ${createdPassword}`
      );
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <ScreenHeader title={t('settings.addUser')} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Full Name */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('settings.fullName')}</Text>
            <TextInput
              style={styles.input}
              placeholder="Dr. John Doe"
              placeholderTextColor={Colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('auth.email')}</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={[styles.infoBox, { marginBottom: Spacing.lg }]}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.primary} style={{ marginRight: Spacing.sm }} />
            <Text style={styles.infoText}>{t('settings.generatedPassword')}</Text>
          </View>

          {/* Role selector */}
          <View style={styles.field}>
            <Text style={styles.label}>{t('settings.role')}</Text>
            <View style={styles.roleGrid}>
              {ROLES.map((role) => {
                const isSelected = selectedRole === role.key;
                return (
                  <TouchableOpacity
                    key={role.key}
                    style={[styles.roleCard, isSelected && styles.roleCardSelected]}
                    onPress={() => setSelectedRole(role.key)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.roleIcon, isSelected && styles.roleIconSelected]}>
                      <Ionicons
                        name={role.icon as any}
                        size={24}
                        color={isSelected ? Colors.white : Colors.primary}
                      />
                    </View>
                    <Text style={[styles.roleName, isSelected && styles.roleNameSelected]}>
                      {t(`settings.roles.${role.key}` as any)}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={Colors.white} style={styles.roleCheck} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Create button */}
          <TouchableOpacity
            style={styles.createBtn}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={20} color={Colors.white} />
                <Text style={styles.createBtnText}>{t('settings.addUser')}</Text>
              </>
            )}
          </TouchableOpacity>

          {generatedPassword ? (
            <View style={styles.passwordCard}>
              <Text style={styles.passwordTitle}>{t('settings.generatedPasswordLabel')}</Text>
              <View style={styles.passwordRow}>
                <Text style={styles.passwordText}>{generatedPassword}</Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => {
                    Clipboard.setString(generatedPassword);
                    Alert.alert(t('settings.copied'), t('settings.passwordCopied'));
                  }}
                >
                  <Ionicons name="copy-outline" size={18} color={Colors.white} />
                </TouchableOpacity>
              </View>
              <Text style={styles.passwordHint}>{t('settings.sharePasswordHint')}</Text>
            </View>
          ) : null}

          <View style={{ height: TAB_BAR_CLEARANCE }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.lg },
  field: { marginBottom: Spacing.lg },
  label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.xs, letterSpacing: 0.3 },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    height: 52,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  roleCard: {
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  roleCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  roleIconSelected: { backgroundColor: 'rgba(255,255,255,0.2)' },
  roleName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  roleNameSelected: { color: Colors.white },
  roleCheck: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 54,
    gap: Spacing.sm,
    marginTop: Spacing.md,
    ...Shadow.md,
  },
  createBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
  passwordCard: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    ...Shadow.md,
  },
  passwordTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  passwordText: { flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary, letterSpacing: 1 },
  copyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordHint: { marginTop: Spacing.sm, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },
});






