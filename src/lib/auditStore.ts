import { create } from 'zustand';
import { supabase, AuditLog } from './supabase';

// ─── Audit Store ──────────────────────────────────────────────
interface AuditState {
  logs: AuditLog[];
  loading: boolean;
  fetchLogs: (limit?: number) => Promise<void>;
  logAction: (action: string, details?: string) => Promise<void>;
}

export const useAuditStore = create<AuditState>((set, get) => ({
  logs: [],
  loading: false,
  fetchLogs: async (limit = 100) => {
    set({ loading: true });
    const { data } = await supabase
      .from('audit_logs')
      .select(`*, user:profiles(id, full_name, role)`)
      .order('created_at', { ascending: false })
      .limit(limit);
    set({ logs: (data as AuditLog[]) || [], loading: false });
  },
  logAction: async (action, details) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('audit_logs').insert([{
      user_id: user.id,
      action,
      details: details || null,
    }]);
    // Refresh if we already have logs loaded
    if (get().logs.length > 0) {
      get().fetchLogs();
    }
  },
}));