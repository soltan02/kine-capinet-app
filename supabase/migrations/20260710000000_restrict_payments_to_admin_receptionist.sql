-- Kinés (therapist role) should not see or manage billing at all.
-- Removes 'therapist' from all four payments RLS policies, leaving
-- admin + receptionist only. Matches supabase/schema.sql (source of truth).

DROP POLICY IF EXISTS payments_select ON payments;
CREATE POLICY payments_select ON payments
  FOR SELECT USING ((SELECT public.current_user_role()) IN ('admin', 'receptionist'));

DROP POLICY IF EXISTS payments_insert ON payments;
CREATE POLICY payments_insert ON payments
  FOR INSERT WITH CHECK ((SELECT public.current_user_role()) IN ('admin', 'receptionist'));

DROP POLICY IF EXISTS payments_update ON payments;
CREATE POLICY payments_update ON payments
  FOR UPDATE
  USING ((SELECT public.current_user_role()) IN ('admin', 'receptionist'))
  WITH CHECK ((SELECT public.current_user_role()) IN ('admin', 'receptionist'));

DROP POLICY IF EXISTS payments_delete ON payments;
CREATE POLICY payments_delete ON payments
  FOR DELETE USING ((SELECT public.current_user_role()) IN ('admin', 'receptionist'));
