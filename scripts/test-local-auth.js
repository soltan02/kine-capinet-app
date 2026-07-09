// Exercises the local-mode password hashing logic (src/lib/passwordHash.ts).
// That module has zero RN-specific imports, so its logic is reproduced here
// verbatim (not through the TS module system) to run under plain Node —
// consistent with the other scripts/*.js checks in this repo.
const bcrypt = require('bcryptjs');

const BCRYPT_RE = /^\$2[aby]?\$/;
const BCRYPT_COST = 10;

function legacySimpleHash(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0') + password.length.toString(16);
}
function isLegacyHash(hash) { return !BCRYPT_RE.test(hash); }
function hashPassword(password) { return bcrypt.hashSync(password, BCRYPT_COST); }
function verifyPassword(password, storedHash) {
  if (isLegacyHash(storedHash)) return legacySimpleHash(password) === storedHash;
  return bcrypt.compareSync(password, storedHash);
}

const ok = (name, cond, detail = '') => console.log((cond ? '✅' : '❌'), name, detail ? `(${detail})` : '');
let allPassed = true;
const check = (name, cond, detail) => { ok(name, cond, detail); if (!cond) allPassed = false; };

// 1. New hash: correct password verifies
const hash1 = hashPassword('CorrectHorse123!');
check('bcrypt hash format', !isLegacyHash(hash1), hash1.slice(0, 7));
check('correct password verifies', verifyPassword('CorrectHorse123!', hash1) === true);

// 2. New hash: wrong password rejected
check('wrong password rejected', verifyPassword('WrongPassword', hash1) === false);

// 3. Two hashes of the same password are different (real salting)
const hash2 = hashPassword('CorrectHorse123!');
check('same password → different hashes (real salt, not reused)', hash1 !== hash2);
check('second hash still verifies correctly', verifyPassword('CorrectHorse123!', hash2) === true);

// 4. Legacy hash: detected correctly, verifies against the OLD algorithm
const legacy = legacySimpleHash('OldPassword1');
check('legacy hash is detected as legacy', isLegacyHash(legacy) === true);
check('legacy password verifies via legacy path', verifyPassword('OldPassword1', legacy) === true);
check('legacy path rejects wrong password', verifyPassword('WrongOne', legacy) === false);

// 5. Migration path: after a successful legacy verify, re-hashing with
// hashPassword() must produce a bcrypt hash that verifies going forward
// (mirrors verifyLocalCredentials()'s transparent-migration branch).
const migrated = hashPassword('OldPassword1');
check('migrated hash is bcrypt (not legacy)', !isLegacyHash(migrated));
check('migrated hash verifies the same password', verifyPassword('OldPassword1', migrated) === true);
check('old legacy hash no longer matches after rotation to bcrypt format', migrated !== legacy);

console.log(allPassed ? '\nAll local-auth hashing checks passed.' : '\nSOME CHECKS FAILED.');
process.exit(allPassed ? 0 : 1);
