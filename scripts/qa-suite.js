const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env', 'utf8');
const get = k => (env.match(new RegExp('^' + k + '=(.*)', 'm')) || [])[1]?.trim();
const URL = get('EXPO_PUBLIC_SUPABASE_URL');
const ANON = get('EXPO_PUBLIC_SUPABASE_ANON_KEY');
const SVC = get('SUPABASE_SERVICE_ROLE_KEY');
const admin = createClient(URL, SVC, { auth: { persistSession: false } });

const results = [];
const ok = (name, cond, detail = '') => results.push({ name, pass: !!cond, detail });
const created = { users: [], clients: [] };

const signIn = async (email, password) => {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  return { client: c, token: data?.session?.access_token, error };
};
const mkUser = async (role, pw = 'TestPw123456!') => {
  const email = `qa_${role}_${Date.now()}_${Math.floor(Math.random()*1e4)}@example.com`;
  const { data } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true });
  await admin.from('profiles').upsert({ id: data.user.id, full_name: `QA ${role}`, role });
  created.users.push(data.user.id);
  return { id: data.user.id, email, pw };
};
const callFn = async (fn, token, body) => {
  const r = await fetch(`${URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, json: j };
};

(async () => {
  try {
    // ---- users of each role ----
    const adminU = await mkUser('admin');
    const therapistU = await mkUser('therapist');
    const receptionistU = await mkUser('receptionist');

    // 1. AUTH
    const good = await signIn(adminU.email, adminU.pw);
    ok('Auth: valid login returns session', good.token && !good.error);
    const bad = await signIn(adminU.email, 'WrongPassword!');
    ok('Auth: wrong password rejected', !!bad.error);

    const adminS = good.client, adminTok = good.token;
    const therS = (await signIn(therapistU.email, therapistU.pw));
    const recS = (await signIn(receptionistU.email, receptionistU.pw));

    // 2. EDGE FN create-user (admin) creates therapist
    const cu = await callFn('create-user', adminTok, { full_name: 'Dr QA New', email: `qa_new_${Date.now()}@example.com`, role: 'therapist' });
    ok('Edge create-user (admin): 200 + password returned', cu.status === 200 && cu.json?.password, `status ${cu.status}`);
    if (cu.json?.user_id) {
      created.users.push(cu.json.user_id);
      const { data: prof } = await admin.from('profiles').select('role').eq('id', cu.json.user_id).maybeSingle();
      ok('Edge create-user: profile row created with role therapist', prof?.role === 'therapist');
    } else ok('Edge create-user: profile row created with role therapist', false, 'no user_id');

    // 3. EDGE FN create-user (non-admin) forbidden
    const cuForbid = await callFn('create-user', therS.token, { full_name: 'X', email: `x_${Date.now()}@example.com`, role: 'therapist' });
    ok('Edge create-user (therapist): 403 Forbidden', cuForbid.status === 403, `status ${cuForbid.status}`);

    // 4. EDGE FN admin-update-password
    const newPw = 'ChangedPw98765!';
    const aup = await callFn('admin-update-password', adminTok, { targetUserId: receptionistU.id, newPassword: newPw });
    ok('Edge admin-update-password (admin): 200', aup.status === 200, `status ${aup.status}`);
    const reLogin = await signIn(receptionistU.email, newPw);
    ok('Edge admin-update-password: new password works', !!reLogin.token);

    // 5. PATIENTS CRUD (therapist)
    const { data: cIns, error: cErr } = await therS.client.from('clients')
      .insert([{ first_name: 'QA', last_name: 'Patient', phone: '111', diagnosis: 'Test', sessions_prescribed: 10, attachments: [], is_active: true, created_by: therapistU.id }])
      .select().single();
    ok('Patients: therapist can CREATE', !cErr && cIns?.id, cErr?.message);
    if (cIns) created.clients.push(cIns.id);
    const { data: cSel } = await therS.client.from('clients').select('*').eq('id', cIns?.id || '0');
    ok('Patients: therapist can READ own-created', (cSel || []).length === 1);
    const { error: cUpd } = await therS.client.from('clients').update({ diagnosis: 'Updated' }).eq('id', cIns.id);
    ok('Patients: therapist can UPDATE', !cUpd, cUpd?.message);

    // 6. APPOINTMENTS
    const { data: aIns, error: aErr } = await therS.client.from('appointments')
      .insert([{ client_id: cIns.id, assigned_to: therapistU.id, date: '2026-09-01', start_time: '09:00', duration_minutes: 45, type: 'session', status: 'scheduled', created_by: therapistU.id }])
      .select().single();
    ok('Appointments: create', !aErr && aIns?.id, aErr?.message);
    const { error: aUpd } = await therS.client.from('appointments').update({ status: 'completed' }).eq('id', aIns?.id || '0');
    ok('Appointments: update status', !aUpd, aUpd?.message);

    // 7. SESSION LOGS — therapist writes; receptionist must NOT read (confidentiality)
    const { data: sIns, error: sErr } = await therS.client.from('session_logs')
      .insert([{ client_id: cIns.id, therapist_id: therapistU.id, pain_before: 8, pain_after: 4, electrotherapy: true, manual_therapy: false, exercises: true, stretching: false }])
      .select().single();
    ok('Sessions: therapist can CREATE clinical note', !sErr && sIns?.id, sErr?.message);
    const { data: sRec } = await recS.client.from('session_logs').select('*').eq('client_id', cIns.id);
    ok('Sessions: RLS hides clinical notes from receptionist', (sRec || []).length === 0, `saw ${(sRec||[]).length} rows`);
    const { data: sTher } = await therS.client.from('session_logs').select('*').eq('client_id', cIns.id);
    ok('Sessions: therapist CAN read clinical notes', (sTher || []).length >= 1);

    // 8. PAYMENTS — all 3 roles can create/manage payments (revenue totals
    // are restricted to admin only at the app UI level, not via RLS)
    const { error: pRec } = await recS.client.from('payments')
      .insert([{ client_id: cIns.id, amount: 50, payment_method: 'cash', status: 'paid', created_by: receptionistU.id, paid_at: new Date().toISOString() }]);
    ok('Payments: receptionist can CREATE', !pRec, pRec?.message);
    const { error: pTher } = await therS.client.from('payments')
      .insert([{ client_id: cIns.id, amount: 99, payment_method: 'cash', status: 'paid', created_by: therapistU.id, paid_at: new Date().toISOString() }]);
    ok('Payments: therapist can CREATE', !pTher, pTher?.message);
    const { data: pReadT } = await therS.client.from('payments').select('*').eq('client_id', cIns.id);
    ok('Payments: therapist CAN read', (pReadT || []).length >= 1);

    // 9. AUDIT LOGS
    const { error: auIns } = await therS.client.from('audit_logs').insert([{ user_id: therapistU.id, action: 'qa_test', details: 'qa' }]);
    ok('Audit: any staff can INSERT own entry', !auIns, auIns?.message);
    const { data: auAdmin } = await adminS.from('audit_logs').select('*').limit(1);
    ok('Audit: admin CAN read log', Array.isArray(auAdmin));
    const { data: auTher } = await therS.client.from('audit_logs').select('*');
    ok('Audit: RLS hides log from therapist (admin-only read)', (auTher || []).length === 0, `saw ${(auTher||[]).length}`);

    // 10. SECURITY guards
    const { data: escData, error: escErr } = await therS.client.from('profiles').update({ role: 'admin' }).eq('id', therapistU.id).select();
    const { data: escCheck } = await admin.from('profiles').select('role').eq('id', therapistU.id).single();
    ok('Security: therapist CANNOT self-escalate to admin', escCheck.role === 'therapist', `role now ${escCheck.role}`);

    const outsider = await mkUser('therapist');
    const outS = await signIn(outsider.email, outsider.pw);
    // therapist tries to read audit of others already covered; check cannot delete a client? clients delete allowed for all 3 per policy — skip.

  } catch (e) {
    ok('FATAL', false, e.message + '\n' + e.stack);
  } finally {
    // cleanup
    for (const id of created.clients) { await admin.from('clients').delete().eq('id', id); }
    for (const id of created.users) { try { await admin.auth.admin.deleteUser(id); } catch {} await admin.from('profiles').delete().eq('id', id); }
    // print
    const pass = results.filter(r => r.pass).length;
    console.log('\n════════ FUNCTIONAL TEST RESULTS ════════');
    results.forEach(r => console.log(`${r.pass ? '✅' : '❌'} ${r.name}${r.detail && !r.pass ? '  — ' + r.detail : ''}`));
    console.log(`\n${pass}/${results.length} passed`);
  }
})();
