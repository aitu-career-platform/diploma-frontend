import type { UserRole } from './types';

const CANDIDATE_ALIASES = new Set(['candidate', 'user', 'applicant']);
const EMPLOYER_ALIASES = new Set(['hr', 'employer', 'recruiter']);

const sanitizeRole = (rawRole: unknown): string => {
  return String(rawRole || '')
    .trim()
    .toLowerCase()
    .replace(/^roles?[_:\-\s]*/, '')
    .replace(/^authority[_:\-\s]*/, '');
};

export function normalizeRole(rawRole: unknown): UserRole {
  const role = sanitizeRole(rawRole);

  if (CANDIDATE_ALIASES.has(role)) {
    return role === 'candidate' ? 'candidate' : 'user';
  }

  if (EMPLOYER_ALIASES.has(role)) {
    return role === 'employer' ? 'employer' : 'hr';
  }

  if (role === 'admin') {
    return 'admin';
  }

  if (role.includes('admin')) {
    return 'admin';
  }

  if (role.includes('hr') || role.includes('employ') || role.includes('recruit')) {
    return 'hr';
  }

  if (role.includes('candidate') || role.includes('user') || role.includes('applicant') || role.includes('student')) {
    return 'user';
  }

  return 'user';
}

const readNestedValue = (source: Record<string, unknown>, path: string[]): unknown => {
  let current: unknown = source;
  for (const key of path) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
};

const pickFromArray = (value: unknown): unknown => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.find((item) => typeof item === 'string' && item.trim().length > 0);
};

export function extractRoleClaim(payload: unknown): unknown {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return undefined;
  }

  const claims = payload as Record<string, unknown>;
  const directKeys = ['role', 'userRole', 'accountRole', 'type'];

  for (const key of directKeys) {
    if (claims[key] !== undefined) {
      return claims[key];
    }
  }

  const arrayKeys = ['roles', 'authorities', 'permissions'];
  for (const key of arrayKeys) {
    const fromArray = pickFromArray(claims[key]);
    if (fromArray !== undefined) {
      return fromArray;
    }

    if (typeof claims[key] === 'string') {
      return String(claims[key]).split(/[,\s]+/).find(Boolean);
    }
  }

  const realmRoles = readNestedValue(claims, ['realm_access', 'roles']);
  const fromRealmRoles = pickFromArray(realmRoles);
  if (fromRealmRoles !== undefined) {
    return fromRealmRoles;
  }

  const resourceAccess = readNestedValue(claims, ['resource_access']) as Record<string, unknown> | undefined;
  if (resourceAccess && typeof resourceAccess === 'object') {
    for (const service of Object.values(resourceAccess)) {
      if (typeof service === 'object' && service !== null && !Array.isArray(service)) {
        const fromService = pickFromArray((service as Record<string, unknown>).roles);
        if (fromService !== undefined) {
          return fromService;
        }
      }
    }
  }

  return undefined;
}

export function isCandidateRole(role?: UserRole | null): boolean {
  return role === 'user' || role === 'candidate';
}

export function isAdminRole(role?: UserRole | null): boolean {
  return role === 'admin';
}

export function isHrRole(role?: UserRole | null): boolean {
  return role === 'hr' || role === 'employer';
}

export function isEmployerRole(role?: UserRole | null): boolean {
  return isHrRole(role);
}

export function mapRoleToRegisterPayload(role: UserRole): 'CANDIDATE' | 'EMPLOYER' {
  if (role === 'hr' || role === 'employer') {
    return 'EMPLOYER';
  }

  return 'CANDIDATE';
}
