import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

// ─── Manual-APK update checker ───────────────────────────────
// Since the app isn't (yet) on the Play Store, updates are distributed as
// a direct APK. On launch, compare the running version against a small
// public JSON manifest; if newer, offer to open the download link (Android
// then handles download → "install unknown app" prompt → install itself).
// Fails silently on any network error — must never block app usage.

const MANIFEST_URL = 'https://raw.githubusercontent.com/soltan02/kine-capinet-app/master/update.json';

export interface UpdateManifest {
  latestVersion: string;
  apkUrl: string;
  notes?: string;
}

export interface UpdateCheckResult {
  available: boolean;
  latestVersion?: string;
  apkUrl?: string;
  notes?: string;
}

/** Compares dotted version strings, e.g. "1.6.10" vs "1.6.2" → positive (a > b). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  if (Platform.OS !== 'android') return { available: false };
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-store' } as any);
    if (!res.ok) return { available: false };
    const manifest = (await res.json()) as UpdateManifest;
    const currentVersion = Constants.expoConfig?.version || '0.0.0';
    if (manifest?.latestVersion && compareVersions(manifest.latestVersion, currentVersion) > 0) {
      return { available: true, latestVersion: manifest.latestVersion, apkUrl: manifest.apkUrl, notes: manifest.notes };
    }
    return { available: false };
  } catch {
    return { available: false };
  }
}

export async function openUpdateUrl(url: string): Promise<void> {
  await Linking.openURL(url);
}
