import type { UserRole } from '@entities/user';

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'INTERVIEW'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface ApplicationCompany {
  id: string;
  name: string;
}

export interface ApplicationCity {
  id: string;
  name: string;
  countryCode?: string;
}

export interface ApplicationVacancy {
  id: string;
  title: string;
  status: string;
  company?: ApplicationCompany | null;
  publicationCity?: ApplicationCity | null;
}

export interface ApplicationCandidateProfile {
  city?: string;
  country?: string;
  desiredRole?: string;
  resumes?: ApplicationResume[];
}

export interface ApplicationResumeFile {
  id: string;
  status?: string;
  url?: string | null;
  filename?: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

export interface ApplicationResume {
  id: string;
  title?: string | null;
  fileId?: string | null;
  fileUrl?: string | null;
  isPrimary?: boolean;
  createdAt?: string;
  updatedAt?: string;
  file?: ApplicationResumeFile | null;
}

export interface ApplicationCandidate {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profile?: ApplicationCandidateProfile | null;
}

export interface Application {
  id: string;
  vacancyId: string;
  userId: string;
  status: ApplicationStatus;
  coverLetter?: string | null;
  chatId?: string | null;
  createdAt: string;
  updatedAt: string;
  vacancy?: ApplicationVacancy | null;
  candidate?: ApplicationCandidate | null;
}

export interface ApplicationTimelineActor {
  id: string;
  role: UserRole | string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface ApplicationTimelineEvent {
  id: string;
  fromStatus?: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  actorId?: string | null;
  note?: string | null;
  createdAt: string;
  actor?: ApplicationTimelineActor | null;
}

export interface ApplicationTimeline {
  applicationId: string;
  events: ApplicationTimelineEvent[];
}

export interface ApplicationListMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface ApplicationFilters {
  vacancyId?: string;
  candidateId?: string;
  hrUserId?: string;
  status?: ApplicationStatus | '';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}
