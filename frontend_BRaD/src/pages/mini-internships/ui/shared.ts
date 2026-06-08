import type {
  MiniInternshipFile,
  SubmissionExternalLink,
  TaskDecisionStatus,
  TaskSubmissionDetail,
  TaskSubmissionSummary,
} from '@entities/mini-internship';

export const cardStyle = {
  backgroundColor: 'var(--surface-base)',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
};

export const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
};

export const formatEnumLabel = (value?: string | null): string => {
  if (!value) {
    return '—';
  }

  return value
    .toString()
    .toLowerCase()
    .split('_')
    .map((chunk) => `${chunk.slice(0, 1).toUpperCase()}${chunk.slice(1)}`)
    .join(' ');
};

export const splitLines = (value: string): string[] => {
  return value
    .split(/\n|,/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

export const joinLines = (items: string[]): string => {
  return items.filter(Boolean).join('\n');
};

export const normalizeDecisionStatus = (value?: string | null): TaskDecisionStatus => {
  const normalized = String(value || 'reviewed').trim().toLowerCase();

  if (normalized === 'accepted' || normalized === 'rejected' || normalized === 'shortlisted') {
    return normalized;
  }

  return 'reviewed';
};

export const getPersonName = (
  person?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null,
  fallback = 'Unknown user',
): string => {
  if (!person) {
    return fallback;
  }

  const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim();
  return fullName || person.email || fallback;
};

export const getSubmissionLinks = (
  links?: SubmissionExternalLink[] | string[] | null,
): string[] => {
  if (!Array.isArray(links)) {
    return [];
  }

  return links
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry.trim();
      }

      return entry?.url?.trim() || '';
    })
    .filter(Boolean);
};

export const getFileLabel = (file?: MiniInternshipFile | null): string => {
  if (!file) {
    return 'Untitled file';
  }

  return file.filename || file.type || file.id || 'Untitled file';
};

export const getSubmissionScoreAverage = (submission?: TaskSubmissionSummary | TaskSubmissionDetail | null): number => {
  if (!submission) {
    return 0;
  }

  const score = submission.weightedScore ?? submission.averageScore ?? submission.overallScore ?? 0;
  return Number.isFinite(score) ? score : 0;
};

export const formatPercent = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0%';
  }

  return `${Math.round(value)}%`;
};
