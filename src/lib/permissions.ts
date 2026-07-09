import { useAuthStore } from './store';
import type { UserRole } from './supabase';

// ─── Role hierarchy ──────────────────────────────────────────
// Higher index = more privileges
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  therapist: 2,
  receptionist: 1,
};

// ─── Permission definitions ──────────────────────────────────
export type Permission =
  | 'billing:view'
  | 'billing:manage'
  | 'clients:view'
  | 'clients:manage'
  | 'appointments:view'
  | 'appointments:manage'
  | 'sessions:view'
  | 'sessions:manage'
  | 'users:view'
  | 'users:manage'
  | 'settings:view'
  | 'settings:manage'
  | 'dashboard:view'
  | 'audit:view'
  | 'ai:analyze'
  | 'backups:manage';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'billing:view',
    'billing:manage',
    'clients:view',
    'clients:manage',
    'appointments:view',
    'appointments:manage',
    'sessions:view',
    'sessions:manage',
    'users:view',
    'users:manage',
    'settings:view',
    'settings:manage',
    'dashboard:view',
    'audit:view',
    'ai:analyze',
    'backups:manage',
  ],
  therapist: [
    'clients:view',
    'clients:manage',
    'appointments:view',
    'appointments:manage',
    'sessions:view',
    'sessions:manage',
    'billing:view',
    'settings:view',
    'dashboard:view',
    'ai:analyze',
  ],
  receptionist: [
    'clients:view',
    'clients:manage',
    'appointments:view',
    'appointments:manage',
    'billing:view',
    'billing:manage',
    'settings:view',
    'dashboard:view',
  ],
};

// ─── Hook ────────────────────────────────────────────────────
export function usePermissions() {
  const profile = useAuthStore((s) => s.profile);
  const role = profile?.role || 'receptionist';

  const permissions = ROLE_PERMISSIONS[role] || [];

  const can = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  const hasRole = (minimumRole: UserRole): boolean => {
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimumRole];
  };

  const isAdmin = role === 'admin';
  const isTherapist = role === 'therapist';
  const isReceptionist = role === 'receptionist';

  return {
    role,
    permissions,
    can,
    hasRole,
    isAdmin,
    isTherapist,
    isReceptionist,
  };
}

// ─── Utility for non-hook contexts ───────────────────────────
export function checkPermission(role: UserRole, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

export function checkRole(role: UserRole, minimumRole: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimumRole];
}