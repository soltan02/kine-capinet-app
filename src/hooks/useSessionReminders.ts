import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '../lib/alert';
import { useAppointmentsStore, useAuthStore } from '../lib/store';
import { Appointment } from '../lib/supabase';

export interface SessionReminder {
  appointment: Appointment;
  minutesUntil: number;
  urgent: boolean; // within 30 minutes, vs. the wider 60-minute heads-up
}

const REMINDER_WINDOW_MINUTES = 60;
const URGENT_WINDOW_MINUTES = 30;
const POLL_INTERVAL_MS = 30_000;

function appointmentStart(appointment: Appointment): Date {
  // date is 'YYYY-MM-DD', start_time is 'HH:MM:SS' — combine into a local Date.
  const [h, m] = appointment.start_time.slice(0, 5).split(':').map(Number);
  const d = new Date(`${appointment.date}T00:00:00`);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

// Client-side "is my assigned session coming up" detector — polls the
// appointments already loaded in the store (whichever screen fetched them)
// and compares each assigned-to-me appointment's start time against now.
// This is a lightweight in-app notification, not an OS push notification —
// it only fires while the app is open. Real push reminders (working even
// when the app is closed) are a separate, larger piece of work.
export function useSessionReminders() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const { appointments } = useAppointmentsStore();
  const [reminders, setReminders] = useState<SessionReminder[]>([]);
  // Tracks which (appointment, threshold) pairs already triggered a one-time
  // alert, so crossing into the 60-min window doesn't re-alert every poll.
  const alertedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const compute = () => {
      const myId = profile?.id;
      if (!myId) {
        setReminders([]);
        return;
      }
      const now = new Date();
      const list: SessionReminder[] = [];

      for (const appt of appointments) {
        if (appt.assigned_to !== myId) continue;
        if (appt.status === 'cancelled' || appt.status === 'completed') continue;
        const start = appointmentStart(appt);
        const minutesUntil = (start.getTime() - now.getTime()) / 60000;
        if (minutesUntil <= 0 || minutesUntil > REMINDER_WINDOW_MINUTES) continue;

        const urgent = minutesUntil <= URGENT_WINDOW_MINUTES;
        list.push({ appointment: appt, minutesUntil, urgent });

        const clientName = appt.client ? `${appt.client.first_name} ${appt.client.last_name}` : t('common.patient');
        const minutes = Math.max(1, Math.round(minutesUntil));
        const key60 = `${appt.id}-60`;
        const key30 = `${appt.id}-30`;
        if (!alertedRef.current.has(key60)) {
          alertedRef.current.add(key60);
          Alert.alert(t('dashboard.reminderTitle'), t('dashboard.reminderMessage', { name: clientName, minutes }));
        } else if (urgent && !alertedRef.current.has(key30)) {
          alertedRef.current.add(key30);
          Alert.alert(t('dashboard.reminderTitle'), t('dashboard.reminderMessage', { name: clientName, minutes }));
        }
      }

      list.sort((a, b) => a.minutesUntil - b.minutesUntil);
      setReminders(list);
    };

    compute();
    const interval = setInterval(compute, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [appointments, profile?.id, t]);

  return reminders;
}
