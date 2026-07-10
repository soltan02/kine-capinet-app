import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/theme';
import { useHover } from '../hooks/useHover';

// Desktop presentation of the main tab bar — a persistent left column
// instead of the mobile floating pill. Swapped in via Tab.Navigator's
// `tabBar` prop (see MainNavigator.tsx) so it drives the exact same
// navigation state as FloatingTabBar; only the chrome differs.
const ROUTE_ICONS: Record<string, [string, string]> = {
  Dashboard: ['home', 'home-outline'],
  Clients: ['people', 'people-outline'],
  Calendar: ['calendar', 'calendar-outline'],
  Billing: ['cash', 'cash-outline'],
  Settings: ['settings', 'settings-outline'],
};

function SidebarRow({ focused, icon, label, onPress }: { focused: boolean; icon: string; label: string; onPress: () => void }) {
  const { hovered, hoverProps } = useHover();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      onPress={onPress}
      style={[
        styles.row,
        focused && styles.rowActive,
        !focused && hovered && styles.rowHovered,
        Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
      ]}
      {...hoverProps}
    >
      <Ionicons name={icon as any} size={20} color={focused ? Colors.white : Colors.textSecondary} />
      <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function SidebarNav({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>AF</Text>
        </View>
        <Text style={styles.brandName}>Cabinet Azzabi Farouk</Text>
      </View>

      <View style={styles.rows}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const [activeIcon, inactiveIcon] = ROUTE_ICONS[route.name] || ['help', 'help-outline'];
          const label = (options.title ?? route.name) as string;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <SidebarRow
              key={route.key}
              focused={focused}
              icon={focused ? activeIcon : inactiveIcon}
              label={label}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    height: '100%',
    backgroundColor: Colors.card,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.sm,
  },
  brandName: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  rows: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 11,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  rowActive: {
    backgroundColor: Colors.primary,
  },
  rowHovered: {
    backgroundColor: Colors.inputBg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  labelActive: {
    color: Colors.white,
  },
});
