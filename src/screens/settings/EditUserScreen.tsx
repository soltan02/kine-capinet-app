import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { supabase, Profile } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';
import { Spacing, CommonStyles, TAB_BAR_CLEARANCE } from '../../constants/theme';
import ScreenHeader from '../../components/ScreenHeader';
import TextField from '../../components/TextField';
import Button from '../../components/Button';

export default function EditUserScreen({ route, navigation }: { route: any; navigation: any }) {
  const { user } = route.params as { user: Profile };
  const { t } = useTranslation();
  const currentProfile = useAuthStore((s) => s.profile);

  const [fullName, setFullName] = useState(user.full_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSelf = currentProfile?.id === user.id;

  const saveName = async () => {
    if (!fullName.trim()) {
      Alert.alert(t('common.error'), t('common.required'));
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', user.id);
    setLoading(false);
    if (error) {
      Alert.alert(t('common.error'), error.message);
    } else {
      Alert.alert(t('common.success'), t('settings.nameUpdated'));
      navigation.goBack();
    }
  };

  const changePasswordSelf = async () => {
    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('settings.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('common.passwordMismatch'));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) Alert.alert(t('common.error'), error.message);
    else Alert.alert(t('common.success'), t('settings.passwordUpdated'));
  };

  // FunctionsHttpError's own .message is a generic wrapper — the real
  // reason is in the (plain-text) response body.
  const realErrorMessage = async (error: any): Promise<string | undefined> => {
    try {
      return await error?.context?.text?.();
    } catch {
      return undefined;
    }
  };

  const changePasswordForOther = async () => {
    if (newPassword.length < 6) {
      Alert.alert(t('common.error'), t('settings.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('common.passwordMismatch'));
      return;
    }
    setLoading(true);
    const { error } = await supabase.functions.invoke('admin-update-password', {
      body: { targetUserId: user.id, newPassword },
    });
    setLoading(false);
    if (error) {
      Alert.alert(t('common.error'), (await realErrorMessage(error)) || error.message || t('settings.passwordUpdateFailed'));
    } else {
      Alert.alert(t('common.success'), t('settings.passwordUpdated'));
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const changeEmail = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert(t('common.error'), t('settings.invalidEmail'));
      return;
    }
    setEmailLoading(true);
    if (isSelf) {
      // Self-service change: Supabase emails a confirmation link to the new
      // address; the change only takes effect once that link is clicked.
      const { error } = await supabase.auth.updateUser({ email: trimmed });
      setEmailLoading(false);
      if (error) {
        Alert.alert(t('common.error'), error.message);
      } else {
        Alert.alert(t('common.success'), t('settings.emailConfirmationSent'));
        setNewEmail('');
      }
      return;
    }
    // Admin changing someone else's email — takes effect immediately, no
    // confirmation link needed (mirrors admin-update-password's pattern).
    const { error } = await supabase.functions.invoke('admin-manage-user', {
      body: { action: 'update_email', targetUserId: user.id, newEmail: trimmed },
    });
    setEmailLoading(false);
    if (error) {
      Alert.alert(t('common.error'), (await realErrorMessage(error)) || error.message || t('settings.emailUpdateFailed'));
    } else {
      Alert.alert(t('common.success'), t('settings.emailUpdated'));
      setNewEmail('');
    }
  };

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={["top"]}>
      <ScreenHeader title={t('settings.editUser')} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
          <TextField label={t('settings.fullName')} value={fullName} onChangeText={setFullName} autoCapitalize="words" />

          <Button title={t('common.save')} onPress={saveName} loading={loading} style={{ marginBottom: Spacing.lg }} />

          <TextField
            label={t('settings.email')}
            placeholder={t('settings.newEmail')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={newEmail}
            onChangeText={setNewEmail}
          />
          <Button title={t('settings.updateEmail')} onPress={changeEmail} loading={emailLoading} style={{ marginBottom: Spacing.lg }} />

          <TextField
            label={isSelf ? t('settings.changeYourPassword') : t('settings.password')}
            placeholder={t('settings.newPassword')}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            autoCapitalize="none"
          />
          <TextField placeholder={t('settings.confirmPassword')} label="" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} autoCapitalize="none" />

          <Button
            title={t('settings.changePassword')}
            onPress={isSelf ? changePasswordSelf : changePasswordForOther}
            loading={loading}
          />
          <View style={{ height: TAB_BAR_CLEARANCE }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg, flex: 1 },
});
