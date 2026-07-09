import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Image } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

const INTRO_DURATION = 500;

// Shown once per cold start, right as the native splash hands off to JS.
// Starts close to the native splash's static appearance (same teal bg +
// logo) so the handoff is seamless, then gently scales/fades in — this is
// the "0.5s app intro" animation; the native OS splash itself can only ever
// be a static image, so this JS-rendered layer is what actually animates.
export default function AppIntro({ onFinished }: { onFinished: () => void }) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: INTRO_DURATION, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: INTRO_DURATION * 0.7, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(onFinished, INTRO_DURATION);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../../assets/splash-icon.png')}
        style={[styles.logo, { transform: [{ scale }], opacity }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 180,
    height: 180,
  },
});
