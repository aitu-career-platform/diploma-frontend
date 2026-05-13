import { create } from 'zustand';
import api, { getApiErrorMessage } from '@shared/lib/api';
import type {
  Invite,
  InviteFilters,
  InviteListMeta,
  SendInvitePayload,
  SuggestedCandidate,
} from './types';

interface InviteStore {
  suggestedCandidates: SuggestedCandidate[];
  hrInvites: Invite[];
  myInvites: Invite[];
  suggestionVacancy: { id?: string; title?: string; experienceLevel?: string } | null;
  hrMeta: InviteListMeta;
  myMeta: InviteListMeta;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  loadSuggestedCandidates: (vacancyId: string, limit?: number, offset?: number) => Promise<void>;
  sendInvite: (payload: SendInvitePayload) => Promise<Invite>;
  loadHrInvites: (filters?: InviteFilters) => Promise<void>;
  loadMyInvites: (filters?: InviteFilters) => Promise<void>;
}

const defaultMeta: InviteListMeta = {
  total: 0,
  limit: 20,
  offset: 0,
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const asString = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

const asNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const asOptionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = asNumber(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeMeta = (payload: unknown): InviteListMeta => {
  if (!isRecord(payload) || !isRecord(payload.meta)) {
    return defaultMeta;
  }

  return {
    total: asNumber(payload.meta.total),
    limit: asNumber(payload.meta.limit) || defaultMeta.limit,
    offset: asNumber(payload.meta.offset),
  };
};

const normalizeInvite = (payload: unknown): Invite | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const id = asString(payload.id);
  if (!id) {
    return null;
  }

  return {
    id,
    status: asString(payload.status) || 'SENT',
    message: asString(payload.message) || undefined,
    interviewAt: asString(payload.interviewAt) || undefined,
    createdAt: asString(payload.createdAt) || undefined,
    updatedAt: asString(payload.updatedAt) || undefined,
    vacancy: isRecord(payload.vacancy)
      ? {
          id: asString(payload.vacancy.id),
          title: asString(payload.vacancy.title) || undefined,
          company: isRecord(payload.vacancy.company)
            ? {
                id: asString(payload.vacancy.company.id) || undefined,
                name: asString(payload.vacancy.company.name) || undefined,
              }
            : null,
        }
      : null,
    sender: isRecord(payload.sender)
      ? {
          id: asString(payload.sender.id),
          email: asString(payload.sender.email) || undefined,
          firstName: asString(payload.sender.firstName) || undefined,
          lastName: asString(payload.sender.lastName) || undefined,
        }
      : null,
      candidate: isRecord(payload.candidate)
      ? {
          id: asString(payload.candidate.id),
          email: asString(payload.candidate.email) || undefined,
          firstName: asString(payload.candidate.firstName) || undefined,
          lastName: asString(payload.candidate.lastName) || undefined,
          profile: isRecord(payload.candidate.profile)
            ? {
                city: asString(payload.candidate.profile.city) || undefined,
                country: asString(payload.candidate.profile.country) || undefined,
                desiredRole: asString(payload.candidate.profile.desiredRole) || undefined,
                totalExperienceMonths: asNumber(payload.candidate.profile.totalExperienceMonths) || undefined,
                skills: Array.isArray(payload.candidate.profile.skills)
                  ? payload.candidate.profile.skills.filter((entry): entry is string => typeof entry === 'string')
                  : [],
                profileCompletenessPercent:
                  asOptionalNumber(payload.candidate.profile.profileCompletenessPercent),
              }
            : null,
        }
      : null,
  };
};

const normalizeInviteList = (payload: unknown): Invite[] => {
  const items =
    isRecord(payload) && Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];

  return items
    .map((entry) => normalizeInvite(entry))
    .filter((entry): entry is Invite => Boolean(entry));
};

