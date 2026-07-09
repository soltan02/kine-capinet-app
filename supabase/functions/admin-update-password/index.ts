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

    // Expect admin to call with their access token in Authorization header
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '').trim();
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    // Use anon key to validate caller's session and user
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data: userResult, error: userErr } = await anon.auth.getUser(authHeader);
    if (userErr || !userResult?.user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    const caller = userResult.user;

    // Create admin client (service role) to read profiles & perform admin actions
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Verify caller is admin by checking `profiles` table
    const { data: profile, error: profileErr } = await admin.from('profiles').select('role').eq('id', caller.id).maybeSingle();
    if (profileErr || !profile || (profile as any).role !== 'admin') {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const targetUserId = body?.targetUserId;
    const newPassword = body?.newPassword;
    if (!targetUserId || !newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return new Response('Invalid request body', { status: 400, headers: corsHeaders });
    }

    // Use admin API to update the user's password
    // Note: this requires the service_role key and is safe because it runs server-side
    const { error: updateErr } = await admin.auth.admin.updateUserById(targetUserId, { password: newPassword });
    if (updateErr) {
      return new Response(updateErr.message, { status: 500, headers: corsHeaders });
    }

    // Log action to audit_logs table (best-effort)
    try {
      await admin.from('audit_logs').insert([{ user_id: caller.id, action: 'admin_password_update', details: `Updated password for ${targetUserId}` }]);
    } catch (_) {
      // ignore logging errors
    }

    return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { ...corsHeaders, 'content-type': 'application/json' } });
  } catch (err) {
    console.error('function error', err);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }
});
