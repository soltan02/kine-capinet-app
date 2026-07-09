import React, { useEffect } from 'react';
import { View, Image, Text, ActivityIndicator, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

const INTRO_DURATION = 400;
const DARK_BG = '#010605';
const TEAL_LIGHT = '#2DD4BF';

// Shown once per cold start, right as the native splash hands off to JS.
// Android's native splash can only ever show a small icon on a solid color
// (a hard OS limit, not something a config can change) — so instead of
// revealing a different, bigger scene after it (which read as two separate
// screens popping one after another), this renders the SAME icon in the
// same spot on the same background, and just adds a loading spinner. The
// whole thing reads as one continuous "loading the app" screen.
export default function AppIntro({ onFinished }: { onFinished: () => void }) {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    const timer = setTimeout(onFinished, INTRO_DURATION);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/splash-icon.png')} style={styles.icon} resizeMode="contain" />
      <ActivityIndicator size="small" color={TEAL_LIGHT} style={styles.spinner} />
      <Text style={styles.credit}>
        Made By <Text style={styles.creditAccent}>Soltan</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 160,
    height: 160,
  },
  spinner: {
    marginTop: 28,
  },
  credit: {
    position: 'absolute',
    bottom: 48,
    fontSize: 15,
    fontWeight: '600',
    color: '#EAF6F4',
  },
  creditAccent: {
    color: TEAL_LIGHT,
  },
});
