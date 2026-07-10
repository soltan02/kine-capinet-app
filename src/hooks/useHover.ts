import { useState } from 'react';
import { Platform } from 'react-native';

// Mouse-hover state for web — React Native's Touchable* components don't
// expose hover, but they do forward unknown DOM event props through on
// react-native-web, so onMouseEnter/onMouseLeave work there. No-op object
// spread on native (the events just never fire).
export function useHover() {
  const [hovered, setHovered] = useState(false);
  const hoverProps =
    Platform.OS === 'web'
      ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
      : {};
  return { hovered, hoverProps };
}
