import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase';

// ─── Admin data export / automated backups ───────────────────
// Snapshots are created server-side (weekly cron + this on-demand RPC),
// stored in the RLS-protected `data_backups` table (admin-read-only).
// Exporting renders the payload as a printable PDF (patients, appointments,
// session notes, payments) so the clinic always has a paper copy of their
// data, not just a machine-readable file.

export interface BackupSummary {
  id: string;
  created_at: string;
}

export async function listBackups(): Promise<BackupSummary[]> {
  const { data, error } = await supabase
    .from('data_backups')
    .select('id, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as BackupSummary[]) || [];
}

export async function createBackupNow(): Promise<string> {
  const { data, error } = await supabase.rpc('create_data_backup');
  if (error) throw error;
  return data as string;
}

function esc(v: unknown): string {
  if (v === null || v === undefined) return '—';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function table(headers: string[], rows: (string | number | null | undefined)[][]): string {
  if (rows.length === 0) return '<p class="empty">Aucune donnée.</p>';
  return `
    <table>
      <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
}

function buildBackupHtml(payload: any, dateStr: string): string {
  const clients: any[] = payload.clients || [];
  const appointments: any[] = payload.appointments || [];
  const sessionLogs: any[] = payload.session_logs || [];
  const payments: any[] = payload.payments || [];

  const clientName = (id: string) => {
    const c = clients.find((x) => x.id === id);
    return c ? `${c.first_name} ${c.last_name}` : '—';
  };

  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #123B36; padding: 24px; }
  h1 { color: #0D9488; font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 24px; }
  h2 { color: #0D9488; font-size: 16px; border-bottom: 2px solid #CCFBF1; padding-bottom: 6px; margin-top: 28px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
  th { background: #CCFBF1; color: #123B36; text-align: left; padding: 6px 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #E7F5F1; }
  .empty { color: #999; font-style: italic; font-size: 12px; }
</style></head>
<body>
  <h1>Kine Cabinet — Sauvegarde des données</h1>
  <div class="subtitle">Générée le ${esc(dateStr)} · ${clients.length} patients, ${appointments.length} rendez-vous, ${sessionLogs.length} notes de séance, ${payments.length} paiements</div>

  <h2>Patients (${clients.length})</h2>
  ${table(
    ['Nom', 'Téléphone', 'Diagnostic', 'CNAM', 'Actif'],
    clients.map((c) => [`${c.first_name} ${c.last_name}`, c.phone, c.diagnosis, c.cnam_number, c.is_active ? 'Oui' : 'Non'])
  )}

  <h2>Rendez-vous (${appointments.length})</h2>
  ${table(
    ['Patient', 'Date', 'Heure', 'Type', 'Statut'],
    appointments.map((a) => [clientName(a.client_id), a.date, String(a.start_time || '').slice(0, 5), a.type, a.status])
  )}

  <h2>Notes de séance (${sessionLogs.length})</h2>
  ${table(
    ['Patient', 'Date', 'Douleur avant', 'Douleur après', 'Notes'],
    sessionLogs.map((s) => [clientName(s.client_id), String(s.started_at || '').slice(0, 10), s.pain_before, s.pain_after, s.therapist_notes])
  )}

  <h2>Paiements (${payments.length})</h2>
  ${table(
    ['Patient', 'Date', 'Montant (TND)', 'Méthode', 'Statut'],
    payments.map((p) => [clientName(p.client_id), String(p.paid_at || '').slice(0, 10), Number(p.amount).toFixed(3), p.payment_method, p.status])
  )}
</body></html>`;
}

export async function shareBackup(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('data_backups')
    .select('payload, created_at')
    .eq('id', id)
    .single();
  if (error || !data) throw error || new Error('backup_not_found');

  const dateStr = String(data.created_at).slice(0, 10);
  const html = buildBackupHtml(data.payload, dateStr);
  const { uri } = await Print.printToFileAsync({ html });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('sharing_unavailable');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Kine Cabinet — sauvegarde' });
}
