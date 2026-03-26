export type InviteStatus = 'SENT' | 'ACCEPTED' | 'DECLINED' | 'CANCELED' | string;

export interface InviteProfile {
  city?: string;
  country?: string;
  desiredRole?: string;
  totalExperienceMonths?: number;
  skills?: string[];
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

export interface SuggestedCandidate {
  candidate: InvitePerson;
  matching: {
    score: number;
    reasons: string[];
    skillMatchCount: number;
  };
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
