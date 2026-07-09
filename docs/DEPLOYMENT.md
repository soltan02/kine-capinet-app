# Deployment plan

## 1. Production environment

1. Create or select a Supabase project for production.
2. Apply the SQL schema from [supabase/schema.sql](../supabase/schema.sql).
3. Configure the production Supabase URL and anon key in the app environment.
4. Make sure authentication is enabled for Email/Password in Supabase Auth.

## 2. User onboarding

1. Create the first admin user from the app sign-up flow or directly in Supabase Auth.
2. Add a matching row in the public profiles table with the desired role.
3. Invite therapists and staff users one by one and assign their role.
4. Share the login credentials securely and ask each user to change the password on first sign-in.

## 3. Desktop packaging

- Run:
  - `npm install`
  - `npm run electron:build`
- The packaged Windows artifact is generated under:
  - `dist-electron/win-unpacked/electron.exe`
- For a more polished distribution, add a signing certificate and publish an installer later.

## 4. Android and iOS rollout

1. Install Expo Application Services (EAS) CLI.
2. Configure EAS credentials for the Apple Developer and Google Play accounts.
3. Build production binaries with EAS:
   - `eas build -p android --profile production`
   - `eas build -p ios --profile production`
4. Test on a small pilot group first.
5. Publish to the app stores once the pilot is approved.

## 5. Post-launch checklist

- Verify authentication and role-based access.
- Review billing and audit logging for a test patient.
- Confirm attachments, session notes, and payments sync correctly.
- Monitor Supabase logs and app crash reports after release.
