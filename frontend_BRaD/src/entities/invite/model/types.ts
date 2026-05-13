export type InviteStatus = 'SENT' | 'ACCEPTED' | 'DECLINED' | 'CANCELED' | string;

export interface InviteProfile {
  city?: string;
  country?: string;
  desiredRole?: string;
  totalExperienceMonths?: number;
  skills?: string[];
  profileCompletenessPercent?: number;
}

export interface InvitePerson {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profile?: InviteProfile | null;
}

export interface InviteVacancySummary {
  id: string;
  title?: string;
  company?: {
    id?: string;
    name?: string;
  } | null;
}

export interface Invite {
  id: string;
  status: InviteStatus;
  message?: string;
  interviewAt?: string;
  createdAt?: string;
  updatedAt?: string;
  vacancy?: InviteVacancySummary | null;
  sender?: InvitePerson | null;
  candidate?: InvitePerson | null;
}

export interface SuggestedCandidateMatchingBreakdown {
  skills?: number;
  experienceRelevance?: number;
  compatibility?: number;
  profileCompleteness?: number;
  activityRecency?: number;
  penalties?: number;
}

export interface SuggestedCandidateMatching {
  score: number;
  normalizedScore?: number;
  skillCoveragePercent?: number;
  matchedRequiredSkills?: string[];
  missingRequiredSkills?: string[];
  profileCompletenessPercent?: number;
  breakdown?: SuggestedCandidateMatchingBreakdown | null;
  reasons: string[];
  // legacy fallback
  skillMatchCount?: number;
}

export interface SuggestedCandidate {
  candidate: InvitePerson;
  matching: SuggestedCandidateMatching;
  existingInvite?: {
    id?: string;
    status?: InviteStatus;
    createdAt?: string;
  } | null;
}

export interface InviteListMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface InviteFilters {
  vacancyId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface SendInvitePayload {
  vacancyId: string;
  candidateId: string;
  message?: string;
  interviewAt?: string;
}
