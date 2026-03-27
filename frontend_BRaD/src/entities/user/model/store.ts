import { create } from 'zustand';
import type { User, AuthUser } from './types';
import api, { getApiErrorMessage } from '@shared/lib/api';
import { decodeJWT } from '@shared/lib/jwt';
import {
  extractRoleClaim,
  isCandidateRole,
  isHrRole,
  mapRoleToRegisterPayload,
  normalizeRole,
} from './role';

interface UserStore {
  currentUser: AuthUser | null;
  users: Record<string, User>;
  isAuthenticated: boolean;
  currentProfile: Record<string, unknown> | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: 'user' | 'candidate' | 'hr' | 'employer') => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  getUser: (id: string) => User | undefined;
  loadProfile: () => Promise<void>;
  updateProfile: (_userId: string, data: Partial<User>) => Promise<void>;
}

const mockUsers: Record<string, User> = {
  rakhat: {
    id: 'rakhat',
    email: 'rakhat@example.com',
    name: 'Rakhat',
    role: 'user',
    status: 'active',
    avatar: '/images/avatars/user1.jpg',
    bio: 'Experienced developer passionate about building great products',
    location: 'Remote',
    skills: ['React', 'TypeScript', 'Node.js', 'Full Stack'],
    experience: '5+ years',
    createdAt: '2023-01-01',
  },
  user1: {
    id: 'user1',
    email: 'john@example.com',
    name: 'John Doe',
    role: 'user',
    status: 'active',
    avatar: '/images/avatars/user1.jpg',
    bio: 'Experienced frontend developer passionate about React and TypeScript',
    location: 'San Francisco, CA',
    skills: ['React', 'TypeScript', 'Next.js', 'Node.js'],
    experience: '5 years',
    createdAt: '2023-01-01',
  },
  user2: {
    id: 'user2',
    email: 'sarah@example.com',
    name: 'Sarah Johnson',
    role: 'user',
    status: 'active',
    avatar: '/images/avatars/user2.jpg',
    bio: 'UI/UX Designer with a passion for creating beautiful and functional interfaces',
    location: 'New York, NY',
    skills: ['Figma', 'Adobe XD', 'User Research', 'Prototyping'],
    experience: '3 years',
    createdAt: '2023-02-01',
  },
  user3: {
    id: 'user3',
    email: 'mike@example.com',
    name: 'Mike Chen',
    role: 'user',
    status: 'active',
    avatar: '/images/avatars/user3.jpg',
    bio: 'Full-stack developer specializing in modern web technologies',
    location: 'Seattle, WA',
    skills: ['JavaScript', 'Python', 'Django', 'PostgreSQL'],
    experience: '4 years',
    createdAt: '2023-03-01',
  },
  user4: {
    id: 'user4',
    email: 'emily@example.com',
    name: 'Emily Rodriguez',
    role: 'user',
    status: 'active',
    avatar: '/images/avatars/user4.jpg',
    bio: 'Marketing professional with expertise in digital campaigns and brand strategy',
    location: 'Los Angeles, CA',
    skills: ['Digital Marketing', 'SEO', 'Content Strategy', 'Analytics'],
    experience: '6 years',
    createdAt: '2023-04-01',
  },
  user5: {
    id: 'user5',
    email: 'david@example.com',
    name: 'David Kim',
    role: 'user',
    status: 'active',
    avatar: '/images/avatars/user5.jpg',
    bio: 'Backend engineer focused on scalable systems and cloud infrastructure',
    location: 'Austin, TX',
    skills: ['Go', 'Kubernetes', 'AWS', 'Microservices'],
    experience: '7 years',
    createdAt: '2023-05-01',
  },
  user6: {
    id: 'user6',
    email: 'lisa@example.com',
    name: 'Lisa Anderson',
    role: 'user',
    status: 'active',
    avatar: '/images/avatars/user6.jpg',
    bio: 'Product manager with a technical background and strong analytical skills',
    location: 'Boston, MA',
    skills: ['Product Strategy', 'Agile', 'Data Analysis', 'Stakeholder Management'],
    experience: '5 years',
    createdAt: '2023-06-01',
  },
  emp1: {
    id: 'emp1',
    email: 'hr@techcorp.com',
    name: 'TechCorp HR',
    role: 'hr',
    status: 'active',
    avatar: '/images/avatars/user1.jpg',
    company: 'TechCorp',
    website: 'https://techcorp.com',
    createdAt: '2022-01-01',
  },
  emp2: {
    id: 'emp2',
    email: 'contact@designstudio.com',
    name: 'DesignStudio Team',
    role: 'hr',
    status: 'active',
    avatar: '/images/avatars/user2.jpg',
    company: 'DesignStudio',
    website: 'https://designstudio.com',
    createdAt: '2022-02-01',
  },
  emp3: {
    id: 'emp3',
    email: 'careers@cloudtech.com',
    name: 'CloudTech Recruiting',
    role: 'hr',
    status: 'active',
    avatar: '/images/avatars/user3.jpg',
    company: 'CloudTech',
    website: 'https://cloudtech.com',
    createdAt: '2022-03-01',
  },
  emp4: {
    id: 'emp4',
    email: 'jobs@growthhub.com',
    name: 'GrowthHub HR',
    role: 'hr',
    status: 'active',
    avatar: '/images/avatars/user4.jpg',
    company: 'GrowthHub',
    website: 'https://growthhub.com',
    createdAt: '2022-04-01',
  },
};

