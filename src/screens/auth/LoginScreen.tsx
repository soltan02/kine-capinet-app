import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  StatusBar,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { verifyLocalCredentials, isLocalModeEnabled, enableLocalMode, LocalUser } from '../../lib/localAuth';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '../../constants/theme';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onLocalLoginSuccess?: (user: LocalUser) => void;
  useLocalAuth?: boolean;
}

export default function LoginScreen({ onLoginSuccess, onLocalLoginSuccess, useLocalAuth: forceLocal }: LoginScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const logoAnim = useState(new Animated.Value(0))[0];
  const formAnim = useState(new Animated.Value(0))[0];
  const [localMode, setLocalMode] = useState<boolean | null>(null);

  useEffect(() => {
    const checkLocalMode = async () => {
      if (forceLocal !== undefined) {
        setLocalMode(forceLocal);
      } else {
        const local = await isLocalModeEnabled();
        setLocalMode(local);
      }
    };
    checkLocalMode();
  }, [forceLocal]);

  useEffect(() => {
    if (localMode === null) return;
    Animated.sequence([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(formAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [localMode]);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t('common.required'));
      return;
    }
    setLoading(true);
    setError('');

    try {
      if (localMode) {
        const user = await verifyLocalCredentials(email.trim(), password);
        if (!user) {
          setError(t('auth.loginError'));
        } else {
          onLocalLoginSuccess?.(user);
          onLoginSuccess();
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (authError) {
          if (authError.message?.toLowerCase().includes('email not confirmed')) {
            setError(t('auth.emailNotConfirmed'));
          } else if (authError.message?.toLowerCase().includes('invalid login credentials')) {
            setError(t('auth.loginError'));
          } else {
            setError(authError.message || t('auth.loginError'));
          }
        } else {
          onLoginSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (localMode === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.white} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[Colors.primaryDark, Colors.primary, Colors.primaryGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />

      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <Animated.View
        style={[
          styles.logoSection,
          { paddingTop: insets.top + Spacing.lg },
          {
            opacity: logoAnim,
            transform: [
              {
                translateY: logoAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-30, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <Ionicons name="medical" size={44} color={Colors.white} />
        </View>
        <Text style={styles.welcomeText}>{t('auth.welcome')}</Text>
        <Text style={styles.subtitleText}>{t('auth.subtitle')}</Text>
        <View style={styles.modeSwitch}>
          <Text style={styles.modeLabel}>{t('auth.localMode')}</Text>
          <Switch
            value={localMode}
            onValueChange={async (val) => {
              setLocalMode(val);
              if (val) {
                await enableLocalMode();
              }
            }}
            trackColor={{ false: 'rgba(255,255,255,0.3)', true: Colors.primaryLight }}
            thumbColor={Colors.white}
          />
        </View>
        <Text style={styles.modeHint}>
          {localMode ? t('auth.localModeOn') : t('auth.localModeOff')}
        </Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.formCard,
          { paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.lg },
          {
            opacity: formAnim,
            transform: [
              {
                translateY: formAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{t('auth.email')}</Text>
          <View style={[styles.inputRow, emailFocused && styles.inputRowFocused]}>
            <Ionicons
              name="mail-outline"
              size={20}
              color={emailFocused ? Colors.primary : Colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{t('auth.password')}</Text>
          <View style={[styles.inputRow, passwordFocused && styles.inputRowFocused]}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={passwordFocused ? Colors.primary : Colors.textMuted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleAuth}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.loginButtonText}>{localMode ? t('auth.loginLocal') : t('auth.login')}</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {localMode ? t('auth.localInfo') : t('auth.adminOnlyInfo')}
          </Text>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  gradient: {
    ...StyleSheet.absoluteFill,
  },
  circle1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -80,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: 60,
    left: -60,
  },
  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  welcomeText: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
    letterSpacing: 0.3,
  },
  modeSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  modeLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
  },
  modeHint: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing.xs,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  formCard: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    ...Shadow.lg,
  },
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  inputRowFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    height: 56,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    ...Shadow.lg,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  infoBox: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.inputBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});