import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Backend configuration ────────────────────────────────────
// A single-clinic dev/demo build can set these in .env (unchanged
// behavior). A generic, sellable build ships with these blank, and the
// clinic's own backend is configured at runtime — see clinicConfig.ts —
// so one app build/Play Store listing can serve any clinic.
let currentUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
let currentAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

function buildClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder-anon-key', {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

// Reassignable singleton — reassigning this from initSupabase() is visible
// to every other module's `import { supabase }` via ES module live bindings,
// so no call site elsewhere needs to change.
export let supabase = buildClient(currentUrl, currentAnonKey);

/** True once real backend credentials are in place (from .env or a saved clinic config). */
export function hasBackendConfig(): boolean {
  return !!(currentUrl && currentAnonKey);
}

/** Points the app at a different Supabase project at runtime (used by clinicConfig.ts). */
export function initSupabase(url: string, anonKey: string) {
  currentUrl = url;
  currentAnonKey = anonKey;
  supabase = buildClient(url, anonKey);
}

// ─── Type definitions ─────────────────────────────────────────
export type UserRole = 'admin' | 'therapist' | 'receptionist';

export type Profile = {
  id: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  push_token?: string;
  created_at: string;
};

export type ClientAttachment = {
  id: string;
  name: string;
  path?: string;   // storage key in the 'client-documents' bucket
  mime?: string;
  size?: number;
  url?: string;    // legacy: externally-pasted link (pre-upload entries)
  notes?: string;
  uploaded_at: string;
};

export type Client = {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female';
  address?: string;
  diagnosis?: string;
  medical_history?: string;
  contraindications?: string;
  treatment_goals?: string;
  sessions_prescribed?: number;
  cnam_number?: string;
  notes?: string;
  attachments?: ClientAttachment[];
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
// 'initial'/'session'/'assessment'/'discharge' are kept for backward
// compatibility with existing records; the booking picker only offers the
// clinic's actual services (fracture_surgery..relaxation_massage below).
export type AppointmentType =
  | 'initial'
  | 'session'
  | 'assessment'
  | 'discharge'
  | 'fracture_surgery'
  | 'joint_muscle_pain'
  | 'acupuncture'
  | 'cupping'
  | 'leech_therapy'
  | 'bloodletting'
  | 'relaxation_massage';

export type Appointment = {
  id: string;
  client_id: string;
  assigned_to?: string;
  room_number?: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // joined
  client?: Client;
  profile?: Profile; // the assigned staff member (assigned_to), when joined
};

export type SessionLog = {
  id: string;
  client_id: string;
  appointment_id?: string;
  therapist_id?: string;
  pain_before?: number;
  pain_after?: number;
  electrotherapy: boolean;
  manual_therapy: boolean;
  exercises: boolean;
  stretching: boolean;
  treatment_details?: string;
  therapist_notes?: string;
  started_at: string;
  ended_at: string;
  // joined
  client?: Client;
  therapist?: Profile;
};

// ─── SessionNote (legacy alias for backward compatibility) ────
export type SessionNote = {
  id: string;
  appointment_id?: string;
  client_id: string;
  pain_scale?: number;
  mobility_notes?: string;
  treatment_done?: string;
  exercises_prescribed?: string;
  progress_notes?: string;
  next_session_plan?: string;
  created_by?: string;
  created_at: string;
};

export type AuditLog = {
  id: string;
  user_id?: string;
  action: string;
  details?: string;
  created_at: string;
  // joined
  user?: Profile;
};

export type PaymentMethod = 'cash' | 'cnam' | 'card' | 'other';
export type PaymentStatus = 'paid' | 'pending' | 'partial' | 'waived';

export type Payment = {
  id: string;
  client_id: string;
  appointment_id?: string;
  amount: number;
  payment_method: PaymentMethod;
  cnam_reference?: string;
  status: PaymentStatus;
  notes?: string;
  paid_at: string;
  created_by?: string;
  created_at: string;
  // joined
  client?: Client;
  appointment?: Appointment;
};
