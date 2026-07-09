import React from 'react';
import { View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, Shadow, BorderRadius } from '../constants/theme';
import { usePermissions } from '../lib/permissions';

// Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ClientsListScreen from '../screens/clients/ClientsListScreen';
import ClientDetailScreen from '../screens/clients/ClientDetailScreen';
import AddEditClientScreen from '../screens/clients/AddEditClientScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import BillingScreen from '../screens/billing/BillingScreen';
import AddPaymentScreen from '../screens/billing/AddPaymentScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import AddSessionNoteScreen from '../screens/sessions/AddSessionNoteScreen';
import AddAppointmentScreen from '../screens/appointments/AddAppointmentScreen';
import AppointmentDetailScreen from '../screens/appointments/AppointmentDetail';
import UserManagementScreen from '../screens/settings/UserManagementScreen';
import AuditLogScreen from '../screens/settings/AuditLogScreen';
import AddUserScreen from '../screens/settings/AddUserScreen';
import EditUserScreen from '../screens/settings/EditUserScreen';
import PatientAnalysisScreen from '../screens/clients/PatientAnalysisScreen';
import BackupsScreen from '../screens/settings/BackupsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Clients Stack ────────────────────────────────────────────
function ClientsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientsList" component={ClientsListScreen} />
      <Stack.Screen name="ClientDetail" component={ClientDetailScreen} />
      <Stack.Screen name="AddClient" component={AddEditClientScreen} />
      <Stack.Screen name="AddSessionNote" component={AddSessionNoteScreen} />
      <Stack.Screen name="AddPayment" component={AddPaymentScreen} />
      <Stack.Screen name="AddAppointment" component={AddAppointmentScreen} />
      <Stack.Screen name="PatientAnalysis" component={PatientAnalysisScreen} />
    </Stack.Navigator>
  );
}

// ─── Dashboard Stack ──────────────────────────────────────────
function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome" component={DashboardScreen} />
      <Stack.Screen name="AddClient" component={AddEditClientScreen} />
      <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
      <Stack.Screen name="AddAppointment" component={AddAppointmentScreen} />
    </Stack.Navigator>
  );
}

// ─── Calendar Stack ───────────────────────────────────────────
function CalendarStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CalendarHome" component={CalendarScreen} />
      <Stack.Screen name="AddAppointment" component={AddAppointmentScreen} />
      <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
    </Stack.Navigator>
  );
}

// ─── Billing Stack ────────────────────────────────────────────
function BillingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BillingHome" component={BillingScreen} />
      <Stack.Screen name="AddPayment" component={AddPaymentScreen} />
    </Stack.Navigator>
  );
}

// ─── Settings Stack ───────────────────────────────────────────
function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsHome" component={SettingsScreen} />
      <Stack.Screen name="UserManagement" component={UserManagementScreen} />
      <Stack.Screen name="AuditLogScreen" component={AuditLogScreen} />
      <Stack.Screen name="AddUser" component={AddUserScreen} />
      <Stack.Screen name="EditUser" component={EditUserScreen} />
      <Stack.Screen name="Backups" component={BackupsScreen} />
    </Stack.Navigator>
  );
}

// ─── Main Tab Navigator ───────────────────────────────────────
export default function MainNavigator() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const insets = useSafeAreaInsets();
  // Devices with a persistent 3-button nav bar report a larger bottom inset
  // than gesture-nav devices — add it to the fixed offset so the floating
  // tab bar clears the system bar on every phone, instead of a fixed value
  // that only works when the inset is near zero.
  const tabBarBottom = insets.bottom + (Platform.OS === 'ios' ? 16 : 10);

  const showBilling = can('billing:view');
  const showCalendar = can('appointments:manage');
  const showClients = can('clients:view');
  const showDashboard = can('dashboard:view');
  const initialTab = showDashboard ? 'Dashboard' : showClients ? 'Clients' : showCalendar ? 'Calendar' : showBilling ? 'Billing' : 'Settings';

  return (
    <Tab.Navigator
      initialRouteName={initialTab}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: tabBarBottom,
          height: 64,
          borderRadius: BorderRadius.full,
          backgroundColor: Colors.tabBar,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: Colors.tabBarBorder,
          paddingBottom: 0,
          paddingTop: 0,
          ...Shadow.lg,
        },
        tabBarItemStyle: {
          paddingVertical: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginBottom: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [string, string]> = {
            Dashboard: ['home', 'home-outline'],
            Clients: ['people', 'people-outline'],
            Calendar: ['calendar', 'calendar-outline'],
            Billing: ['cash', 'cash-outline'],
            Settings: ['settings', 'settings-outline'],
          };
          const [activeIcon, inactiveIcon] = icons[route.name] || ['help', 'help-outline'];
          return <Ionicons name={(focused ? activeIcon : inactiveIcon) as any} size={size} color={color} />;
        },
      })}
    >
      {showDashboard && <Tab.Screen name="Dashboard" component={DashboardStack} options={{ title: t('tabs.dashboard') }} />}
      {showClients && <Tab.Screen name="Clients" component={ClientsStack} options={{ title: t('tabs.clients') }} />}
      {showCalendar && <Tab.Screen name="Calendar" component={CalendarStack} options={{ title: t('tabs.calendar') }} />}
      {showBilling && <Tab.Screen name="Billing" component={BillingStack} options={{ title: t('tabs.billing') }} />}
      <Tab.Screen name="Settings" component={SettingsStack} options={{ title: t('tabs.settings') }} />
    </Tab.Navigator>
  );
}
