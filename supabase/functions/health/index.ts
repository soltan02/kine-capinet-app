// Health check for Pulse (or any external monitor) to distinguish "site is
// slow" from "database is actually broken". Protected by HEALTH_TOKEN so
// outsiders can't use it to map internal infrastructure — set via:
//   supabase secrets set HEALTH_TOKEN=<openssl rand -hex 24> --project-ref <ref>
import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const DB_CHECK_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)),
  ]);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const started = Date.now();

  const HEALTH_TOKEN = Deno.env.get('HEALTH_TOKEN');
  if (HEALTH_TOKEN) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${HEALTH_TOKEN}`) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ status: 'error', checks: {}, error: 'server not configured', latency_ms: Date.now() - started });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  try {
    const t = Date.now();
    const { error } = await withTimeout(admin.from('profiles').select('id').limit(1), DB_CHECK_TIMEOUT_MS);
    if (error) throw error;
    checks.db = { status: 'ok', latency_ms: Date.now() - t };
  } catch (e) {
    checks.db = { status: 'error', error: e instanceof Error ? e.message : String(e) };
  }

  const status = Object.values(checks).some((c) => c.status === 'error') ? 'error' : 'ok';

  return jsonResponse({
    status,
    checks,
    latency_ms: Date.now() - started,
    version: '1.0.0',
  });
});
