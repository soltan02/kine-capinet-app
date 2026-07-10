import { useWindowDimensions } from 'react-native';

// Single source of truth for every responsive/desktop-vs-mobile decision
// in the app. 1024px matches the common tablet-landscape/small-laptop
// breakpoint — narrower than that keeps the existing mobile phone layout
// untouched.
const DESKTOP_BREAKPOINT = 1024;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  return { isDesktop, width, height };
}
