-- Real Android push notifications for session reminders — stores each
-- user's Expo push token (own-row updatable, same RLS as the rest of
-- profiles) and marks when a reminder was already sent for an
-- appointment so the dispatch cron doesn't resend on the next tick.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
