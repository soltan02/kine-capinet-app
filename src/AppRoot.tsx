import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './lib/supabase';
import { useAuthStore } from './lib/store';
import { initI18n } from './lib/i18n';
import { isLocalModeEnabled, LocalUser } from './lib/localAuth';
import { hasSeenOnboarding, markOnboardingSeen } from './lib/onboarding';
import { Colors, FontSize, Spacing, loadStoredTheme } from './constants/theme';

export default function AppRoot() {
  const { session, loading, setSession, setProfile, setLoading, fetchProfile, localUser, setLocalUser, profile } = useAuthStore();
  const [i18nReady, setI18nReady] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [useLocalAuth, setUseLocalAuth] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  // Screens are required only AFTER the stored theme has been applied, so
  // their module-level StyleSheet.create calls capture the active palette.
  const screens = useMemo(() => {
    if (!themeReady) return null;
    return {
      LoginScreen: require('./screens/auth/LoginScreen').default,
      MainNavigator: require('./navigation/MainNavigator').default,
      OnboardingScreen: require('./screens/onboarding/OnboardingScreen').default,
    };
  }, [themeReady]);

  useEffect(() => {
    let mounted = true;

    loadStoredTheme().finally(() => {
      if (mounted) setThemeReady(true);
    });

    const syncSession = async (nextSession: any) => {
      if (!mounted) return;

      if (nextSession?.user) {
        setSession(nextSession);
        setLoading(true);
        try {
          await fetchProfile(nextSession.user.id);
        } catch (error) {
          console.error('Failed to fetch profile', error);
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      } else {
        if (mounted) {
          setSession(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initI18n()
      .then(() => {
        if (mounted) setI18nReady(true);
      })
      .catch((err) => {
        console.error('Failed to init i18n:', err);
        if (mounted) setStartupError('Failed to initialize app');
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        setLoading(false);
      } else if (session?.user) {
        syncSession(session);
      }
    });

    const initTimeout = setTimeout(async () => {
      if (!mounted) return;
      try {
        const local = await isLocalModeEnabled();
        if (local) {
          if (mounted) {
            setUseLocalAuth(true);
            setLoading(false);
          }
          return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          await syncSession(session);
          setUseLocalAuth(false);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        if (mounted) {
          setLoading(false);
          setUseLocalAuth(false);
        }
      }
    }, 100);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(initTimeout);
    };
  }, []);

  const handleLocalLogin = async (user: LocalUser) => {
    setLocalUser(user);
    setLoading(false);
  };

  const accountId = useLocalAuth ? localUser?.id : profile?.id;
  const accountRole = useLocalAuth ? localUser?.role : profile?.role;

  useEffect(() => {
    if (!accountId) {
      setShowOnboarding(null);
      return;
    }
    let mounted = true;
    hasSeenOnboarding(accountId).then((seen) => {
      if (mounted) setShowOnboarding(!seen);
    });
    return () => { mounted = false; };
  }, [accountId]);

  const handleOnboardingDone = () => {
    if (accountId) markOnboardingSeen(accountId);
    setShowOnboarding(false);
  };

  if (startupError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{startupError}</Text>
        <Text style={styles.errorSubtext}>Please restart the app</Text>
      </View>
    );
  }

  const pendingOnboardingCheck = (useLocalAuth ? !!localUser : !!session) && showOnboarding === null;

  if (loading || !i18nReady || !screens || useLocalAuth === null || pendingOnboardingCheck) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isLoggedIn = useLocalAuth ? !!localUser : !!session;
  const { LoginScreen, MainNavigator, OnboardingScreen } = screens;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          {isLoggedIn ? (
            showOnboarding && accountRole ? (
              <OnboardingScreen role={accountRole} onDone={handleOnboardingDone} />
            ) : (
              <MainNavigator />
            )
          ) : (
            <LoginScreen
              onLoginSuccess={() => {}}
              onLocalLoginSuccess={handleLocalLogin}
              useLocalAuth={useLocalAuth}
            />
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryDark,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryDark,
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  errorSubtext: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
});