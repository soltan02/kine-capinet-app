-- ============================================================
-- KINESITHERAPY CABINET APP — Advanced Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'therapist', 'receptionist', 'staff')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- CLIENTS (patients)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  address TEXT,
  diagnosis TEXT,
  medical_history TEXT,
  contraindications TEXT,   -- New clinical safety field
  treatment_goals TEXT,      -- New goals tracking
  sessions_prescribed INT DEFAULT 10,
  cnam_number TEXT,
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES profiles(id),
  room_number TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 45,
  type TEXT NOT NULL DEFAULT 'session' CHECK (type IN ('initial', 'session', 'assessment', 'discharge')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- CLINICAL SESSION TRACKING
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  therapist_id UUID REFERENCES profiles(id),
  pain_before INT CHECK (pain_before BETWEEN 0 AND 10),
  pain_after INT CHECK (pain_after BETWEEN 0 AND 10),
  
  -- Treatment templates checkboxes
  electrotherapy BOOLEAN DEFAULT FALSE,
  manual_therapy BOOLEAN DEFAULT FALSE,
  exercises BOOLEAN DEFAULT FALSE,
  stretching BOOLEAN DEFAULT FALSE,
  
  treatment_details TEXT,
  therapist_notes TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- STAFF ACTIVITY & AUDIT LOGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- BILLING / PACKAGES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  amount DECIMAL(10,3) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'cnam', 'card', 'other')),
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'partial')),
  cnam_reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COLUMN MIGRATIONS — self-healing for databases created before
-- these columns existed. `CREATE TABLE IF NOT EXISTS` above does NOT
-- add new columns to an already-existing table, so add them explicitly.
-- ============================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contraindications TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS treatment_goals TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sessions_prescribed INT DEFAULT 10;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS room_number TEXT;

-- ============================================================
-- INDEXES — match the actual query patterns used by the app
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(date, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_client_date ON appointments(client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to ON appointments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_session_logs_client_started ON session_logs(client_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_client_paid ON payments(client_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_last_name ON clients(last_name);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);

-- ============================================================
-- Allow the 'waived' payment status (already used by translations,
-- not previously allowed by the DB)
-- ============================================================
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('paid', 'pending', 'partial', 'waived'));

-- ============================================================
-- Drop the unused 'staff' role — only admin / therapist / receptionist
-- remain. Safety check: run this SELECT first and migrate any rows
-- it returns (e.g. to 'receptionist') before applying the rest of this
-- file, otherwise those accounts lose all access once RLS is enabled:
--
--   SELECT id, full_name, role FROM profiles WHERE role = 'staff';
-- ============================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'therapist', 'receptionist'));
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'receptionist';

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Drop legacy permissive policies from the initial schema. These grant
-- "auth.role() = authenticated" full access and, because RLS policies are
-- OR'd, they SILENTLY DEFEAT every restrictive policy below (a therapist
-- could create payments; any user could escalate their own role to admin).
-- Must be dropped for the role-scoped policies to actually take effect.
DROP POLICY IF EXISTS "Authenticated users can do all on clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can do all on appointments" ON appointments;
DROP POLICY IF EXISTS "Authenticated users can do all on payments" ON payments;
DROP POLICY IF EXISTS "Authenticated users can do all on session_notes" ON session_notes;
DROP POLICY IF EXISTS "Authenticated users can do all on session_logs" ON session_logs;
DROP POLICY IF EXISTS "Authenticated users can do all on audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- SECURITY DEFINER helper: reads the caller's own role while bypassing
-- RLS internally, so policies on `profiles` can check "is the caller an
-- admin?" without recursively re-triggering profiles' own RLS.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- ─── profiles ──────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_select_admin ON profiles;
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT USING ((SELECT public.current_user_role()) = 'admin');

-- Self-provisioning fallback (src/lib/store.ts fetchProfile) — cannot
-- self-grant admin.
DROP POLICY IF EXISTS profiles_insert_self ON profiles;
CREATE POLICY profiles_insert_self ON profiles
  FOR INSERT WITH CHECK (
    id = auth.uid() AND role IN ('therapist', 'receptionist')
  );

DROP POLICY IF EXISTS profiles_insert_admin ON profiles;
CREATE POLICY profiles_insert_admin ON profiles
  FOR INSERT WITH CHECK ((SELECT public.current_user_role()) = 'admin');

-- Self can edit own row but role must stay unchanged (blocks
-- self-escalation to admin).
DROP POLICY IF EXISTS profiles_update_self ON profiles;
CREATE POLICY profiles_update_self ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT public.current_user_role()));

DROP POLICY IF EXISTS profiles_update_admin ON profiles;
CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE
  USING ((SELECT public.current_user_role()) = 'admin')
  WITH CHECK ((SELECT public.current_user_role()) = 'admin');

