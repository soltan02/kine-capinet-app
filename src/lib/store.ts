import { create } from 'zustand';
import { supabase, Profile, Client, Appointment } from './supabase';
import type { Session } from '@supabase/supabase-js';

// ─── Auth Store ───────────────────────────────────────────────
interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  fetchProfile: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      set({ profile: data as Profile });
    } else {
      // Create profile row manually since trigger is disabled
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert([{
            id: userId,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kiné',
            role: 'therapist' // default to therapist (admin is assigned manually)
          }])
          .select()
          .single();
        if (newProfile) set({ profile: newProfile as Profile });
      }
    }
  },
  signOut: async () => {
    // 1. Clear local state FIRST — this immediately unmounts MainNavigator
    //    and shows LoginScreen, so the user sees instant feedback
    set({ session: null, profile: null, loading: false });
    // 2. Fire Supabase signOut in the background (no await!)
    //    This prevents any network hang from blocking the logout flow
    supabase.auth.signOut().catch((err) => {
      console.warn('Supabase signOut background (non-critical):', err);
    });
  },
}));

// ─── Clients Store ────────────────────────────────────────────
interface ClientsState {
  clients: Client[];
  loading: boolean;
  error: string | null;
  fetchClients: () => Promise<{ error: string | null }>;
  addClient: (client: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => Promise<{ data: Client | null; error: string | null }>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<{ error: string | null }>;
  deleteClient: (id: string) => Promise<{ error: string | null }>;
}

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: [],
  loading: false,
  error: null,
  fetchClients: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('last_name', { ascending: true });
    if (error) {
      set({ loading: false, error: error.message });
      return { error: error.message };
    }
    set({ clients: (data as Client[]) || [], loading: false, error: null });
    return { error: null };
  },
  addClient: async (client) => {
    const { data, error } = await supabase
      .from('clients')
      .insert([client])
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    set({ clients: [...get().clients, data as Client] });
    return { data: data as Client, error: null };
  },
  updateClient: async (id, updates) => {
    const { data, error } = await supabase
      .from('clients')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return { error: error.message };
    if (data) {
      set({
        clients: get().clients.map((c) => (c.id === id ? { ...c, ...(data as Client) } : c)),
      });
    }
    return { error: null };
  },
  deleteClient: async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) return { error: error.message };
    set({ clients: get().clients.filter((c) => c.id !== id) });
    return { error: null };
  },
}));

// ─── Appointments Store ───────────────────────────────────────
interface AppointmentsState {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  fetchAppointments: (dateFrom?: string, dateTo?: string) => Promise<{ error: string | null }>;
  addAppointment: (appt: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => Promise<{ data: Appointment | null; error: string | null }>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<{ error: string | null }>;
  deleteAppointment: (id: string) => Promise<{ error: string | null }>;
}

export const useAppointmentsStore = create<AppointmentsState>((set, get) => ({
  appointments: [],
  loading: false,
  error: null,
  fetchAppointments: async (dateFrom, dateTo) => {
    set({ loading: true, error: null });
    let query = supabase
      .from('appointments')
      .select(`*, client:clients(id, first_name, last_name, phone)`)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);

    const { data, error } = await query;
    if (error) {
      set({ loading: false, error: error.message });
      return { error: error.message };
    }
    set({ appointments: (data as Appointment[]) || [], loading: false, error: null });
    return { error: null };
  },
  addAppointment: async (appt) => {
    const { data, error } = await supabase
      .from('appointments')
      .insert([appt])
      .select(`*, client:clients(id, first_name, last_name, phone)`)
      .single();
    if (error) return { data: null, error: error.message };
    set({ appointments: [...get().appointments, data as Appointment] });
    return { data: data as Appointment, error: null };
  },
  updateAppointment: async (id, updates) => {
    const { data, error } = await supabase
      .from('appointments')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`*, client:clients(id, first_name, last_name, phone)`)
      .single();
    if (error) return { error: error.message };
    if (data) {
      set({
        appointments: get().appointments.map((a) =>
          a.id === id ? { ...a, ...(data as Appointment) } : a
        ),
      });
    }
    return { error: null };
  },
  deleteAppointment: async (id) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) return { error: error.message };
    set({ appointments: get().appointments.filter((a) => a.id !== id) });
    return { error: null };
  },
}));


