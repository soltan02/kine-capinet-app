import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { supabase, Profile } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, CommonStyles } from '../../constants/theme';
import ScreenHeader from '../../components/ScreenHeader';

export default function EditUserScreen({ route, navigation }: { route: any; navigation: any }) {
  const { user } = route.params as { user: Profile };
  const { t } = useTranslation();
  const currentProfile = useAuthStore((s) => s.profile);

  const [fullName, setFullName] = useState(user.full_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
      Alert.alert(t('common.error'), error.message || t('settings.passwordUpdateFailed'));
    } else {
      Alert.alert(t('common.success'), t('settings.passwordUpdated'));
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <SafeAreaView style={CommonStyles.safeArea} edges={["top"]}>
      <ScreenHeader title={t('settings.editUser')} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.label}>{t('settings.fullName')}</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} autoCapitalize="words" />

          <TouchableOpacity style={styles.saveBtn} onPress={saveName} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>{t('common.save')}</Text>}
          </TouchableOpacity>

          <View style={{ height: Spacing.lg }} />

          <Text style={styles.label}>{isSelf ? t('settings.changeYourPassword') : t('settings.password')}</Text>
          <TextInput style={styles.input} placeholder={t('settings.newPassword')} secureTextEntry value={newPassword} onChangeText={setNewPassword} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder={t('settings.confirmPassword')} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} autoCapitalize="none" />

          {isSelf ? (
            <TouchableOpacity style={styles.saveBtn} onPress={changePasswordSelf} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>{t('settings.changePassword')}</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.saveBtn} onPress={changePasswordForOther} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>{t('settings.changePassword')}</Text>}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.lg, flex: 1 },
  label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.inputBg, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSize.md, color: Colors.textPrimary, borderWidth: 1.5, borderColor: Colors.border, height: 52, marginBottom: Spacing.md },
  saveBtn: { backgroundColor: Colors.primary, height: 52, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', ...Shadow.md },
  saveBtnText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: '700' },
});
