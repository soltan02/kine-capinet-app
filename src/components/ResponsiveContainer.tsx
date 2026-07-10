import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

const DESKTOP_MAX_WIDTH = 1280;

// Centers content with a sensible max-width on desktop so long lines and
// cards don't stretch edge-to-edge on an ultra-wide monitor. Pure
// passthrough on mobile (no extra View, no layout change at all) — wrap
// a screen's main scrollable content with this, not the whole screen
// (header/tab bar stay full-width).
export default function ResponsiveContainer({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { isDesktop } = useResponsive();
  if (!isDesktop) return <>{children}</>;
  return <View style={[{ flex: 1, width: '100%', maxWidth: DESKTOP_MAX_WIDTH, alignSelf: 'center' }, style]}>{children}</View>;
}
