import { supabase, Profile } from './supabase';

// Staff eligible to be assigned as the clinician performing a session —
// therapists (kinés) and admins (an admin can also be the treating
// clinician in smaller clinics). Receptionists never perform sessions.
export async function fetchAssignableStaff(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['therapist', 'admin'])
    .order('full_name', { ascending: true });
  if (error) return [];
  return (data as Profile[]) || [];
}
