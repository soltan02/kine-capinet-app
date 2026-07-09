// ─── Shared PDF/HTML helpers ──────────────────────────────────
// Used by both the clinic-wide backup export (backup.ts) and the
// per-patient export (patientExport.ts) to avoid duplicating the same
// tiny escape/table-rendering logic in two places.

export function esc(v: unknown): string {
  if (v === null || v === undefined) return '—';
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function table(headers: string[], rows: (string | number | null | undefined)[][]): string {
  if (rows.length === 0) return '<p class="empty">Aucune donnée.</p>';
  return `
    <table>
      <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
}

export const PDF_STYLES = `
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #123B36; padding: 24px; }
  h1 { color: #0D9488; font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 24px; }
  h2 { color: #0D9488; font-size: 16px; border-bottom: 2px solid #CCFBF1; padding-bottom: 6px; margin-top: 28px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
  th { background: #CCFBF1; color: #123B36; text-align: left; padding: 6px 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #E7F5F1; }
  .empty { color: #999; font-style: italic; font-size: 12px; }
  .infoGrid { display: flex; flex-wrap: wrap; gap: 4px 28px; margin-top: 8px; font-size: 12.5px; }
  .infoGrid div { min-width: 200px; }
  .infoGrid b { color: #123B36; }
`;
