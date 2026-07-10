import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Shadow, BorderRadius } from '../constants/theme';

// Mobile presentation of the main tab bar — the floating pill, unchanged
// from the previous built-in behavior. Extracted into its own component
// so MainNavigator can swap it for SidebarNav on desktop widths via the
// Tab.Navigator's `tabBar` render prop, without touching any route/state
// logic (both bars drive the exact same navigation object).
const ROUTE_ICONS: Record<string, [string, string]> = {
  Dashboard: ['home', 'home-outline'],
  Clients: ['people', 'people-outline'],
  Calendar: ['calendar', 'calendar-outline'],
  Billing: ['cash', 'cash-outline'],
  Settings: ['settings', 'settings-outline'],
};

export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom + (Platform.OS === 'ios' ? 16 : 10);

  return (
    <View style={[styles.bar, { bottom }]}>
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
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.item}
          >
            <Ionicons name={(focused ? activeIcon : inactiveIcon) as any} size={22} color={focused ? Colors.tabActive : Colors.tabInactive} />
            <Text style={[styles.label, { color: focused ? Colors.tabActive : Colors.tabInactive }]} numberOfLines={1}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 64,
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.tabBar,
    borderWidth: 1,
    borderColor: Colors.tabBarBorder,
    ...Shadow.lg,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
