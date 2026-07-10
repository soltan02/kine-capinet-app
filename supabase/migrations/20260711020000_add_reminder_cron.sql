-- Dispatches session-reminder pushes every 5 minutes by calling the
-- send-session-reminders edge function via pg_net. The function itself
-- is idempotent (stamps appointments.reminder_sent_at), so an overlapping
-- or retried call is harmless.
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-session-reminders') THEN
    PERFORM cron.schedule(
      'send-session-reminders',
      '*/5 * * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://ttuxuqjefezulbczdtix.supabase.co/functions/v1/send-session-reminders',
        headers := '{"Content-Type": "application/json"}'::jsonb
      );
      $cron$
    );
  END IF;
END $$;
