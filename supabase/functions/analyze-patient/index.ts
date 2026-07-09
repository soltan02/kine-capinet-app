import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ─── AI Patient Analysis (Gemini 2.5 Flash) ──────────────────
// Requires the secret GEMINI_API_KEY (free key from https://aistudio.google.com/apikey).
// Set it with:  supabase secrets set GEMINI_API_KEY=...
// PRIVACY: only de-identified clinical fields are sent to Gemini —
// never name, CNAM, phone, email, address, or date of birth (age is derived).
// ACCESS: admin + therapist (kiné) only; enforced here server-side.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_MODEL = 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `Tu es un assistant clinique expert en kinésithérapie et thérapie manuelle, au service d'un praticien diplômé.
Tu aides à la décision : tu ne poses JAMAIS de diagnostic médical et tu ne remplaces pas le jugement du praticien.
Analyse le dossier anonymisé fourni et réponds en FRANÇAIS, de façon concise et structurée, avec exactement ces sections (titres en gras) :
**Résumé** — état global du patient en 2-3 phrases.
**Évolution de la douleur** — tendance des scores douleur avant/après au fil des séances.
**Traitements** — techniques utilisées et pertinence.
**Points de vigilance & contre-indications** — risques à surveiller au regard des contre-indications et antécédents.
**Suggestions pour la prochaine séance** — 2 à 4 propositions concrètes et prudentes.
Si les données sont insuffisantes, dis-le clairement. Ne réclame jamais d'informations identifiantes.`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

function computeAge(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method Not Allowed' }, 405);
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return jsonResponse({ error: 'Server not configured' }, 500);
    }
    if (!GEMINI_API_KEY) {
      return jsonResponse({ error: 'AI not configured (missing GEMINI_API_KEY)' }, 500);
    }

    // 1. Validate caller token
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data: userResult, error: userErr } = await anon.auth.getUser(authHeader);
    if (userErr || !userResult?.user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const caller = userResult.user;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // 2. Role gate: admin + therapist only
    const { data: profile, error: profileErr } = await admin
      .from('profiles').select('role').eq('id', caller.id).maybeSingle();
    if (profileErr || !profile || !['admin', 'therapist'].includes((profile as any).role)) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    // 3. Input
    const body = await req.json().catch(() => ({}));
    const clientId = body?.clientId;
    if (!clientId || typeof clientId !== 'string') {
      return jsonResponse({ error: 'Invalid request body' }, 400);
    }

    // 4. Fetch clinical data (service role)
    const { data: client, error: clientErr } = await admin
      .from('clients')
      .select('diagnosis, contraindications, medical_history, treatment_goals, sessions_prescribed, gender, date_of_birth')
      .eq('id', clientId)
      .maybeSingle();
    if (clientErr || !client) {
      return jsonResponse({ error: 'Patient not found' }, 404);
    }

    const { data: sessions } = await admin
      .from('session_logs')
      .select('pain_before, pain_after, electrotherapy, manual_therapy, exercises, stretching, treatment_details, therapist_notes, started_at')
      .eq('client_id', clientId)
      .order('started_at', { ascending: true });

    const sessionList = (sessions as any[]) || [];
    const c = client as any;

    // Not enough to analyze
    if (!c.diagnosis && sessionList.length === 0) {
      return jsonResponse({ error: 'no_data' }, 422);
    }

    // 5. Build ANONYMIZED clinical brief — no identifiers
    const age = computeAge(c.date_of_birth);
    const lines: string[] = [];
    lines.push('DOSSIER PATIENT ANONYMISÉ (aucune donnée identifiante)');
    lines.push(`Âge: ${age ?? 'non renseigné'}`);
    lines.push(`Sexe: ${c.gender === 'male' ? 'homme' : c.gender === 'female' ? 'femme' : 'non renseigné'}`);
    lines.push(`Diagnostic: ${c.diagnosis || 'non renseigné'}`);
    lines.push(`Antécédents médicaux: ${c.medical_history || 'non renseigné'}`);
    lines.push(`Contre-indications: ${c.contraindications || 'aucune renseignée'}`);
    lines.push(`Objectifs de traitement: ${c.treatment_goals || 'non renseigné'}`);
    lines.push(`Séances prescrites: ${c.sessions_prescribed ?? 'non renseigné'}`);
    lines.push(`Séances réalisées: ${sessionList.length}`);
    lines.push('');
    lines.push('HISTORIQUE DES SÉANCES (de la plus ancienne à la plus récente):');
    if (sessionList.length === 0) {
      lines.push('Aucune séance enregistrée.');
    } else {
      sessionList.forEach((s, i) => {
        const treatments = [
          s.electrotherapy ? 'électrothérapie' : null,
          s.manual_therapy ? 'thérapie manuelle' : null,
          s.exercises ? 'exercices' : null,
          s.stretching ? 'étirements' : null,
        ].filter(Boolean).join(', ') || 'non précisé';
        const date = s.started_at ? String(s.started_at).slice(0, 10) : '?';
        lines.push(
          `Séance ${i + 1} (${date}) — douleur ${s.pain_before ?? '?'}/10 → ${s.pain_after ?? '?'}/10 ; ` +
          `actes: ${treatments}` +
          (s.treatment_details ? ` ; détails: ${s.treatment_details}` : '') +
          (s.therapist_notes ? ` ; notes: ${s.therapist_notes}` : '')
        );
      });
    }
    const userPrompt = lines.join('\n');

    // 6. Call Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1400 },
      }),
    });

    if (geminiRes.status === 429) {
      return jsonResponse({ error: 'rate_limited' }, 429);
    }
    if (!geminiRes.ok) {
      const detail = await geminiRes.text().catch(() => '');
      console.error('gemini error', geminiRes.status, detail);
      return jsonResponse({ error: 'ai_failed' }, 502);
    }

    const geminiJson = await geminiRes.json();
    const analysis = geminiJson?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text || '').join('').trim();

    if (!analysis) {
      console.error('gemini empty response', JSON.stringify(geminiJson).slice(0, 500));
      return jsonResponse({ error: 'ai_failed' }, 502);
    }

    // 7. Best-effort audit log
    try {
      await admin.from('audit_logs').insert([{
        user_id: caller.id,
        action: 'ai_patient_analysis',
        details: `AI analysis generated for patient ${clientId}`,
      }]);
    } catch (_) { /* ignore */ }

    return jsonResponse({ analysis }, 200);
  } catch (err) {
    console.error('analyze-patient function error', err);
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});
