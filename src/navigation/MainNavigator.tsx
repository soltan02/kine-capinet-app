import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../lib/permissions';
import { useResponsive } from '../hooks/useResponsive';
import FloatingTabBar from '../components/FloatingTabBar';
import SidebarNav from '../components/SidebarNav';

// Screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import ClientsListScreen from '../screens/clients/ClientsListScreen';
import ClientsSplitScreen from '../screens/clients/ClientsSplitScreen';
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

// On web, @react-navigation/stack's CardContent switches to a "page" layout
// (minHeight: '100%', no flex/overflow containment) whenever the stack fills
// the whole viewport, so document.body can take over scrolling. Expo's web
// template does the opposite (body { overflow: hidden }), since every screen
// here scrolls via its own ScrollView — the two assumptions collide and no
// screen can scroll at all. Forcing the "card" layout (flex:1 + overflow
// hidden, already the native default) restores it; harmless on native, which
// never hits the "page" branch since it depends on `document`.
const stackScreenOptions = {
  headerShown: false,
  cardStyle: { flex: 1, minHeight: 0, overflow: 'hidden' as const },
};

// ─── Clients Stack ────────────────────────────────────────────
// On desktop, the list route renders the side-by-side split view instead
// of the plain list — everything else in the stack (edit/add forms,
// session notes, etc.) is shared and unaffected by the breakpoint.
function ClientsStack() {
  const { isDesktop } = useResponsive();
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="ClientsList" component={isDesktop ? ClientsSplitScreen : ClientsListScreen} />
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
    <Stack.Navigator screenOptions={stackScreenOptions}>
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
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="CalendarHome" component={CalendarScreen} />
      <Stack.Screen name="AddAppointment" component={AddAppointmentScreen} />
      <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
    </Stack.Navigator>
  );
}

// ─── Billing Stack ────────────────────────────────────────────
function BillingStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="BillingHome" component={BillingScreen} />
      <Stack.Screen name="AddPayment" component={AddPaymentScreen} />
    </Stack.Navigator>
  );
}

// ─── Settings Stack ───────────────────────────────────────────
function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
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
  const { isDesktop } = useResponsive();

  const showBilling = can('billing:view');
  const showCalendar = can('appointments:manage');
  const showClients = can('clients:view');
  const showDashboard = can('dashboard:view');
  const initialTab = showDashboard ? 'Dashboard' : showClients ? 'Clients' : showCalendar ? 'Calendar' : showBilling ? 'Billing' : 'Settings';

  return (
    <Tab.Navigator
      initialRouteName={initialTab}
      tabBar={(props) => (isDesktop ? <SidebarNav {...props} /> : <FloatingTabBar {...props} />)}
      screenOptions={{
        headerShown: false,
        tabBarPosition: isDesktop ? 'left' : 'bottom',
      }}
    >
      {showDashboard && <Tab.Screen name="Dashboard" component={DashboardStack} options={{ title: t('tabs.dashboard') }} />}
      {showClients && <Tab.Screen name="Clients" component={ClientsStack} options={{ title: t('tabs.clients') }} />}
      {showCalendar && <Tab.Screen name="Calendar" component={CalendarStack} options={{ title: t('tabs.calendar') }} />}
      {showBilling && <Tab.Screen name="Billing" component={BillingStack} options={{ title: t('tabs.billing') }} />}
      <Tab.Screen name="Settings" component={SettingsStack} options={{ title: t('tabs.settings') }} />
    </Tab.Navigator>
  );
}
