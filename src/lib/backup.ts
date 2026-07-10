import { supabase } from './supabase';
import { table, section, letterhead, footer, presentHtmlDocument, openPrintWindow, PDF_STYLES } from './pdfHelpers';

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
<style>${PDF_STYLES}</style></head>
<body>
  ${letterhead('Sauvegarde des données', `Générée le ${dateStr} · ${clients.length} patients, ${appointments.length} rendez-vous, ${sessionLogs.length} notes de séance, ${payments.length} paiements`)}

  ${section(`Patients (${clients.length})`, table(
    ['Nom', 'Téléphone', 'Diagnostic', 'CNAM'],
    clients.map((c) => [`${c.first_name} ${c.last_name}`, c.phone, c.diagnosis, c.cnam_number])
  ))}

  ${section(`Rendez-vous (${appointments.length})`, table(
    ['Patient', 'Date', 'Heure', 'Type', 'Statut'],
    appointments.map((a) => [clientName(a.client_id), a.date, String(a.start_time || '').slice(0, 5), a.type, a.status])
  ))}

  ${section(`Notes de séance (${sessionLogs.length})`, table(
    ['Patient', 'Date', 'Douleur avant', 'Douleur après', 'Notes'],
    sessionLogs.map((s) => [clientName(s.client_id), String(s.started_at || '').slice(0, 10), s.pain_before, s.pain_after, s.therapist_notes])
  ))}

  ${section(`Paiements (${payments.length})`, table(
    ['Patient', 'Date', 'Montant (TND)', 'Méthode', 'Statut'],
    payments.map((p) => [clientName(p.client_id), String(p.paid_at || '').slice(0, 10), Number(p.amount).toFixed(3), p.payment_method, p.status])
  ))}

  ${footer()}
</body></html>`;
}

export async function shareBackup(id: string): Promise<void> {
  // Must happen before any await — see openPrintWindow's doc comment.
  const printWindow = openPrintWindow();

  try {
    const { data, error } = await supabase
      .from('data_backups')
      .select('payload, created_at')
      .eq('id', id)
      .single();
    if (error || !data) throw error || new Error('backup_not_found');

    const dateStr = String(data.created_at).slice(0, 10);
    const html = buildBackupHtml(data.payload, dateStr);
    await presentHtmlDocument(html, 'Cabinet Azzabi Farouk — sauvegarde', printWindow);
  } catch (e) {
    printWindow?.close();
    throw e;
  }
}
