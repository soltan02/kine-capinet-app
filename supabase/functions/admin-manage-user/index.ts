import { serve } from "https://deno.land/std@0.201.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ─── Admin: delete a user / change another user's email ─────
// Both operations require the service_role key (auth.admin API), so they
// must run server-side. Mirrors the auth/role-check pattern already used
// by admin-update-password and create-user.

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

    const { data: callerProfile, error: profileErr } = await admin.from('profiles').select('role').eq('id', caller.id).maybeSingle();
    if (profileErr || !callerProfile || (callerProfile as any).role !== 'admin') {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { action, targetUserId, newEmail } = body as { action?: string; targetUserId?: string; newEmail?: string };
    if (!action || !targetUserId) {
      return new Response('Invalid request: action and targetUserId are required', { status: 400, headers: corsHeaders });
    }

    if (action === 'delete') {
      if (targetUserId === caller.id) {
        return new Response('You cannot delete your own account. Ask another admin to remove it.', { status: 400, headers: corsHeaders });
      }
      const { data: target } = await admin.from('profiles').select('role').eq('id', targetUserId).maybeSingle();
      if ((target as any)?.role === 'admin') {
        const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
        if ((count ?? 0) <= 1) {
          return new Response('Cannot delete the last remaining admin account.', { status: 400, headers: corsHeaders });
        }
      }

      const { error: delErr } = await admin.auth.admin.deleteUser(targetUserId);
      if (delErr) return new Response(delErr.message, { status: 500, headers: corsHeaders });

      try {
        await admin.from('audit_logs').insert([{ user_id: caller.id, action: 'delete_user', details: `Deleted user ${targetUserId}` }]);
      } catch (_) { /* ignore logging errors */ }

      return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { ...corsHeaders, 'content-type': 'application/json' } });
    }

    if (action === 'update_email') {
      if (!newEmail?.trim()) {
        return new Response('newEmail is required', { status: 400, headers: corsHeaders });
      }
      const { error: updErr } = await admin.auth.admin.updateUserById(targetUserId, { email: newEmail.trim().toLowerCase(), email_confirm: true });
      if (updErr) return new Response(updErr.message, { status: 500, headers: corsHeaders });

      try {
        await admin.from('audit_logs').insert([{ user_id: caller.id, action: 'edit_user_email', details: `Updated email for user ${targetUserId}` }]);
      } catch (_) { /* ignore logging errors */ }

      return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { ...corsHeaders, 'content-type': 'application/json' } });
    }

    return new Response('Invalid action', { status: 400, headers: corsHeaders });
  } catch (err) {
    console.error('function error', err);
    return new Response('Internal error', { status: 500, headers: corsHeaders });
  }
});
