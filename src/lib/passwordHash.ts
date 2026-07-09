import bcrypt from 'bcryptjs';

// ─── Local-mode password hashing ─────────────────────────────
// Pure logic, no RN-specific imports — safe to run/test under plain Node.
// bcryptjs needs a secure random source; React Native gets one from the
// `react-native-get-random-values` polyfill (imported once at app entry,
// see AppRoot.tsx) so salts are never generated with Math.random().

const BCRYPT_RE = /^\$2[aby]?\$/;
const BCRYPT_COST = 10;

/**
 * Legacy (pre-2026-07) hash: a non-cryptographic bit-shift, no salt.
 * Kept ONLY so verifyPassword can detect and transparently migrate old
 * local-mode accounts created before this fix — never used for new hashes.
 */
export function legacySimpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0') + password.length.toString(16);
}

export function isLegacyHash(hash: string): boolean {
  return !BCRYPT_RE.test(hash);
}

/** Salted bcrypt hash (salt is embedded in the returned string). */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_COST);
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (isLegacyHash(storedHash)) {
    return legacySimpleHash(password) === storedHash;
  }
  return bcrypt.compareSync(password, storedHash);
}