DROP POLICY IF EXISTS profiles_delete_admin ON profiles;
CREATE POLICY profiles_delete_admin ON profiles
  FOR DELETE USING ((SELECT public.current_user_role()) = 'admin');

-- ─── clients ───────────────────────────────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clients_select ON clients;
CREATE POLICY clients_select ON clients
  FOR SELECT USING ((SELECT public.current_user_role()) IN ('admin', 'therapist', 'receptionist'));

DROP POLICY IF EXISTS clients_insert ON clients;
CREATE POLICY clients_insert ON clients
  FOR INSERT WITH CHECK ((SELECT public.current_user_role()) IN ('admin', 'therapist', 'receptionist'));

DROP POLICY IF EXISTS clients_update ON clients;
CREATE POLICY clients_update ON clients
  FOR UPDATE
  USING ((SELECT public.current_user_role()) IN ('admin', 'therapist', 'receptionist'))
  WITH CHECK ((SELECT public.current_user_role()) IN ('admin', 'therapist', 'receptionist'));

DROP POLICY IF EXISTS clients_delete ON clients;
CREATE POLICY clients_delete ON clients
  FOR DELETE USING ((SELECT public.current_user_role()) IN ('admin', 'therapist', 'receptionist'));

-- ─── appointments ──────────────────────────────────────────
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointments_select ON appointments;
CREATE POLICY appointments_select ON appointments
  FOR SELECT USING ((SELECT public.current_user_role()) IN ('admin', 'therapist', 'receptionist'));

DROP POLICY IF EXISTS appointments_insert ON appointments;
CREATE POLICY appointments_insert ON appointments
  FOR INSERT WITH CHECK ((SELECT public.current_user_role()) IN ('admin', 'therapist', 'receptionist'));

DROP POLICY IF EXISTS appointments_update ON appointments;
CREATE POLICY appointments_update ON appointments
  FOR UPDATE
  USING ((SELECT public.current_user_role()) IN ('admin', 'therapist', 'receptionist'))
  WITH CHECK ((SELECT public.current_user_role()) IN ('admin', 'therapist', 'receptionist'));

DROP POLICY IF EXISTS appointments_delete ON appointments;
CREATE POLICY appointments_delete ON appointments
  FOR DELETE USING ((SELECT public.current_user_role()) IN ('admin', 'therapist', 'receptionist'));

-- ─── session_logs — clinical notes: admin + therapist only ─
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS session_logs_select ON session_logs;
CREATE POLICY session_logs_select ON session_logs
  FOR SELECT USING ((SELECT public.current_user_role()) IN ('admin', 'therapist'));

DROP POLICY IF EXISTS session_logs_insert ON session_logs;
CREATE POLICY session_logs_insert ON session_logs
  FOR INSERT WITH CHECK (
    (SELECT public.current_user_role()) = 'admin'
    OR ((SELECT public.current_user_role()) = 'therapist' AND therapist_id = auth.uid())
  );

DROP POLICY IF EXISTS session_logs_update ON session_logs;
CREATE POLICY session_logs_update ON session_logs
  FOR UPDATE
  USING (
    (SELECT public.current_user_role()) = 'admin'
    OR ((SELECT public.current_user_role()) = 'therapist' AND therapist_id = auth.uid())
  )
  WITH CHECK (
    (SELECT public.current_user_role()) = 'admin'
    OR ((SELECT public.current_user_role()) = 'therapist' AND therapist_id = auth.uid())
  );

DROP POLICY IF EXISTS session_logs_delete ON session_logs;
CREATE POLICY session_logs_delete ON session_logs
  FOR DELETE USING (
    (SELECT public.current_user_role()) = 'admin'
    OR ((SELECT public.current_user_role()) = 'therapist' AND therapist_id = auth.uid())
  );

-- ─── payments — all 3 roles can manage; totals/reports admin-only in-app ──
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_select ON payments;
CREATE POLICY payments_select ON payments
  FOR SELECT USING ((SELECT public.current_user_role()) IN ('admin', 'therapist', 'receptionist'));

DROP POLICY IF EXISTS payments_insert ON payments;
CREATE POLICY payments_insert ON payments
  FOR INSERT WITH CHECK ((SELECT public.current_user_role()) IN ('admin', 'therapist', 'receptionist'));

DROP POLICY IF EXISTS payments_update ON payments;
CREATE POLICY payments_update ON payments
  FOR UPDATE
  USING ((SELECT public.current_user_role()) IN ('admin', 'therapist', 'receptionist'))
  WITH CHECK ((SELECT public.current_user_role()) IN ('admin', 'therapist', 'receptionist'));

DROP POLICY IF EXISTS payments_delete ON payments;
CREATE POLICY payments_delete ON payments
  FOR DELETE USING ((SELECT public.current_user_role()) IN ('admin', 'therapist', 'receptionist'));

