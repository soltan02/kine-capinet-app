import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Alert } from '../../lib/alert';
import * as Updates from 'expo-updates';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../lib/store';
import { switchLanguage } from '../../lib/i18n';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles, ThemeMode, getThemeMode, persistThemeMode, TAB_BAR_CLEARANCE } from '../../constants/theme';
import { usePermissions } from '../../lib/permissions';
import i18n from '../../lib/i18n';
import ScreenHeader from '../../components/ScreenHeader';
import SectionLabel from '../../components/SectionLabel';
import Button from '../../components/Button';

export default function SettingsScreen({ navigation }: { navigation: any }) {
  const { t } = useTranslation();
  const { profile, signOut } = useAuthStore();
  const { can, role } = usePermissions();
  const [loggingOut, setLoggingOut] = useState(false);
  const [switchingLang, setSwitchingLang] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getThemeMode());
  const currentLang = i18n.language as 'fr' | 'ar';

  const handleThemeSwitch = async (mode: ThemeMode) => {
    if (mode === themeMode) return;
    setThemeModeState(mode);
    await persistThemeMode(mode);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Web can apply instantly with a reload
      window.location.reload();
      return;
    }
    // Native: reload the JS bundle so every screen's styles are rebuilt
    // with the new palette — no manual app restart needed.
    try {
      await Updates.reloadAsync();
    } catch {
      // Not available in this runtime (e.g. Expo Go) — fall back to asking
      // the user to restart manually.
      Alert.alert(t('settings.appearance'), t('settings.themeRestart'));
    }
  };

  const handleLanguageSwitch = async (lang: 'fr' | 'ar') => {
    if (lang === currentLang) return;
    setSwitchingLang(true);
    await switchLanguage(lang);
    setSwitchingLang(false);
    // In production, you'd use expo-updates to reload
    Alert.alert(
      lang === 'ar' ? 'تغيير اللغة' : 'Changement de langue',
      lang === 'ar'
        ? 'أعد تشغيل التطبيق لتفعيل العربية بالكامل'
        : 'Redémarrez l\'application pour activer le français',
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.logout'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
          style: 'destructive',
          onPress: () => {
            setLoggingOut(true);
            // signOut clears state synchronously, which unmounts this
            // component immediately — no need to await or clean up
            signOut();
          },
        },
      ]
    );
  };

  const SettingRow = ({ icon, label, value, onPress, danger = false, rightElement }: {
    icon: string; label: string; value?: string; onPress?: () => void; danger?: boolean; rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? Colors.dangerLight : Colors.accentLight }]}>
        <Ionicons name={icon as any} size={18} color={danger ? Colors.danger : Colors.accent} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, danger && { color: Colors.danger }]}>{label}</Text>
        {value ? <Text style={styles.settingValue}>{value}</Text> : null}
      </View>
      {rightElement || (onPress ? <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} /> : null)}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={['top']}>
      <ScreenHeader title={t('settings.title')} onBack={() => navigation.navigate('Dashboard')} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {(profile?.full_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{profile?.full_name || '—'}</Text>
            <View style={[styles.rolePill, role === 'admin' && styles.rolePillAdmin]}>
              <Text style={[styles.rolePillText, role === 'admin' && styles.rolePillTextAdmin]}>
                {role === 'admin' && '👑 '}
                {role === 'therapist' && '🩺 '}
                {role === 'receptionist' && '💼 '}
                {t(`settings.roles.${role}` as any)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => navigation.navigate('EditUser', { user: profile })}
          >
            <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Language */}
        <SectionLabel>{t('settings.language')}</SectionLabel>
        <View style={styles.card}>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, currentLang === 'fr' && styles.langBtnActive]}
              onPress={() => handleLanguageSwitch('fr')}
              disabled={switchingLang}
            >
              <Text style={styles.langFlag}>🇫🇷</Text>
              <Text style={[styles.langLabel, currentLang === 'fr' && styles.langLabelActive]}>
                {t('settings.french')}
              </Text>
              {currentLang === 'fr' && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
            </TouchableOpacity>
            <View style={styles.langDivider} />
            <TouchableOpacity
              style={[styles.langBtn, currentLang === 'ar' && styles.langBtnActive]}
              onPress={() => handleLanguageSwitch('ar')}
              disabled={switchingLang}
            >
              <Text style={styles.langFlag}>🇹🇳</Text>
              <Text style={[styles.langLabel, currentLang === 'ar' && styles.langLabelActive]}>
                {t('settings.arabic')}
              </Text>
              {currentLang === 'ar' && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Appearance */}
        <SectionLabel>{t('settings.appearance')}</SectionLabel>
        <View style={styles.card}>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, themeMode === 'light' && styles.langBtnActive]}
              onPress={() => handleThemeSwitch('light')}
            >
              <Ionicons name="sunny-outline" size={20} color={themeMode === 'light' ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.langLabel, themeMode === 'light' && styles.langLabelActive]}>
                {t('settings.light')}
              </Text>
              {themeMode === 'light' && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
            </TouchableOpacity>
            <View style={styles.langDivider} />
            <TouchableOpacity
              style={[styles.langBtn, themeMode === 'dark' && styles.langBtnActive]}
              onPress={() => handleThemeSwitch('dark')}
            >
              <Ionicons name="moon-outline" size={20} color={themeMode === 'dark' ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.langLabel, themeMode === 'dark' && styles.langLabelActive]}>
                {t('settings.dark')}
              </Text>
              {themeMode === 'dark' && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Account */}
        {can('users:manage') && (
          <>
            <SectionLabel>{t('settings.users')}</SectionLabel>
            <View style={styles.card}>
              <SettingRow
                icon="people-outline"
                label={t('settings.users')}
                onPress={() => navigation.navigate('UserManagement')}
              />
              {can('audit:view') && (
                <SettingRow
                  icon="shield-outline"
                  label={t('settings.auditLogs')}
                  onPress={() => navigation.navigate('AuditLogScreen')}
                />
              )}
              {can('backups:manage') && (
                <SettingRow
                  icon="cloud-download-outline"
                  label={t('backups.title')}
                  onPress={() => navigation.navigate('Backups')}
                />
              )}
            </View>
          </>
        )}

        {/* About */}
        <SectionLabel>{t('settings.about')}</SectionLabel>
        <View style={styles.card}>
          <SettingRow
            icon="information-circle-outline"
            label={t('settings.version')}
            value="1.0.0"
          />
        </View>

        {/* Logout */}
        <Button
          title={t('settings.logout')}
          onPress={handleLogout}
          loading={loggingOut}
          variant="danger"
          icon="log-out-outline"
          style={{ marginTop: Spacing.lg }}
        />

        <View style={{ height: TAB_BAR_CLEARANCE }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing.md },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    ...Shadow.md,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.primary,
  },
  profileName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  rolePill: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  rolePillAdmin: {
    backgroundColor: Colors.accent,
  },
  rolePillText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
  rolePillTextAdmin: {
    color: Colors.white,
  },
  editProfileBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: { flex: 1 },
  settingLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  settingValue: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  langRow: {
    flexDirection: 'row',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  langBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.inputBg,
  },
  langBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  langFlag: {
    fontSize: 22,
  },
  langLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  langLabelActive: {
    color: Colors.primary,
  },
  langDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
});
