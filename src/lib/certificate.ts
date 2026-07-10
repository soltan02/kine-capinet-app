import { esc, openPrintWindow, closePrintWindow, presentHtmlDocument } from './pdfHelpers';

// ─── Kinésithérapie certificate ───────────────────────────────
// Mirrors the cabinet's real letterhead (business card) and the
// standard "certificat médical de kinésithérapie" template used for
// CNAM/employer paperwork. Kinésithérapeutes aren't styled "Dr." in
// French/Tunisian convention (that's reserved for physicians) — the
// practitioner is named plainly with "Kinésithérapeute" as the
// qualifier, matching both the cabinet's business card and the app's
// existing "Cabinet Azzabi Farouk" branding.
const CABINET_NAME = 'Cabinet Azzabi Farouk';
const PRACTITIONER_NAME = 'Azzabi Farouk';
const PRACTITIONER_TITLE = 'Kinésithérapeute';
const CABINET_ADDRESS = 'Rue Ibn Sina, Bir Lahmar';
const CABINET_PHONE = '52 048 264 / 44 365 003';

export interface CertificateFields {
  patientName: string;
  dob: string;
  sessionsCount: string;
  periodStart: string;
  periodEnd: string;
  prescribingDoctor: string;
  motif: string;
  city: string;
  certificateDate: string;
  ordreNumber: string;
}

function buildCertificateHtml(f: CertificateFields): string {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 30px 36px; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1B1D2B; margin: 0; }
  .frame { border: 5px double #0F5132; border-radius: 4px; padding: 26px 36px; }
  .frameInner { border: 1px solid #cfd8d5; padding: 22px 30px; }
  .letterheadRow { display: flex; justify-content: space-between; font-size: 13px; line-height: 1.6; }
  .cabinetName { font-weight: 700; }
  .hr { border: none; border-top: 1px solid #999; margin: 14px 0 24px; }
  h1.title { text-align: center; color: #0F5132; font-size: 28px; letter-spacing: 0.5px; margin: 26px 0 4px; font-weight: 700; }
  .subtitle { text-align: center; color: #7c8a86; font-size: 14px; margin-bottom: 32px; }
  .body p { font-size: 14.5px; line-height: 1.9; margin: 0 0 16px; }
  .fieldLine { border-bottom: 1px dotted #8a8a8a; display: inline-block; min-width: 220px; padding-bottom: 1px; }
  .motifBox { border-bottom: 1px dotted #8a8a8a; display: block; min-height: 46px; padding: 4px 0; }
  .signatureBlock { margin-top: 46px; display: flex; justify-content: space-between; align-items: flex-end; }
  .signatureLabel { font-size: 11.5px; color: #7c8a86; text-align: center; margin-bottom: 6px; }
  .signatureBox { border: 1px dashed #aaa; width: 190px; height: 84px; border-radius: 4px; }
</style></head>
<body>
  <div class="frame"><div class="frameInner">
    <div class="letterheadRow">
      <div>
        <div class="cabinetName">${esc(CABINET_NAME)}</div>
        <div>${esc(PRACTITIONER_NAME)} — ${esc(PRACTITIONER_TITLE)}</div>
        <div>N° d'ordre : ${esc(f.ordreNumber)}</div>
      </div>
      <div style="text-align:right">
        <div>${esc(CABINET_ADDRESS)}</div>
        <div>Tél : ${esc(CABINET_PHONE)}</div>
      </div>
    </div>
    <hr class="hr" />

    <h1 class="title">CERTIFICAT MÉDICAL</h1>
    <div class="subtitle">de kinésithérapie</div>

    <div class="body">
      <p>Je soussigné(e), <b>${esc(PRACTITIONER_NAME)}</b>, kinésithérapeute, certifie avoir dispensé des soins de kinésithérapie à :</p>
      <p>M. / Mme <span class="fieldLine">${esc(f.patientName)}</span></p>
      <p>né(e) le <span class="fieldLine">${esc(f.dob)}</span></p>
      <p>Nombre de séances effectuées : <span class="fieldLine">${esc(f.sessionsCount)}</span></p>
      <p>Période du <span class="fieldLine">${esc(f.periodStart)}</span> au <span class="fieldLine">${esc(f.periodEnd)}</span></p>
      <p>Sur prescription du Dr <span class="fieldLine">${esc(f.prescribingDoctor)}</span></p>
      <p>Motif / observations :</p>
      <p class="motifBox">${esc(f.motif)}</p>
      <p style="margin-top: 26px;">Certificat établi à la demande de l'intéressé(e) et remis en main propre pour faire valoir ce que de droit.</p>
    </div>

    <div class="signatureBlock">
      <div>Fait à <span class="fieldLine">${esc(f.city)}</span>, le <span class="fieldLine">${esc(f.certificateDate)}</span></div>
      <div>
        <div class="signatureLabel">Signature et cachet</div>
        <div class="signatureBox"></div>
      </div>
    </div>
  </div></div>
</body></html>`;
}

export async function generateCertificate(fields: CertificateFields): Promise<void> {
  const printWindow = openPrintWindow();
  try {
    const html = buildCertificateHtml(fields);
    await presentHtmlDocument(html, `Certificat médical — ${fields.patientName}`, printWindow);
  } catch (e) {
    closePrintWindow(printWindow);
    throw e;
  }
}
