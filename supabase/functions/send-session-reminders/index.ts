import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ─── Session reminder push dispatch ───────────────────────────
// Called every 5 minutes by pg_cron (see schema.sql). Finds appointments
// starting within the next 30 minutes (matching useSessionReminders.ts's
// URGENT_WINDOW_MINUTES — a single well-timed push, not the in-app bell's
// earlier 60-minute heads-up too) that haven't been reminded yet, and
// pushes to the assigned staff member's Android device via Expo's push
// service. Web has no push path — only Android tokens get registered
// (src/lib/pushNotifications.ts), so profiles without a push_token are
// silently skipped.

const REMINDER_WINDOW_MINUTES = 30;

// appointments.date/start_time are plain DATE/TIME columns holding the
// clinic's local wall-clock values (Tunisia, UTC+1, no DST) — not UTC.
// The edge runtime's clock is UTC, so comparisons must shift by this fixed
// offset rather than using the runtime's own local time directly.
const TUNISIA_UTC_OFFSET_MS = 60 * 60 * 1000;

serve(async (req: Request) => {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Server not configured' }), { status: 500 });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const nowUtc = new Date();
    // "now" and "today", expressed in the clinic's local wall-clock frame.
    const nowLocal = new Date(nowUtc.getTime() + TUNISIA_UTC_OFFSET_MS);
    const windowEndLocal = new Date(nowLocal.getTime() + REMINDER_WINDOW_MINUTES * 60000);
    const today = nowLocal.toISOString().slice(0, 10);

    // Appointments today (yesterday's date too, in case the reminder window
    // straddles local midnight while UTC hasn't rolled over yet — cheap to
    // just also check yesterday and let the per-row time filter below sort
    // it out), not yet reminded, assigned, not cancelled/completed.
    const yesterday = new Date(nowLocal.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: appointments, error: apptErr } = await admin
      .from('appointments')
      .select('id, date, start_time, assigned_to, status, reminder_sent_at, client_id')
      .in('date', [yesterday, today])
      .not('assigned_to', 'is', null)
      .is('reminder_sent_at', null)
      .not('status', 'in', '(cancelled,completed)');

    if (apptErr) {
      return new Response(JSON.stringify({ error: apptErr.message }), { status: 500 });
    }

    const due = (appointments || []).filter((a: any) => {
      const [h, m] = String(a.start_time).slice(0, 5).split(':').map(Number);
      // Build the appointment's start in the same shifted reference frame as
      // nowLocal — via setUTCHours (not setHours) so this doesn't also
      // depend on the runtime's own local timezone.
      const apptLocal = new Date(`${a.date}T00:00:00.000Z`);
      apptLocal.setUTCHours(h || 0, m || 0, 0, 0);
      return apptLocal.getTime() > nowLocal.getTime() && apptLocal.getTime() <= windowEndLocal.getTime();
    });

    if (due.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const assigneeIds = [...new Set(due.map((a: any) => a.assigned_to))];
    const clientIds = [...new Set(due.map((a: any) => a.client_id))];

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, push_token')
      .in('id', assigneeIds);
    const { data: clients } = await admin
      .from('clients')
      .select('id, first_name, last_name')
      .in('id', clientIds);

    const tokenById = new Map((profiles || []).map((p: any) => [p.id, p.push_token]));
    const clientById = new Map((clients || []).map((c: any) => [c.id, c]));

    const messages: Array<{ to: string; title: string; body: string }> = [];
    const sentIds: string[] = [];

    for (const appt of due) {
      const token = tokenById.get(appt.assigned_to);
      if (!token) continue;
      const client = clientById.get(appt.client_id);
      const clientName = client ? `${client.first_name} ${client.last_name}` : 'Patient';
      const time = String(appt.start_time).slice(0, 5);
      messages.push({
        to: token,
        title: 'Séance à venir',
        body: `${clientName} à ${time}`,
      });
      sentIds.push(appt.id);
    }

    if (messages.length > 0) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(messages),
      });
    }

    if (sentIds.length > 0) {
      await admin.from('appointments').update({ reminder_sent_at: new Date().toISOString() }).in('id', sentIds);
    }

    return new Response(JSON.stringify({ sent: sentIds.length }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
});
