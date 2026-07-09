Supabase Edge Function: admin-update-password

What it does
- Securely updates another user's password using the Supabase Service Role key.
- Verifies the caller is an authenticated admin (checks `profiles.role = 'admin'`).
- Logs an audit entry to `audit_logs`.

Environment variables (set in Supabase Functions settings or your deployment environment):
- `SUPABASE_URL` - your Supabase project URL (https://xyz.supabase.co)
- `SUPABASE_SERVICE_ROLE_KEY` - the service role key (KEEP SECRET)
- `SUPABASE_ANON_KEY` - the anon/public key (used to validate the calling session)

Request
- Method: POST
- Headers:
  - `Authorization: Bearer <admin_access_token>` (admin user's session access token)
  - `Content-Type: application/json`
- Body JSON:
  {
    "targetUserId": "<uuid-of-target-user>",
    "newPassword": "newSecurePassword123"
  }

Response
- 200: { "status": "ok" }
- 400: invalid body
- 401: unauthorized
- 403: forbidden (not an admin)
- 500: server error

Client example (JS/React Native)
```js
async function adminUpdatePassword(functionUrl, adminAccessToken, targetUserId, newPassword) {
  const res = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ targetUserId, newPassword })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

Deployment
- Install and configure Supabase CLI and run:

```bash
supabase functions deploy admin-update-password --project-ref <your-ref>
```

Set the environment variables in the Supabase dashboard for the function or using the CLI.

Security notes
- Never store or expose `SUPABASE_SERVICE_ROLE_KEY` in client apps.
- The function validates the caller's access token and confirms the caller has `profiles.role = 'admin'`.
