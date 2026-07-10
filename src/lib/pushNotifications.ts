import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// ─── Android push notification registration ──────────────────
// Real OS-level push (shows in the system tray even with the app closed
// or the phone locked), scoped to Android only — the web app keeps the
// existing in-app-only reminder bell (useSessionReminders.ts).
// Dispatch happens server-side (send-session-reminders edge function +
// pg_cron), which POSTs to Expo's push endpoint using the token returned
// here.

// Foreground behavior: still show a system notification/alert even while
// the app is open, matching how most apps behave (not just relying on
// the in-app bell while foregrounded).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Requests notification permission (the standard OS prompt) and returns
 *  an Expo push token, or null if denied/unavailable/not on a real device. */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  if (!Device.isDevice) return null; // push tokens aren't available on emulators/simulators

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return token;
  } catch {
    return null;
  }
}
