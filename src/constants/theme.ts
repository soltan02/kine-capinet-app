import { Platform, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Theme system ────────────────────────────────────────────
// Two full palettes ("Modern Indigo-Teal" — indigo primary, teal as
// secondary accent, cool neutrals). `Colors` is a mutable object: the
// stored theme is applied in AppRoot BEFORE any screen module is
// required, so every screen's StyleSheet.create picks up the active
// palette.
export type ThemeMode = 'light' | 'dark';

type StatusBarStyle = 'dark-content' | 'light-content';

const LightColors = {
  // Primary — indigo
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryLight: '#E3E4F3',
  primaryGradientStart: '#4F46E5',
  primaryGradientEnd: '#4338CA',

  // Accent — teal (secondary, used for selected states)
  accent: '#14B8A6',
  accentLight: '#CCFBF1',

  // Secondary — warm amber counterpoint
  secondary: '#F59E0B',
  secondaryLight: '#FEF3C7',

  // Semantic
  success: '#22C55E',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#C0362A',
  dangerLight: '#FEE7E5',
  info: '#0EA5E9',
  infoLight: '#E0F2FE',

  // Neutrals (cool indigo-tinted grays)
  white: '#FFFFFF',
  background: '#F4F5FB',
  card: '#FFFFFF',
  border: '#DEDFF0',
  borderLight: '#E9E9F6',
  inputBg: '#F7F7FC',

  // Text (cool graphite)
  textPrimary: '#1B1D2B',
  textSecondary: '#4F5170',
  textMuted: '#8587A6',
  textInverse: '#FFFFFF',

  // Status badge colors
  scheduled: '#0EA5E9',
  confirmed: '#22C55E',
  completed: '#4F46E5',
  cancelled: '#C0362A',
  no_show: '#F59E0B',

  // Payment method colors
  cash: '#22C55E',
  cnam: '#0EA5E9',
  cardPayment: '#8B5CF6',
  other: '#8587A6',

  // Tab bar
  tabBar: '#FFFFFF',
  tabBarBorder: '#E9E9F6',
  tabActive: '#4F46E5',
  tabInactive: '#A6A8C4',

  // Overlays
  overlay: 'rgba(20,20,40,0.55)',
  overlayLight: 'rgba(79,70,229,0.10)',

  // Read at render time by screens (not captured in StyleSheets)
  statusBarStyle: 'dark-content' as StatusBarStyle,
};

const DarkColors: typeof LightColors = {
  // Primary — bright indigo on deep indigo-slate
  primary: '#818CF8',
  primaryDark: '#4338CA',
  primaryLight: '#2A2A4A',
  primaryGradientStart: '#4338CA',
  primaryGradientEnd: '#818CF8',

  accent: '#2DD4BF',
  accentLight: '#123B36',

  secondary: '#FBBF24',
  secondaryLight: '#422006',

  success: '#4ADE80',
  successLight: '#052E16',
  warning: '#FBBF24',
  warningLight: '#451A03',
  danger: '#F87171',
  dangerLight: '#450A0A',
  info: '#38BDF8',
  infoLight: '#0C2A3A',

  white: '#FFFFFF',
  background: '#14141F',
  card: '#1D1D2E',
  border: '#312F4A',
  borderLight: '#28283D',
  inputBg: '#1A1A29',

  textPrimary: '#E7E7F3',
  textSecondary: '#A6A8C4',
  textMuted: '#6B6D8C',
  textInverse: '#14141F',

  scheduled: '#38BDF8',
  confirmed: '#4ADE80',
  completed: '#818CF8',
  cancelled: '#F87171',
  no_show: '#FBBF24',

  cash: '#4ADE80',
  cnam: '#38BDF8',
  cardPayment: '#A78BFA',
  other: '#6B6D8C',

  tabBar: '#1D1D2E',
  tabBarBorder: '#312F4A',
  tabActive: '#818CF8',
  tabInactive: '#6B6D8C',

  overlay: 'rgba(6,6,14,0.6)',
  overlayLight: 'rgba(129,140,248,0.14)',

  statusBarStyle: 'light-content' as StatusBarStyle,
};

export const Colors = { ...LightColors };

// ─── Typography ──────────────────────────────────────────────
export const FontFamily = {
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
};

// Named weight scale — replaces scattered literal '600'/'700'/'800' strings.
export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

// Shared animation durations (ms) so fade-ins/transitions feel consistent
// across screens instead of each one picking its own number.
export const Motion = {
  fast: 150,
  base: 250,
  slow: 400,
};

// ─── Spacing ─────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
};

