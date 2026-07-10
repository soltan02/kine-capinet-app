# Onboarding a new clinic

This is the repeatable checklist for selling Cabinet Azzabi Farouk to a new clinic. Each
clinic gets its own fully isolated Supabase backend (separate database, no
data ever crosses between clinics) — the same Android app/Play Store listing
is reused for every customer; only a one-time **setup code** differs per
clinic.

You'll need: a Supabase account with an organization, your Supabase
**management API token** (`sbp_...`, from https://supabase.com/dashboard/account/tokens),
the Supabase CLI (`npx supabase ...`), and the Gemini API key you already use
(the same key is reused across every clinic — it's not tenant-specific).

## 1. Create the new Supabase project

Via the [Supabase dashboard](https://supabase.com/dashboard) (New Project), or the management API:

```bash
curl -X POST "https://api.supabase.com/v1/projects" \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"<clinic-name>","organization_id":"<your-org-id>","db_pass":"<strong-password>","region":"eu-west-1","plan":"free"}'
```

Note the returned project `ref` (e.g. `abcdxyz...`) — you'll need it for every step below.

## 2. Apply the schema

`supabase/schema.sql` in this repo is the complete source of truth (tables, RLS
policies, triggers, storage bucket policies, the backups table/function/cron
job). Apply it in one shot via the management API's SQL endpoint:

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/<ref>/database/query" \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @<(node -e "console.log(JSON.stringify({query: require('fs').readFileSync('supabase/schema.sql','utf8')}))")
```

Then enable `pg_cron` (required for the automatic weekly backup) if not already on:

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/<ref>/database/query" \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"CREATE EXTENSION IF NOT EXISTS pg_cron;"}'
```

## 3. Create the storage bucket

```bash
curl -s -X POST "https://<ref>.supabase.co/storage/v1/bucket" \
  -H "Authorization: Bearer <service_role_key>" -H "Content-Type: application/json" \
  -d '{"id":"client-documents","public":false}'
```

## 4. Deploy the edge functions

```bash
export SUPABASE_ACCESS_TOKEN=$SUPABASE_MANAGEMENT_TOKEN
npx supabase functions deploy create-user --project-ref <ref> --no-verify-jwt
npx supabase functions deploy admin-update-password --project-ref <ref> --no-verify-jwt
npx supabase functions deploy analyze-patient --project-ref <ref> --no-verify-jwt
```

## 5. Set secrets

```bash
npx supabase secrets set GEMINI_API_KEY="<same key used for every clinic>" --project-ref <ref>
```

(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` are injected automatically by Supabase for edge functions — no need to set them manually.)

## 6. Create the first admin account

Use the Supabase dashboard → Authentication → Add user (email + password), then
insert their profile row:

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/<ref>/database/query" \
  -H "Authorization: Bearer $SUPABASE_MANAGEMENT_TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"INSERT INTO public.profiles (id, full_name, role) VALUES ((SELECT id FROM auth.users WHERE email = '\''<admin-email>'\''), '\''<Admin Name>'\'', '\''admin'\'');"}'
```

## 7. Generate the clinic's setup code

Find the project's URL and anon key (Dashboard → Settings → API), then hand the clinic this single string to paste into the app on first run:

```
https://<ref>.supabase.co::<anon-key>
```

They open the app → **"Configuration du cabinet"** screen (only appears on
first run) → paste the code → **"Connecter mon cabinet"**. Done — no rebuild,
no new Play Store listing needed.

## 8. Verify

- Log in as the admin account you created.
- Add a test patient, appointment, session note, payment — confirm they save.
- Confirm no data from any other clinic is visible (it can't be — separate
  database entirely — but worth a sanity check the first few times).