const buildAuthUser = (accessToken: string, refreshToken?: string): AuthUser => {
  const payload = decodeJWT(accessToken);
  if (!payload) {
    throw new Error('Invalid token received');
  }

  const normalizedRole = normalizeRole(extractRoleClaim(payload));

  return {
    id: String(payload.sub),
    email: String(payload.email || ''),
    name: String(payload.name || payload.email?.split('@')?.[0] || 'User'),
    role: normalizedRole,
    accessToken,
    refreshToken,
  };
};

const getStoredAuthUser = (): AuthUser | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem('authUser');
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthUser;

    if (!parsed?.accessToken || !parsed?.id || !parsed?.email) {
      return null;
    }

    return {
      ...parsed,
      role: normalizeRole(parsed.role),
    };
  } catch {
    return null;
  }
};

const splitName = (value: string): { firstName?: string; lastName?: string } => {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  const parts = trimmed.split(/\s+/);
  const [firstName, ...rest] = parts;

  return {
    firstName,
    lastName: rest.length ? rest.join(' ') : undefined,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const getString = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

const getBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
};

const pickFirstDefined = (
  sources: Array<Record<string, unknown>>,
  keys: string[],
): unknown => {
  for (const source of sources) {
    for (const key of keys) {
      if (source[key] !== undefined) {
        return source[key];
      }
    }
  }

  return undefined;
};

const normalizeProfilePayload = (payload: unknown): Record<string, unknown> | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const user = isRecord(payload.user) ? payload.user : {};
  const candidateProfile = isRecord(payload.candidateProfile) ? payload.candidateProfile : {};
  const employerProfile = isRecord(payload.employerProfile) ? payload.employerProfile : {};
  const company = isRecord(employerProfile.company) ? employerProfile.company : {};
  const avatarFile = isRecord(user.avatarFile) ? user.avatarFile : {};
  const logoFile = isRecord(company.logoFile) ? company.logoFile : {};
  const notificationSettings = isRecord(payload.notificationSettings)
    ? payload.notificationSettings
    : isRecord(payload.notifications)
      ? payload.notifications
      : {};
  const telegramSources = [payload, user, candidateProfile, employerProfile, notificationSettings];

  return {
    role: payload.role,
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    city: candidateProfile.city || company.city || employerProfile.companyCity,
    country: candidateProfile.country || company.country || employerProfile.companyCountry,
    bio: candidateProfile.about || company.description || employerProfile.companyDescription,
    dateOfBirth: candidateProfile.dateOfBirth,
    desiredRole: candidateProfile.desiredRole,
    desiredSalary: candidateProfile.desiredSalary,
    graduationYear: candidateProfile.graduationYear,
    companyName: company.name || employerProfile.companyName,
    position: employerProfile.jobTitle,
    companyWebsite: company.website || employerProfile.companyWebsite,
    aboutCompany: company.description || employerProfile.companyDescription,
    companyContactEmail: company.contactEmail || employerProfile.companyContactEmail,
    companyContactPhone: company.contactPhone || employerProfile.companyContactPhone,
    hrEmail: employerProfile.hrEmail,
    hrPhone: employerProfile.hrPhone,
    avatarUrl: getString(avatarFile.downloadUrl) || getString(avatarFile.url) || undefined,
    avatarFile: Object.keys(avatarFile).length ? avatarFile : null,
    companyLogoUrl: getString(logoFile.downloadUrl) || getString(logoFile.url) || undefined,
    companyLogoFile: Object.keys(logoFile).length ? logoFile : null,
    resumes: Array.isArray(candidateProfile.resumes) ? candidateProfile.resumes : [],
    portfolioFiles: Array.isArray(candidateProfile.portfolioFiles)
      ? candidateProfile.portfolioFiles
      : [],
    telegramChatId:
      getString(
        pickFirstDefined(telegramSources, ['telegramChatId', 'telegram_chat_id', 'chatId']),
      ) || null,
    telegramNotificationsEnabled:
      getBoolean(
        pickFirstDefined(telegramSources, [
          'telegramNotificationsEnabled',
          'telegram_notifications_enabled',
        ]),
      ) ?? false,
    telegramNotifyInvites:
      getBoolean(
        pickFirstDefined(telegramSources, [
          'telegramNotifyInvites',
          'telegram_notify_invites',
        ]),
      ) ?? true,
    telegramNotifyApplications:
      getBoolean(
        pickFirstDefined(telegramSources, [
          'telegramNotifyApplications',
          'telegram_notify_applications',
        ]),
      ) ?? true,
    user,
    candidateProfile,
    employerProfile,
    notificationSettings,
  };
};

