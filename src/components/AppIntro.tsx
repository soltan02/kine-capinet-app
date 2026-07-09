import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

const INTRO_DURATION = 500;

// Shown once per cold start, right as the native splash hands off to JS.
// Uses the exact same full-bleed scene as the native splash image (dark bg,
// glowing orb, "Made By Soltan" credit) so the handoff is seamless, then
// gently scales/fades in — this is the "0.5s app intro" animation; the
// native OS splash itself can only ever be a static image, so this
// JS-rendered layer is what actually animates.
export default function AppIntro({ onFinished }: { onFinished: () => void }) {
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;

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
    <Animated.Image
      source={require('../../assets/splash-background.png')}
      style={[styles.background, { transform: [{ scale }], opacity }]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
