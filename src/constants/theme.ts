import { Platform, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Theme system ────────────────────────────────────────────
// Two full palettes (light = "Option A" clean blue, dark = slate).
// `Colors` is a mutable object: the stored theme is applied in AppRoot
// BEFORE any screen module is required, so every screen's
// StyleSheet.create picks up the active palette.
export type ThemeMode = 'light' | 'dark';

type StatusBarStyle = 'dark-content' | 'light-content';

const LightColors = {
  // Primary — emerald/teal (Emerald Clinic)
  primary: '#0D9488',
  primaryDark: '#0F766E',
  primaryLight: '#CCFBF1',
  primaryGradientStart: '#0D9488',
  primaryGradientEnd: '#2DD4BF',

  // Accent — brighter teal
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
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  info: '#0EA5E9',
  infoLight: '#E0F2FE',

  // Neutrals (mint / teal-slate)
  white: '#FFFFFF',
  background: '#F0FDFA',
  card: '#FFFFFF',
  border: '#D6E9E4',
  borderLight: '#E7F5F1',
  inputBg: '#F4FBF9',

  // Text (teal-slate)
  textPrimary: '#123B36',
  textSecondary: '#47645E',
  textMuted: '#8CA6A0',
  textInverse: '#FFFFFF',

  // Status badge colors
  scheduled: '#0EA5E9',
  confirmed: '#22C55E',
  completed: '#0D9488',
  cancelled: '#EF4444',
  no_show: '#F59E0B',

  // Payment method colors
  cash: '#22C55E',
  cnam: '#0EA5E9',
  cardPayment: '#8B5CF6',
  other: '#8CA6A0',

  // Tab bar
  tabBar: '#FFFFFF',
  tabBarBorder: '#E7F5F1',
  tabActive: '#0D9488',
  tabInactive: '#9BB5AF',

  // Overlays
  overlay: 'rgba(10,31,28,0.55)',
  overlayLight: 'rgba(13,148,136,0.10)',

  // Read at render time by screens (not captured in StyleSheets)
  statusBarStyle: 'dark-content' as StatusBarStyle,
};

const DarkColors: typeof LightColors = {
  // Primary — bright teal on deep teal-slate
  primary: '#2DD4BF',
  primaryDark: '#0F766E',
  primaryLight: '#123B36',
  primaryGradientStart: '#0F766E',
  primaryGradientEnd: '#2DD4BF',

  accent: '#5EEAD4',
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
  background: '#0A1F1C',
  card: '#11302B',
  border: '#1E4640',
  borderLight: '#183A34',
  inputBg: '#0F2E29',

  textPrimary: '#E7F5F1',
  textSecondary: '#9FBDB7',
  textMuted: '#5F8079',
  textInverse: '#0A1F1C',

  scheduled: '#38BDF8',
  confirmed: '#4ADE80',
  completed: '#2DD4BF',
  cancelled: '#F87171',
  no_show: '#FBBF24',

  cash: '#4ADE80',
  cnam: '#38BDF8',
  cardPayment: '#A78BFA',
  other: '#5F8079',

  tabBar: '#11302B',
  tabBarBorder: '#1E4640',
  tabActive: '#2DD4BF',
  tabInactive: '#5F8079',

  overlay: 'rgba(3,12,10,0.6)',
  overlayLight: 'rgba(94,234,212,0.14)',

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

// ─── Border Radius (rounder, "spa" feel) ─────────────────────
export const BorderRadius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  xxl: 28,
  full: 999,
};

// Clearance for the floating pill tab bar: scroll content adds this as
// bottom padding so nothing hides behind the bar, and the FAB clears it.
export const TAB_BAR_CLEARANCE = 96;

// ─── Shadows — soft, teal-tinted ─────────────────────────────
const SHADOW_TINT = '#0F766E';
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
      borderRadius: BorderRadius.full,
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
      borderRadius: BorderRadius.full,
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
