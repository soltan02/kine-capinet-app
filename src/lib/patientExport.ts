import { supabase, Client } from './supabase';
import { table, section, infoGrid, letterhead, footer, presentHtmlDocument, PDF_STYLES } from './pdfHelpers';

// ─── Per-patient PDF export ───────────────────────────────────
// Admin/kiné only (gated at the call site by `sessions:view`, same rule as
// session notes and documents). Generates a printable dossier for one
// patient — diagnosis/history/contraindications, appointments, session
// notes, and optionally billing — for handoffs, patient copies, or CNAM
// paperwork. Reuses the same HTML→PDF pipeline as the clinic-wide backup.

function buildPatientHtml(client: Client, appointments: any[], sessionLogs: any[], payments: any[] | null): string {
  const fullName = `${client.first_name} ${client.last_name}`;
  const dateStr = new Date().toLocaleDateString('fr-FR');

  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>${PDF_STYLES}</style></head>
<body>
  ${letterhead('Dossier patient', `${fullName} · Généré le ${dateStr}`)}

  ${section('Informations patient', infoGrid([
    ['Téléphone', client.phone],
    ['CNAM', client.cnam_number],
    ['Séances prescrites', client.sessions_prescribed],
    ['Diagnostic', client.diagnosis],
    ['Antécédents médicaux', client.medical_history],
    ['Contre-indications', client.contraindications],
    ['Objectifs de traitement', client.treatment_goals],
  ]))}

  ${section(`Rendez-vous (${appointments.length})`, table(
    ['Date', 'Heure', 'Type', 'Statut'],
    appointments.map((a) => [a.date, String(a.start_time || '').slice(0, 5), a.type, a.status])
  ))}

  ${section(`Notes de séance (${sessionLogs.length})`, table(
    ['Date', 'Douleur avant', 'Douleur après', 'Actes', 'Notes'],
    sessionLogs.map((s) => [
      String(s.started_at || '').slice(0, 10),
      s.pain_before,
      s.pain_after,
      [s.electrotherapy && 'Électrothérapie', s.manual_therapy && 'Thérapie manuelle', s.exercises && 'Exercices', s.stretching && 'Étirements'].filter(Boolean).join(', '),
      s.therapist_notes,
    ])
  ))}

  ${payments ? section(`Paiements (${payments.length})`, table(
    ['Date', 'Montant (TND)', 'Méthode', 'Statut', 'Réf. CNAM'],
    payments.map((p) => [String(p.paid_at || '').slice(0, 10), Number(p.amount).toFixed(3), p.payment_method, p.status, p.cnam_reference])
  )) : ''}

  ${footer()}
</body></html>`;
}

export async function exportPatientPdf(client: Client, includeBilling: boolean): Promise<void> {
  const [{ data: appointments }, { data: sessionLogs }, paymentsResult] = await Promise.all([
    supabase.from('appointments').select('*').eq('client_id', client.id).order('date', { ascending: false }),
    supabase.from('session_logs').select('*').eq('client_id', client.id).order('started_at', { ascending: false }),
    includeBilling
      ? supabase.from('payments').select('*').eq('client_id', client.id).order('paid_at', { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const html = buildPatientHtml(client, appointments || [], sessionLogs || [], includeBilling ? (paymentsResult.data || []) : null);
  await presentHtmlDocument(html, `Cabinet Azzabi Farouk — ${client.first_name} ${client.last_name}`);
}
