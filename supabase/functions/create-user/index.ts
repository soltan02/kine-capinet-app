import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      return new Response('Server not configured', { status: 500, headers: corsHeaders });
    }

    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data: userResult, error: userErr } = await anon.auth.getUser(authHeader);
    if (userErr || !userResult?.user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    const caller = userResult.user;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { data: profile, error: profileErr } = await admin.from('profiles').select('role').eq('id', caller.id).maybeSingle();
    if (profileErr || !profile || (profile as any).role !== 'admin') {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { full_name, email, role } = body as { full_name?: string; email?: string; role?: string };
    if (!full_name?.trim() || !email?.trim() || !role) {
      return new Response('Invalid request: full_name, email and role are required', { status: 400, headers: corsHeaders });
    }
    const validRoles = ['admin', 'therapist', 'receptionist'];
    if (!validRoles.includes(role)) {
      return new Response('Invalid role', { status: 400, headers: corsHeaders });
    }

    const rawPassword = crypto.randomUUID().replace(/-/g, '').slice(0, 10) + Math.random().toString(36).slice(2, 8);
    const password = rawPassword;

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim() },
    });

    if (authError || !authData.user) {
      return new Response(authError?.message || 'Failed to create user', { status: 500, headers: corsHeaders });
    }

    const { error: profileUpsertError } = await admin
      .from('profiles')
      .upsert({ id: authData.user.id, full_name: full_name.trim(), role }, { onConflict: 'id' });

    if (profileUpsertError) {
      return new Response(profileUpsertError.message, { status: 500, headers: corsHeaders });
    }

    try {
      await admin.from('audit_logs').insert([{ user_id: caller.id, action: 'create_user', details: `Created ${full_name.trim()} (${role})` }]);
    } catch (_) { /* ignore logging errors */ }

    return new Response(JSON.stringify({ status: 'ok', password, user_id: authData.user.id }), {
      status: 200,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('function error', err);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }
});