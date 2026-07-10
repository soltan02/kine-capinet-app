import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ─── Shared PDF/HTML helpers ──────────────────────────────────
// Used by both the clinic-wide backup export (backup.ts) and the
// per-patient export (patientExport.ts) to avoid duplicating the same
// tiny escape/table/layout logic in two places.
//
// Print-quality CSS matters here (explicit @page sizing, a real
// letterhead, page-break control) because on native this HTML goes
// through expo-print's real PDF engine, which respects it directly.

export function esc(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
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

/** A titled section with print-safe page-break handling — wrap every
 *  h2 + its content in one of these instead of writing them loose. */
export function section(title: string, contentHtml: string): string {
  return `<section class="section"><h2>${esc(title)}</h2>${contentHtml}</section>`;
}

/** Two-column label/value grid (CSS grid, not flexbox — prints reliably
 *  across engines, unlike flex-wrap). Pass [label, value] pairs; falsy
 *  values render as "—" via esc(). */
export function infoGrid(rows: [string, unknown][]): string {
  return `<div class="infoGrid">${rows
    .map(([label, value]) => `<div class="infoRow"><span class="infoLabel">${esc(label)}</span><span class="infoValue">${esc(value)}</span></div>`)
    .join('')}</div>`;
}

/** Letterhead banner shared by every exported document — clinic mark,
 *  document title, and a one-line meta subtitle (patient name + date, or
 *  export summary counts). */
export function letterhead(title: string, subtitle: string): string {
  return `
    <header class="letterhead">
      <div class="brandMark">KC</div>
      <div class="letterheadText">
        <div class="clinicName">Kine Cabinet</div>
        <h1>${esc(title)}</h1>
        <div class="subtitle">${esc(subtitle)}</div>
      </div>
    </header>`;
}

export function footer(): string {
  return `<footer class="docFooter">Document confidentiel — usage clinique uniquement</footer>`;
}

// ─── Presenting the generated document ────────────────────────
// Native: expo-print's printToFileAsync renders `html` to a real PDF file,
// which we then hand to the OS share sheet.
//
// Web: expo-print's web shim silently ignores the `html` argument and
// just calls window.print() on whatever's currently on screen — so
// without this branch, "exporting" would print the live app UI, not the
// generated dossier. Same story for expo-sharing: navigator.share is
// usually unavailable on desktop browsers, so shareAsync() throws right
// after. Instead, open the generated HTML in its own window and print
// that window specifically; the browser's own "Save as PDF" destination
// in the print dialog is the web equivalent of sharing here.
export async function presentHtmlDocument(html: string, dialogTitle: string): Promise<void> {
  if (Platform.OS === 'web') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) throw new Error('popup_blocked');
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.document.title = dialogTitle;
    printWindow.focus();
    // Let the new document (and its @page/table layout) finish painting
    // before invoking print — printing immediately on write() can catch
    // an empty or partially-laid-out page in some browsers.
    await new Promise((resolve) => setTimeout(resolve, 300));
    printWindow.print();
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('sharing_unavailable');
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle });
}

// Indigo-Teal brand tokens (mirrors src/constants/theme.ts's LightColors —
// kept as literal hex here since this HTML is generated outside the RN
// StyleSheet/theme system).
export const PDF_STYLES = `
  @page { size: A4; margin: 28px 32px; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, Helvetica, Arial, sans-serif;
    color: #1B1D2B;
    font-size: 12px;
    line-height: 1.5;
    margin: 0;
  }
  .letterhead {
    display: flex;
    align-items: center;
    gap: 14px;
    padding-bottom: 14px;
    margin-bottom: 20px;
    border-bottom: 2.5px solid #4F46E5;
  }
  .brandMark {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #4F46E5, #4338CA);
    color: #fff;
    font-weight: 800;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .clinicName {
    font-size: 11px;
    font-weight: 700;
    color: #14B8A6;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  h1 { color: #1B1D2B; font-size: 20px; margin: 2px 0 3px; font-weight: 800; }
  .subtitle { color: #4F5170; font-size: 11.5px; }
  .section { margin-top: 22px; page-break-inside: avoid; }
  h2 {
    color: #1B1D2B;
    font-size: 13.5px;
    font-weight: 700;
    margin: 0 0 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid #E9E9F6;
  }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  th {
    background: #F4F5FB;
    color: #4F5170;
    text-align: left;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 9px;
    letter-spacing: 0.04em;
    padding: 7px 9px;
    border-bottom: 1.5px solid #E9E9F6;
  }
  td { padding: 7px 9px; border-bottom: 1px solid #F0F0FA; color: #1B1D2B; }
  tbody tr:nth-child(even) { background: #FAFAFD; }
  .empty { color: #8587A6; font-style: italic; font-size: 11px; }
  .infoGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 28px;
  }
  .infoRow { display: flex; flex-direction: column; gap: 2px; }
  .infoLabel { font-size: 9.5px; font-weight: 700; color: #8587A6; text-transform: uppercase; letter-spacing: 0.04em; }
  .infoValue { font-size: 12px; color: #1B1D2B; }
  .docFooter {
    margin-top: 32px;
    padding-top: 10px;
    border-top: 1px solid #E9E9F6;
    color: #8587A6;
    font-size: 9.5px;
    text-align: center;
  }
`;
