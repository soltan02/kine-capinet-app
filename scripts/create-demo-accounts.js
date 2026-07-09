import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ttuxuqjefezulbczdtix.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env');
  console.log('Get it from: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

// Use service_role key for admin operations (bypasses public signups restriction)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEMO_ACCOUNTS = [
  { email: 'admin@kine.com', password: 'admin123', full_name: 'Admin User', role: 'admin' },
  { email: 'therapist@kine.com', password: 'therapist123', full_name: 'Dr. Smith', role: 'therapist' },
  { email: 'receptionist@kine.com', password: 'reception123', full_name: 'Jane Doe', role: 'receptionist' },
  { email: 'staff@kine.com', password: 'staff123', full_name: 'John Staff', role: 'staff' },
];

async function createDemoAccounts() {
  console.log('Creating demo accounts with Admin API...\n');

  for (const account of DEMO_ACCOUNTS) {
    try {
      // Use admin API to create user (bypasses signups restriction)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.full_name,
        },
      });

      if (authError) {
        console.error(`❌ Failed to create ${account.email}:`, authError.message);
        continue;
      }

      if (!authData.user) {
        console.error(`❌ No user returned for ${account.email}`);
        continue;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: authData.user.id,
            full_name: account.full_name,
            role: account.role,
          },
          { onConflict: 'id' }
        );

      if (profileError) {
        console.error(`❌ Failed to create profile for ${account.email}:`, profileError.message);
      } else {
        console.log(`✅ Created ${account.role}: ${account.email} / ${account.password}`);
      }
    } catch (err) {
      console.error(`❌ Error creating ${account.email}:`, err.message);
    }
  }

  console.log('\n✅ Demo accounts created!');
  console.log('\nLogin credentials:');
  DEMO_ACCOUNTS.forEach(acc => {
    console.log(`  ${acc.role}: ${acc.email} / ${acc.password}`);
  });
}

createDemoAccounts();