// ─── Border Radius (rounder, modern-SaaS feel) ───────────────
export const BorderRadius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  full: 999,
};

// Clearance for the floating pill tab bar: scroll content adds this as
// bottom padding so nothing hides behind the bar, and the FAB clears it.
// Generous enough to cover the worst case (large safe-area inset on
// 3-button-nav phones + tab bar height + margin) across any device.
export const TAB_BAR_CLEARANCE = 140;

// ─── Shadows — soft, indigo-tinted ───────────────────────────
const SHADOW_TINT = '#4338CA';
export const Shadow = {
  sm: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 5,
  },
  lg: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 9,
  },
  xl: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 36,
    elevation: 14,
  },
  inner: {
    shadowColor: SHADOW_TINT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 40,
    elevation: Platform.OS === 'android' ? 4 : undefined,
  },
};

// ─── Common Styles ───────────────────────────────────────────
// Built from the mutable `Colors`, and rebuilt by applyTheme() so the
// shared styles follow the active palette too.
const makeCommonStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    safeArea: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    screenPadding: {
      paddingHorizontal: Spacing.md,
    },
    card: {
      backgroundColor: Colors.card,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: Colors.borderLight,
      ...Shadow.sm,
    },
    cardElevated: {
      backgroundColor: Colors.card,
      borderRadius: BorderRadius.xl,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: Colors.borderLight,
      ...Shadow.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    centeredContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    divider: {
      height: 1,
      backgroundColor: Colors.border,
      marginVertical: Spacing.md,
    },
    sectionTitle: {
      fontSize: FontSize.sm,
      fontWeight: '700',
      color: Colors.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: Spacing.sm,
    },
    badge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: BorderRadius.full,
      alignSelf: 'flex-start',
      backgroundColor: Colors.accentLight,
    },
    badgeText: {
      fontSize: FontSize.xs,
      fontWeight: '700',
      color: Colors.accent,
    },
    input: {
      backgroundColor: Colors.inputBg,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: FontSize.md,
      color: Colors.textPrimary,
      borderWidth: 1.5,
      borderColor: Colors.borderLight,
    },
    inputFocused: {
      borderColor: Colors.primary,
    },
    label: {
      fontSize: FontSize.sm,
      fontWeight: '600',
      color: Colors.textSecondary,
      marginBottom: Spacing.xs,
    },
    primaryButton: {
      backgroundColor: Colors.primary,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadow.md,
    },
    primaryButtonText: {
      color: Colors.white,
      fontSize: FontSize.md,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    secondaryButton: {
      backgroundColor: Colors.card,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: Colors.border,
    },
    secondaryButtonText: {
      color: Colors.textPrimary,
      fontSize: FontSize.md,
      fontWeight: '600',
    },
    fab: {
      position: 'absolute',
      bottom: TAB_BAR_CLEARANCE - 8,
      right: Spacing.lg,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: Colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadow.xl,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xxxl,
    },
    emptyStateText: {
      fontSize: FontSize.md,
      color: Colors.textMuted,
      textAlign: 'center',
      marginTop: Spacing.md,
    },
  });

export const CommonStyles = makeCommonStyles();

// ─── Theme switching ─────────────────────────────────────────
const THEME_KEY = 'kine_theme_mode';
let currentTheme: ThemeMode = 'light';

export const getThemeMode = (): ThemeMode => currentTheme;

/** Mutates Colors + CommonStyles in place. Screens required AFTER this
 *  call capture the new palette in their StyleSheets. */
export function applyTheme(mode: ThemeMode) {
  currentTheme = mode;
  Object.assign(Colors, mode === 'dark' ? DarkColors : LightColors);
  Object.assign(CommonStyles, makeCommonStyles());
}

/** Called once at startup, before screen modules are required. */
export async function loadStoredTheme(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(THEME_KEY);
    if (stored === 'dark') applyTheme('dark');
  } catch {
    // Storage unavailable — stay on light theme
  }
}

/** Applies + persists the preference (takes full effect after restart on
 *  native, since already-created StyleSheets keep their captured values). */
export async function persistThemeMode(mode: ThemeMode): Promise<void> {
  applyTheme(mode);
  try {
    await AsyncStorage.setItem(THEME_KEY, mode);
  } catch {
    // Non-fatal
  }
}
