import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/theme';

interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel?: string;
}

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: HeaderAction[];
  variant?: 'solid' | 'overlay';
}

export default function ScreenHeader({ title, subtitle, onBack, actions = [], variant = 'solid' }: ScreenHeaderProps) {
  return (
    <View style={[styles.header, variant === 'overlay' && styles.headerOverlay]}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={[styles.iconBtn, variant === 'overlay' && styles.iconBtnOverlay]} accessibilityLabel="Retour">
          <Ionicons name="arrow-back" size={22} color={variant === 'overlay' ? Colors.white : Colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtnSpacer} />
      )}

      <View style={styles.titleWrap}>
        {title ? (
          <Text style={[styles.title, variant === 'overlay' && styles.titleOverlay]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={[styles.subtitle, variant === 'overlay' && styles.subtitleOverlay]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        {actions.map((action, i) => (
          <TouchableOpacity
            key={i}
            onPress={action.onPress}
            style={[styles.iconBtn, variant === 'overlay' && styles.iconBtnOverlay]}
            accessibilityLabel={action.accessibilityLabel}
          >
            <Ionicons name={action.icon} size={20} color={variant === 'overlay' ? Colors.white : Colors.primary} />
          </TouchableOpacity>
        ))}
        {actions.length === 0 && !onBack ? <View style={styles.iconBtnSpacer} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Spacing.xl,
    backgroundColor: 'transparent',
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0,
  },
  titleOverlay: {
    color: Colors.white,
    fontSize: FontSize.lg,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  subtitleOverlay: {
    color: 'rgba(255,255,255,0.85)',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
  },
  iconBtnSpacer: {
    width: 44,
    height: 44,
  },
  iconBtnOverlay: {
    backgroundColor: Colors.overlay,
  },
});
