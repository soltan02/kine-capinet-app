import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase, Client } from './supabase';
import { esc, table, PDF_STYLES } from './pdfHelpers';

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
  <h1>Kine Cabinet — Dossier patient</h1>
  <div class="subtitle">${esc(fullName)} · Généré le ${esc(dateStr)}</div>

  <h2>Informations patient</h2>
  <div class="infoGrid">
    <div><b>Téléphone :</b> ${esc(client.phone)}</div>
    <div><b>CNAM :</b> ${esc(client.cnam_number)}</div>
    <div><b>Diagnostic :</b> ${esc(client.diagnosis)}</div>
    <div><b>Antécédents :</b> ${esc(client.medical_history)}</div>
    <div><b>Contre-indications :</b> ${esc(client.contraindications)}</div>
    <div><b>Objectifs de traitement :</b> ${esc(client.treatment_goals)}</div>
    <div><b>Séances prescrites :</b> ${esc(client.sessions_prescribed)}</div>
  </div>

  <h2>Rendez-vous (${appointments.length})</h2>
  ${table(
    ['Date', 'Heure', 'Type', 'Statut'],
    appointments.map((a) => [a.date, String(a.start_time || '').slice(0, 5), a.type, a.status])
  )}

  <h2>Notes de séance (${sessionLogs.length})</h2>
  ${table(
    ['Date', 'Douleur avant', 'Douleur après', 'Actes', 'Notes'],
    sessionLogs.map((s) => [
      String(s.started_at || '').slice(0, 10),
      s.pain_before,
      s.pain_after,
      [s.electrotherapy && 'Électrothérapie', s.manual_therapy && 'Thérapie manuelle', s.exercises && 'Exercices', s.stretching && 'Étirements'].filter(Boolean).join(', '),
      s.therapist_notes,
    ])
  )}

  ${payments ? `
  <h2>Paiements (${payments.length})</h2>
  ${table(
    ['Date', 'Montant (TND)', 'Méthode', 'Statut', 'Réf. CNAM'],
    payments.map((p) => [String(p.paid_at || '').slice(0, 10), Number(p.amount).toFixed(3), p.payment_method, p.status, p.cnam_reference])
  )}` : ''}
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
  const { uri } = await Print.printToFileAsync({ html });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('sharing_unavailable');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Kine Cabinet — ${client.first_name} ${client.last_name}` });
}
