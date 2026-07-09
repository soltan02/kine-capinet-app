import * as SecureStore from 'expo-secure-store';

const LOCAL_USERS_KEY = 'kine_local_users';
const LOCAL_MODE_KEY = 'kine_local_mode';

export type LocalUser = {
  id: string;
  email: string;
  passwordHash: string;
  full_name: string;
  role: 'admin' | 'therapist' | 'receptionist';
};

function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0') + password.length.toString(16);
}

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
    passwordHash: simpleHash(user.password),
    full_name: user.full_name,
    role: user.role,
  };
  users.push(newUser);
  await saveLocalUsers(users);
  return newUser;
}

export async function verifyLocalCredentials(email: string, password: string): Promise<LocalUser | null> {
  const users = await getLocalUsers();
  const user = users.find(u => u.email === email.toLowerCase());
  if (!user) return null;
  if (user.passwordHash !== simpleHash(password)) return null;
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