-- ─── audit_logs — write-your-own, admin-only read, immutable ─
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT WITH CHECK (
    (SELECT public.current_user_role()) IN ('admin', 'therapist', 'receptionist')
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS audit_logs_select ON audit_logs;
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT USING ((SELECT public.current_user_role()) = 'admin');

-- ============================================================
-- APPOINTMENT DOUBLE-BOOKING GUARD (server-side backstop)
-- Blocks overlapping appointments for the same therapist or the same
-- patient on the same day. The app also pre-checks client-side for a
-- friendly message; this trigger is the hard guarantee against races.
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_appointment_conflict()
RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
DECLARE
  new_end time := NEW.start_time + make_interval(mins => NEW.duration_minutes);
  conflicts int;
BEGIN
  IF NEW.status = 'cancelled' THEN RETURN NEW; END IF;
  SELECT count(*) INTO conflicts FROM appointments a
  WHERE a.id <> NEW.id
    AND a.date = NEW.date
    AND a.status <> 'cancelled'
    AND ((a.assigned_to IS NOT NULL AND a.assigned_to = NEW.assigned_to) OR a.client_id = NEW.client_id)
    AND NEW.start_time < (a.start_time + make_interval(mins => a.duration_minutes))
    AND a.start_time < new_end;
  IF conflicts > 0 THEN
    RAISE EXCEPTION 'appointment_conflict' USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_appointment_conflict ON appointments;
CREATE TRIGGER trg_appointment_conflict
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION public.check_appointment_conflict();

-- ============================================================
-- STORAGE — patient documents (private bucket)
-- Bucket 'client-documents' is created via the Storage API (not SQL):
--   POST /storage/v1/bucket {"id":"client-documents","public":false}
-- Files are medical → private; the app opens them via short-lived signed URLs.
-- Access restricted to admin + therapist (kiné), like clinical session notes.
-- ============================================================
DROP POLICY IF EXISTS client_docs_select ON storage.objects;
CREATE POLICY client_docs_select ON storage.objects
  FOR SELECT USING (bucket_id = 'client-documents' AND (SELECT public.current_user_role()) IN ('admin','therapist'));
DROP POLICY IF EXISTS client_docs_insert ON storage.objects;
CREATE POLICY client_docs_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'client-documents' AND (SELECT public.current_user_role()) IN ('admin','therapist'));
DROP POLICY IF EXISTS client_docs_update ON storage.objects;
CREATE POLICY client_docs_update ON storage.objects
  FOR UPDATE USING (bucket_id = 'client-documents' AND (SELECT public.current_user_role()) IN ('admin','therapist'));
DROP POLICY IF EXISTS client_docs_delete ON storage.objects;
CREATE POLICY client_docs_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'client-documents' AND (SELECT public.current_user_role()) IN ('admin','therapist'));

-- ============================================================
-- BACKUPS — automated weekly snapshot + on-demand admin export
-- Row-level JSON export of clients/appointments/session_logs/payments.
-- NOT a substitute for full Postgres point-in-time recovery (Supabase
-- Pro plan feature) — this is for "get my data out" / undo-by-hand.
-- Requires the pg_cron extension enabled once via
-- Dashboard → Database → Extensions (or CREATE EXTENSION IF NOT EXISTS pg_cron;).
-- ============================================================
CREATE TABLE IF NOT EXISTS public.data_backups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB NOT NULL
);

ALTER TABLE public.data_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read backups" ON public.data_backups;
CREATE POLICY "Admin can read backups" ON public.data_backups
  FOR SELECT USING ((SELECT public.current_user_role()) = 'admin');
-- No INSERT/UPDATE/DELETE policy for any authenticated role —
-- writes only happen via the SECURITY DEFINER function below.

CREATE OR REPLACE FUNCTION public.create_data_backup()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF (SELECT public.current_user_role()) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admin can create a backup';
  END IF;

  INSERT INTO public.data_backups (payload)
  VALUES (jsonb_build_object(
    'generated_at', NOW(),
    'clients', (SELECT jsonb_agg(to_jsonb(c)) FROM public.clients c),
    'appointments', (SELECT jsonb_agg(to_jsonb(a)) FROM public.appointments a),
    'session_logs', (SELECT jsonb_agg(to_jsonb(s)) FROM public.session_logs s),
    'payments', (SELECT jsonb_agg(to_jsonb(p)) FROM public.payments p)
  ))
  RETURNING id INTO new_id;

  -- Keep only the last 12 snapshots
  DELETE FROM public.data_backups
  WHERE id NOT IN (SELECT id FROM public.data_backups ORDER BY created_at DESC LIMIT 12);

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_data_backup() TO authenticated;

-- Weekly automatic snapshot, Sunday 03:00 UTC. The cron job runs as the
-- database owner (not as `authenticated`), so it bypasses the admin check
-- inside create_data_backup() above by design.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-clinic-backup') THEN
    PERFORM cron.schedule('weekly-clinic-backup', '0 3 * * 0', $cron$SELECT public.create_data_backup();$cron$);
  END IF;
END $$;