const syncCurrentUserProfile = (
  currentUser: AuthUser | null,
  profile: Record<string, unknown> | null,
): AuthUser | null => {
  if (!currentUser || !profile) {
    return currentUser;
  }

  const firstName = getString(profile.firstName);
  const lastName = getString(profile.lastName);
  const name = `${firstName} ${lastName}`.trim();
  const avatar = getString(profile.avatarUrl);

  if ((!name || currentUser.name === name) && (!avatar || currentUser.avatar === avatar)) {
    return currentUser;
  }

  return {
    ...currentUser,
    name: name || currentUser.name,
    avatar: avatar || currentUser.avatar,
  };
};

const storedAuthUser = getStoredAuthUser();

export const useUserStore = create<UserStore>((set, get) => ({
  currentUser: storedAuthUser,
  users: mockUsers,
  isAuthenticated: Boolean(storedAuthUser),
  currentProfile: null,

  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken } = response.data;
      const authUser = buildAuthUser(accessToken, refreshToken);

      set({ currentUser: authUser, isAuthenticated: true });
      localStorage.setItem('authUser', JSON.stringify(authUser));

      try {
        const profileResponse = await api.get('/profile/me');
        const normalizedProfile = normalizeProfilePayload(profileResponse.data);
        const nextAuthUser = syncCurrentUserProfile(authUser, normalizedProfile);

        set({
          currentUser: nextAuthUser,
          currentProfile: normalizedProfile,
        });

        if (nextAuthUser) {
          localStorage.setItem('authUser', JSON.stringify(nextAuthUser));
        }
      } catch {
        set({ currentProfile: null });
      }
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Login failed'));
    }
  },

  register: async (email: string, password: string, name: string, role: 'user' | 'candidate' | 'hr' | 'employer') => {
    const normalizedRole = normalizeRole(role);
    const { firstName, lastName } = splitName(name);

    try {
      const payload: Record<string, unknown> = {
        email,
        password,
        role: mapRoleToRegisterPayload(normalizedRole),
        firstName,
        lastName,
      };

      if (isCandidateRole(normalizedRole)) {
        payload.candidateProfile = {};
      }

      if (isHrRole(normalizedRole)) {
        payload.employerProfile = {
          companyName: name.trim() || 'New Company',
          hrEmail: email,
        };
      }

      const response = await api.post('/auth/register', payload);
      if (response.data?.ok === false) {
        throw new Error('Registration failed');
      }
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Registration failed'));
    }
  },

  verifyEmail: async (email: string, code: string) => {
    try {
      const response = await api.post('/auth/verify-email', { email, code });
      const { accessToken, refreshToken } = response.data;
      const authUser = buildAuthUser(accessToken, refreshToken);

      set({ currentUser: authUser, isAuthenticated: true });
      localStorage.setItem('authUser', JSON.stringify(authUser));

      try {
        const profileResponse = await api.get('/profile/me');
        const normalizedProfile = normalizeProfilePayload(profileResponse.data);
        const nextAuthUser = syncCurrentUserProfile(authUser, normalizedProfile);

        set({
          currentUser: nextAuthUser,
          currentProfile: normalizedProfile,
        });

        if (nextAuthUser) {
          localStorage.setItem('authUser', JSON.stringify(nextAuthUser));
        }
      } catch {
        set({ currentProfile: null });
      }
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Email verification failed'));
    }
  },

  requestPasswordReset: async (email: string) => {
    try {
      const response = await api.post('/auth/request-password-reset', { email });
      if (response.data?.ok === false) {
        throw new Error('Failed to request password reset');
      }
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to request password reset'));
    }
  },

  resetPassword: async (email: string, code: string, newPassword: string) => {
    try {
      const response = await api.post('/auth/reset-password', { email, code, newPassword });
      if (response.data?.ok === false) {
        throw new Error('Password reset failed');
      }
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Password reset failed'));
    }
  },

  logout: async () => {
    try {
      const authUser = get().currentUser;
      if (authUser?.refreshToken) {
        try {
          await api.post('/auth/logout', { refreshToken: authUser.refreshToken });
        } catch {
          // ignore logout API failure
        }
      }
    } finally {
      set({ currentUser: null, isAuthenticated: false, currentProfile: null });
      localStorage.removeItem('authUser');
    }
  },

  getUser: (id: string) => {
    return get().users[id];
  },

  loadProfile: async () => {
    try {
      const response = await api.get('/profile/me');
      const normalizedProfile = normalizeProfilePayload(response.data);
      const nextAuthUser = syncCurrentUserProfile(get().currentUser, normalizedProfile);

      set({
        currentUser: nextAuthUser,
        currentProfile: normalizedProfile,
      });

      if (nextAuthUser) {
        localStorage.setItem('authUser', JSON.stringify(nextAuthUser));
      }
    } catch {
      set({ currentProfile: null });
    }
  },

  updateProfile: async (_userId: string, data: Partial<User>) => {
    try {
      const currentUser = get().currentUser;
      if (!currentUser) {
        throw new Error('Please sign in again');
      }

      if (isCandidateRole(currentUser.role)) {
        const candidatePayload: Record<string, unknown> = {
          city: (data as Record<string, unknown>).city,
          country: (data as Record<string, unknown>).country,
          about: (data as Record<string, unknown>).bio,
          dateOfBirth: (data as Record<string, unknown>).dateOfBirth,
          desiredRole:
            (data as Record<string, unknown>).desiredRole ||
            (data as Record<string, unknown>).major,
          desiredSalary: (data as Record<string, unknown>).desiredSalary,
          graduationYear: (data as Record<string, unknown>).graduationYear,
        };

        const response = await api.patch('/profile/candidate/me', candidatePayload);
        const normalizedProfile = normalizeProfilePayload(response.data);
        const nextAuthUser = syncCurrentUserProfile(currentUser, normalizedProfile);

        set({
          currentUser: nextAuthUser,
          currentProfile: normalizedProfile,
        });

        if (nextAuthUser) {
          localStorage.setItem('authUser', JSON.stringify(nextAuthUser));
        }
      } else if (isHrRole(currentUser.role)) {
        const employerPayload: Record<string, unknown> = {
          companyName: (data as Record<string, unknown>).companyName,
          companyWebsite: (data as Record<string, unknown>).companyWebsite,
          companyCity: (data as Record<string, unknown>).city,
          companyCountry: (data as Record<string, unknown>).country,
          companyDescription: (data as Record<string, unknown>).aboutCompany,
          companyContactPhone: (data as Record<string, unknown>).companyContactPhone,
          jobTitle: (data as Record<string, unknown>).position,
          hrEmail: currentUser.email,
          hrPhone: (data as Record<string, unknown>).hrPhone,
          companyContactEmail: currentUser.email,
        };

        const response = await api.patch('/profile/employer/me', employerPayload);
        const normalizedProfile = normalizeProfilePayload(response.data);
        const nextAuthUser = syncCurrentUserProfile(currentUser, normalizedProfile);

        set({
          currentUser: nextAuthUser,
          currentProfile: normalizedProfile,
        });

        if (nextAuthUser) {
          localStorage.setItem('authUser', JSON.stringify(nextAuthUser));
        }
      }
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to update profile'));
    }
  },
}));
