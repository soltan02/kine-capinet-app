import * as SecureStore from 'expo-secure-store';
import { hashPassword, verifyPassword, isLegacyHash } from './passwordHash';

const LOCAL_USERS_KEY = 'kine_local_users';
const LOCAL_MODE_KEY = 'kine_local_mode';

export type LocalUser = {
  id: string;
  email: string;
  passwordHash: string;
  full_name: string;
  role: 'admin' | 'therapist' | 'receptionist';
};

async function getLocalUsers(): Promise<LocalUser[]> {
  const raw = await SecureStore.getItemAsync(LOCAL_USERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveLocalUsers(users: LocalUser[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch {
    // SecureStore is not available (e.g. on web), silently ignore
  }
}

export async function isLocalModeEnabled(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(LOCAL_MODE_KEY);
    return val === 'true';
  } catch {
    // SecureStore is not available (e.g. on web), default to non-local mode
    return false;
  }
}

export async function enableLocalMode(): Promise<void> {
  try {
    await SecureStore.setItemAsync(LOCAL_MODE_KEY, 'true');
  } catch {
    // SecureStore is not available (e.g. on web), silently ignore
  }
}

export async function addLocalUser(user: Omit<LocalUser, 'id' | 'passwordHash'> & { password: string }): Promise<LocalUser> {
  const users = await getLocalUsers();
  const exists = users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
  if (exists) {
    throw new Error('User already exists');
  }
  const newUser: LocalUser = {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    email: user.email.toLowerCase(),
    passwordHash: hashPassword(user.password),
    full_name: user.full_name,
    role: user.role,
  };
  users.push(newUser);
  await saveLocalUsers(users);
  return newUser;
}

export async function verifyLocalCredentials(email: string, password: string): Promise<LocalUser | null> {
  const users = await getLocalUsers();
  const idx = users.findIndex(u => u.email === email.toLowerCase());
  if (idx < 0) return null;
  const user = users[idx];
  if (!verifyPassword(password, user.passwordHash)) return null;

  // Transparent migration: upgrade a legacy (pre-bcrypt) hash to bcrypt on
  // the next successful login — never locks out an existing local user.
  if (isLegacyHash(user.passwordHash)) {
    const migrated = { ...user, passwordHash: hashPassword(password) };
    users[idx] = migrated;
    await saveLocalUsers(users);
    return migrated;
  }
  return user;
}

export async function getAllLocalUsers(): Promise<LocalUser[]> {
  return getLocalUsers();
}

export async function updateLocalUserRole(id: string, role: LocalUser['role']): Promise<void> {
  const users = await getLocalUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx >= 0) {
    users[idx].role = role;
    await saveLocalUsers(users);
  }
}

export async function deleteLocalUser(id: string): Promise<void> {
  const users = await getLocalUsers();
  await saveLocalUsers(users.filter(u => u.id !== id));
}