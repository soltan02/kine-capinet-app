import AsyncStorage from '@react-native-async-storage/async-storage';
import { initSupabase } from './supabase';

// ─── Runtime clinic backend configuration ────────────────────
// Lets ONE app build/Play Store listing serve ANY clinic: each clinic's
// admin pastes a one-time "setup code" (generated during provisioning,
// see PROVISIONING.md) pointing the app at that clinic's own isolated
// Supabase project. Falls back to .env values for the existing
// single-clinic dev build — no setup screen appears when .env is set.

const CONFIG_KEY = 'clinic_backend_config';
const SEPARATOR = '::';

export function buildSetupCode(url: string, anonKey: string): string {
  return `${url}${SEPARATOR}${anonKey}`;
}

export function parseSetupCode(code: string): { url: string; anonKey: string } | null {
  const trimmed = code.trim();
  const idx = trimmed.indexOf(SEPARATOR);
  if (idx <= 0) return null;
  const url = trimmed.slice(0, idx).trim();
  const anonKey = trimmed.slice(idx + SEPARATOR.length).trim();
  if (!/^https?:\/\//.test(url) || anonKey.length < 20) return null;
  return { url, anonKey };
}

/** Checks AsyncStorage for a previously-saved clinic config and applies it. Returns true if found. */
export async function loadStoredClinicConfig(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(CONFIG_KEY);
  if (!raw) return false;
  const parsed = parseSetupCode(raw);
  if (!parsed) return false;
  initSupabase(parsed.url, parsed.anonKey);
  return true;
}

/** Validates a setup code is reachable (does not require auth) before committing to it. */
export async function testSetupCode(url: string, anonKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (res.status === 401 || res.status === 403) return { ok: false, error: 'invalid_key' };
    if (!res.ok && res.status !== 200) return { ok: false, error: 'unreachable' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'unreachable' };
  }
}

export async function saveClinicConfig(url: string, anonKey: string): Promise<void> {
  await AsyncStorage.setItem(CONFIG_KEY, buildSetupCode(url, anonKey));
  initSupabase(url, anonKey);
}