const normalizeSuggestedCandidates = (payload: unknown): SuggestedCandidate[] => {
  const items =
    isRecord(payload) && Array.isArray(payload.items)
      ? payload.items
      : [];

  const suggested: SuggestedCandidate[] = [];

  items.forEach((entry) => {
    if (!isRecord(entry) || !isRecord(entry.candidate)) {
      return;
    }

    const candidateId = asString(entry.candidate.id);
    if (!candidateId) {
      return;
    }

    suggested.push({
      candidate: {
        id: candidateId,
        email: asString(entry.candidate.email) || undefined,
        firstName: asString(entry.candidate.firstName) || undefined,
        lastName: asString(entry.candidate.lastName) || undefined,
        profile: isRecord(entry.candidate.profile)
          ? {
              city: asString(entry.candidate.profile.city) || undefined,
              country: asString(entry.candidate.profile.country) || undefined,
              desiredRole: asString(entry.candidate.profile.desiredRole) || undefined,
              totalExperienceMonths: asNumber(entry.candidate.profile.totalExperienceMonths) || undefined,
              skills: Array.isArray(entry.candidate.profile.skills)
                ? entry.candidate.profile.skills.filter((skill): skill is string => typeof skill === 'string')
                : [],
              profileCompletenessPercent:
                asOptionalNumber(entry.candidate.profile.profileCompletenessPercent),
            }
          : null,
      },
      matching: isRecord(entry.matching)
        ? {
          score: asNumber(entry.matching.score),
          normalizedScore: asOptionalNumber(entry.matching.normalizedScore),
          skillCoveragePercent: asOptionalNumber(entry.matching.skillCoveragePercent),
          matchedRequiredSkills: Array.isArray(entry.matching.matchedRequiredSkills)
            ? entry.matching.matchedRequiredSkills.filter((value): value is string => typeof value === 'string')
            : [],
          missingRequiredSkills: Array.isArray(entry.matching.missingRequiredSkills)
            ? entry.matching.missingRequiredSkills.filter((value): value is string => typeof value === 'string')
            : [],
          profileCompletenessPercent:
            asOptionalNumber(entry.matching.profileCompletenessPercent),
          breakdown: isRecord(entry.matching.breakdown)
            ? {
                skills: asOptionalNumber(entry.matching.breakdown.skills),
                experienceRelevance: asOptionalNumber(entry.matching.breakdown.experienceRelevance),
                compatibility: asOptionalNumber(entry.matching.breakdown.compatibility),
                profileCompleteness: asOptionalNumber(entry.matching.breakdown.profileCompleteness),
                activityRecency: asOptionalNumber(entry.matching.breakdown.activityRecency),
                penalties: asOptionalNumber(entry.matching.breakdown.penalties),
              }
            : null,
            reasons: Array.isArray(entry.matching.reasons)
              ? entry.matching.reasons.filter((reason): reason is string => typeof reason === 'string')
              : [],
            // Legacy fallback from matching v1
            skillMatchCount: asOptionalNumber(entry.matching.skillMatchCount),
          }
        : {
            score: 0,
            normalizedScore: undefined,
            skillCoveragePercent: undefined,
            matchedRequiredSkills: [],
            missingRequiredSkills: [],
            profileCompletenessPercent: undefined,
            breakdown: null,
            reasons: [],
            skillMatchCount: undefined,
          },
      existingInvite: isRecord(entry.existingInvite)
        ? {
            id: asString(entry.existingInvite.id) || undefined,
            status: asString(entry.existingInvite.status) || undefined,
            createdAt: asString(entry.existingInvite.createdAt) || undefined,
          }
        : null,
    });
  });

  return suggested;
};

const buildParams = (filters?: InviteFilters): Record<string, string | number> => {
  if (!filters) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  ) as Record<string, string | number>;
};

const upsertInvite = (items: Invite[], nextInvite: Invite): Invite[] => {
  const currentIndex = items.findIndex((item) => item.id === nextInvite.id);
  if (currentIndex >= 0) {
    return items.map((item) => (item.id === nextInvite.id ? nextInvite : item));
  }

  const pairIndex = items.findIndex((item) => {
    return (
      item.vacancy?.id === nextInvite.vacancy?.id &&
      item.candidate?.id === nextInvite.candidate?.id
    );
  });

  if (pairIndex >= 0) {
    return items.map((item, index) => (index === pairIndex ? nextInvite : item));
  }

  return [nextInvite, ...items];
};

export const useInviteStore = create<InviteStore>((set) => ({
  suggestedCandidates: [],
  hrInvites: [],
  myInvites: [],
  suggestionVacancy: null,
  hrMeta: defaultMeta,
  myMeta: defaultMeta,
  isLoading: false,
  isMutating: false,
  error: null,

  loadSuggestedCandidates: async (vacancyId, limit = 20, offset = 0) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get('/invites/suggest-candidates', {
        params: { vacancyId, limit, offset },
      });

      set({
        suggestedCandidates: normalizeSuggestedCandidates(response.data),
        suggestionVacancy: isRecord(response.data?.vacancy)
          ? {
              id: asString(response.data.vacancy.id) || undefined,
              title: asString(response.data.vacancy.title) || undefined,
              experienceLevel: asString(response.data.vacancy.experienceLevel) || undefined,
            }
          : null,
        isLoading: false,
      });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load suggested candidates');
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  sendInvite: async (payload) => {
    set({ isMutating: true, error: null });

    try {
      const response = await api.post('/invites', {
        vacancyId: payload.vacancyId,
        candidateId: payload.candidateId,
        message: payload.message?.trim() || undefined,
        interviewAt: payload.interviewAt || undefined,
      });
      const invite = normalizeInvite(response.data);

      if (!invite) {
        throw new Error('Invite response is invalid');
      }

      set((state) => ({
        hrInvites: upsertInvite(state.hrInvites, invite),
        suggestedCandidates: state.suggestedCandidates.map((entry) =>
          entry.candidate.id === payload.candidateId
            ? {
                ...entry,
                existingInvite: {
                  id: invite.id,
                  status: invite.status,
                  createdAt: invite.createdAt,
                },
              }
            : entry,
        ),
        isMutating: false,
      }));

      return invite;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to send invite');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  loadHrInvites: async (filters) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get('/invites/hr', {
        params: buildParams(filters),
      });

      set({
        hrInvites: normalizeInviteList(response.data),
        hrMeta: normalizeMeta(response.data),
        isLoading: false,
      });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load invites');
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  loadMyInvites: async (filters) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get('/invites/my', {
        params: buildParams(filters),
      });

      set({
        myInvites: normalizeInviteList(response.data),
        myMeta: normalizeMeta(response.data),
        isLoading: false,
      });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load invites');
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },
}));
