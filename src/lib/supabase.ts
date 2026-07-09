import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Replace these with your Supabase project credentials ────
// Go to: https://supabase.com → Project Settings → API
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Type definitions ─────────────────────────────────────────
export type UserRole = 'admin' | 'therapist' | 'receptionist';

export type Profile = {
  id: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
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
export type AppointmentType = 'initial' | 'session' | 'assessment' | 'discharge';

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
  profile?: Profile;
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
