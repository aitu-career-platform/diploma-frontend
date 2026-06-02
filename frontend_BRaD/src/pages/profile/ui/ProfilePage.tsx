import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BellRing,
  Briefcase,
  CheckCheck,
  CheckCircle2,
  Copy,
  Building2,
  Compass,
  Eye,
  FileArchive,
  Download,
  ExternalLink,
  FileUp,
  Gauge,
  Globe,
  ImagePlus,
  Mail,
  MapPin,
  Pencil,
  RefreshCcw,
  Rocket,
  Send,
  Sparkles,
  MessageCircle,
  Trash2,
  UploadCloud,
  User,
  UserRoundX,
  X,
} from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input, Textarea } from '@shared/ui';
import { useUISettings } from '@shared/lib/ui-settings';
import api from '@shared/lib/api';
import {
  complianceApi,
  type CompanyVerificationMe,
  type CompanyVerificationStatus,
  type Complaint,
  type ComplaintStatus,
  type ComplaintTargetType,
  type ConsentType,
  type PrivacyExport,
} from '@entities/compliance';
import { isCandidateRole, isEmployerRole, useUserStore } from '@entities/user';
import { useFavoritesStore } from '@entities/favorite';
import { useInviteStore } from '@entities/invite';
import { useNotificationsStore, type AppNotification } from '@entities/notification';
import { useMediaStore, type MediaUploadTarget } from '@entities/media';
import type { UploadedFile } from '@entities/media';

interface ProfileFormValues {
  bio: string;
  city: string;
  country: string;
  dateOfBirth: string;
  desiredRole: string;
  desiredSalary: string;
  graduationYear: string;
  universityId: string;
  isNonStudent: boolean;
  companyName: string;
  position: string;
  companyWebsite: string;
  aboutCompany: string;
  companyContactPhone: string;
  hrPhone: string;
  openToWork: boolean;
  availability: string;
  hoursPerWeek: string;
  remoteReady: boolean;
  relocationReady: boolean;
  educationLevel: string;
  preferredEmploymentTypesText: string;
  preferredWorkFormatsText: string;
}

type ProfileTab = 'profile' | 'documents' | 'activity' | 'notifications' | 'privacy';
type PreferredFieldKey = 'preferredEmploymentTypesText' | 'preferredWorkFormatsText';
type UniversityOption = {
  id: string;
  name: string;
  shortName?: string | null;
  city?: string | null;
};

const privacyConsentTypes: ConsentType[] = ['PRIVACY', 'TERMS', 'MARKETING'];
const complaintTargetTypes: ComplaintTargetType[] = ['VACANCY', 'PROFILE', 'MESSAGE'];
const complaintStatuses: ComplaintStatus[] = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];
const companyVerificationStatuses: CompanyVerificationStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'RETRY_REQUIRED',
];

const preferredEmploymentTypeOptions = [
  { value: 'FULL_TIME', labelKey: 'profile.options.employment.fullTime' },
  { value: 'PART_TIME', labelKey: 'profile.options.employment.partTime' },
  { value: 'WATCH', labelKey: 'profile.options.employment.internship' },
  { value: 'PROJECT', labelKey: 'profile.options.employment.project' },
  { value: 'SIDE_JOB', labelKey: 'profile.options.employment.sideJob' },
] as const;

const preferredWorkFormatOptions = [
  { value: 'ONSITE', labelKey: 'profile.options.workFormat.onsite' },
  { value: 'REMOTE', labelKey: 'profile.options.workFormat.remote' },
  { value: 'HYBRID', labelKey: 'profile.options.workFormat.hybrid' },
] as const;

const candidateScoringRubric = {
  desiredRole: 15,
  city: 10,
  skills: 20,
  experience: 20,
  resume: 20,
  education: 10,
  country: 5,
} as const;

const candidateSkillLevelOptions = [
  { value: 'BEGINNER', labelKey: 'profile.options.skillLevel.beginner' },
  { value: 'INTERMEDIATE', labelKey: 'profile.options.skillLevel.intermediate' },
  { value: 'ADVANCED', labelKey: 'profile.options.skillLevel.advanced' },
] as const;

const candidateSkillSuggestions = [
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Node.js',
  'Python',
  'Django',
  'Java',
  'Spring',
  'SQL',
  'PostgreSQL',
  'MongoDB',
  'Docker',
  'Kubernetes',
  'AWS',
  'Git',
  'REST API',
  'GraphQL',
  'Figma',
  'UI/UX',
  'Data Analysis',
  'Communication',
  'English',
];

const cardStyle = {
  backgroundColor: 'var(--surface-base)',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
};

const avatarLogoMaxBytes = 15 * 1024 * 1024;
const resumePortfolioMaxBytes = 40 * 1024 * 1024;
const authStorageKey = 'authUser';
const avatarCachePrefix = 'uploadedAvatar';
const uploadedFilesCachePrefix = 'uploadedFiles';

const getUploadLimitBytes = (target: MediaUploadTarget): number => {
  return target === 'USER_AVATAR' || target === 'COMPANY_LOGO'
    ? avatarLogoMaxBytes
    : resumePortfolioMaxBytes;
};

const getUploadLimitLabel = (target: MediaUploadTarget): string => {
  return target === 'USER_AVATAR' || target === 'COMPANY_LOGO' ? '15MB' : '40MB';
};

const getAvatarCacheKey = (userId: string): string => `${avatarCachePrefix}:${userId}`;

const readCachedAvatar = (userId: string): { fileId?: string; url?: string } | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(getAvatarCacheKey(userId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { fileId?: unknown; url?: unknown };
    const fileId = typeof parsed.fileId === 'string' ? parsed.fileId : undefined;
    const url = typeof parsed.url === 'string' ? parsed.url : undefined;
    return fileId || url ? { fileId, url } : null;
  } catch {
    return null;
  }
};

const writeCachedAvatar = (userId: string, value: { fileId?: string; url?: string }): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(getAvatarCacheKey(userId), JSON.stringify(value));
};

const clearCachedAvatar = (userId: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(getAvatarCacheKey(userId));
};

const getUploadedFilesCacheKey = (
  userId: string,
  kind: 'resumes' | 'portfolio',
): string => `${uploadedFilesCachePrefix}:${kind}:${userId}`;

const readCachedUploadedFiles = (
  userId: string,
  kind: 'resumes' | 'portfolio',
): Record<string, unknown>[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = localStorage.getItem(getUploadedFilesCacheKey(userId, kind));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return getFileArray(parsed);
  } catch {
    return [];
  }
};

const writeCachedUploadedFiles = (
  userId: string,
  kind: 'resumes' | 'portfolio',
  files: Record<string, unknown>[],
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(getUploadedFilesCacheKey(userId, kind), JSON.stringify(files));
};

const getString = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

const getIdString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return '';
};

const extractTelegramChatId = (profile: Record<string, unknown> | null): string | null => {
  if (!profile) {
    return null;
  }

  const direct =
    getIdString(profile.telegramChatId) ||
    getIdString(profile.telegram_chat_id) ||
    getIdString(profile.chatId) ||
    getIdString(profile.chat_id);
  if (direct) {
    return direct;
  }

  const nestedSources = [
    getRecord(profile.telegram),
    getRecord(profile.notificationSettings),
    getRecord(profile.notifications),
  ].filter((entry): entry is Record<string, unknown> => Boolean(entry));

  for (const source of nestedSources) {
    const nested =
      getIdString(source.telegramChatId) ||
      getIdString(source.telegram_chat_id) ||
      getIdString(source.chatId) ||
      getIdString(source.chat_id);
    if (nested) {
      return nested;
    }

    const nestedTelegram = getRecord(source.telegram);
    if (nestedTelegram) {
      const deep =
        getIdString(nestedTelegram.telegramChatId) ||
        getIdString(nestedTelegram.telegram_chat_id) ||
        getIdString(nestedTelegram.chatId) ||
        getIdString(nestedTelegram.chat_id);
      if (deep) {
        return deep;
      }
    }
  }

  return null;
};

const syncAuthUserAvatar = (avatarUrl?: string): void => {
  const state = useUserStore.getState();
  const currentUser = state.currentUser;
  if (!currentUser) {
    return;
  }

  const nextUser = {
    ...currentUser,
    avatar: avatarUrl || undefined,
  };

  useUserStore.setState({ currentUser: nextUser });

  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(authStorageKey, JSON.stringify(nextUser));
};

const getBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return fallback;
};

const getRecord = (value: unknown): Record<string, unknown> | null => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const getFileArray = (value: unknown): Record<string, unknown>[] => {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> => typeof entry === 'object' && entry !== null)
    : [];
};

const getFileId = (file: Record<string, unknown> | null): string => {
  return getString(file?.fileId) || getString(getRecord(file?.file)?.id) || getString(file?.id);
};

const getFileHref = (file: Record<string, unknown> | null): string => {
  const nestedFile = getRecord(file?.file);

  return (
    getString(file?.fileDownloadUrl) ||
    getString(file?.downloadUrl) ||
    getString(nestedFile?.downloadUrl)
  );
};

const getFileName = (file: Record<string, unknown> | null): string => {
  const nestedFile = getRecord(file?.file);

  return (
    getString(file?.resumeTitle) ||
    getString(file?.title) ||
    getString(file?.name) ||
    getString(nestedFile?.resumeTitle) ||
    getString(nestedFile?.title) ||
    getString(nestedFile?.filename) ||
    getString(file?.filename) ||
    'Untitled file'
  );
};

const makeLocalFileEntry = (file: UploadedFile, extras?: Record<string, unknown>): Record<string, unknown> => {
  const href = file.downloadUrl || file.url || '';
  const nestedFile: Record<string, unknown> = {
    id: file.id,
    filename: file.filename,
  };

  if (href) {
    nestedFile.downloadUrl = href;
  }

  if (file.url) {
    nestedFile.url = file.url;
  }

  return {
    id: file.id,
    fileId: file.id,
    filename: file.filename,
    mimeType: file.mimeType || undefined,
    sizeBytes: file.sizeBytes || undefined,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    downloadUrl: href || undefined,
    file: nestedFile,
    ...(extras || {}),
  };
};

const formatFileSize = (value: unknown): string => {
  const size = typeof value === 'number' ? value : Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) {
    return 'Size unavailable';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let current = size;
  let index = 0;

  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }

  return `${current.toFixed(current >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const buildInitialValues = (profile: Record<string, unknown> | null): ProfileFormValues => {
  const preferredEmploymentTypes = Array.isArray(profile?.preferredEmploymentTypes)
    ? profile?.preferredEmploymentTypes.filter((entry): entry is string => typeof entry === 'string')
    : [];
  const preferredWorkFormats = Array.isArray(profile?.preferredWorkFormats)
    ? profile?.preferredWorkFormats.filter((entry): entry is string => typeof entry === 'string')
    : [];

  return {
    bio: getString(profile?.bio),
    city: getString(profile?.city),
    country: getString(profile?.country),
    dateOfBirth: getString(profile?.dateOfBirth),
    desiredRole: getString(profile?.desiredRole),
    desiredSalary:
      profile?.desiredSalary === null || profile?.desiredSalary === undefined
        ? ''
        : String(profile.desiredSalary),
    graduationYear: profile?.graduationYear ? String(profile.graduationYear) : '',
    universityId: getString(profile?.universityId),
    isNonStudent: getBoolean(profile?.isNonStudent, false),
    companyName: getString(profile?.companyName),
    position: getString(profile?.position),
    companyWebsite: getString(profile?.companyWebsite),
    aboutCompany: getString(profile?.aboutCompany),
    companyContactPhone: getString(profile?.companyContactPhone),
    hrPhone: getString(profile?.hrPhone),
    openToWork: getBoolean(profile?.openToWork, true),
    availability: getString(profile?.availability),
    hoursPerWeek:
      profile?.hoursPerWeek === null || profile?.hoursPerWeek === undefined
        ? ''
        : String(profile.hoursPerWeek),
    remoteReady: getBoolean(profile?.remoteReady, false),
    relocationReady: getBoolean(profile?.relocationReady, false),
    educationLevel: getString(profile?.educationLevel),
    preferredEmploymentTypesText: preferredEmploymentTypes.join(', '),
    preferredWorkFormatsText: preferredWorkFormats.join(', '),
  };
};

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
};

const formatInviteStatus = (status?: string): string => {
  return String(status || 'SENT')
    .toLowerCase()
    .split('_')
    .map((chunk) => `${chunk.slice(0, 1).toUpperCase()}${chunk.slice(1)}`)
    .join(' ');
};

const getInviteStatusStyle = (
  status?: string,
): { backgroundColor: string; color: string } => {
  const normalized = String(status || 'SENT').toUpperCase();

  if (normalized === 'ACCEPTED') {
    return { backgroundColor: 'var(--tone-success-bg)', color: 'var(--tone-success-text)' };
  }

  if (normalized === 'REJECTED') {
    return { backgroundColor: 'var(--tone-danger-bg)', color: 'var(--tone-danger-text)' };
  }

  if (normalized === 'EXPIRED') {
    return { backgroundColor: 'var(--tone-neutral-bg)', color: 'var(--tone-neutral-text)' };
  }

  return { backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' };
};

const formatEnum = (value?: string): string => {
  if (!value) {
    return '—';
  }

  return value
    .toLowerCase()
    .split('_')
    .map((chunk) => `${chunk.slice(0, 1).toUpperCase()}${chunk.slice(1)}`)
    .join(' ');
};

const listFromText = (value: string): string[] => {
  return value
    .split(/[\n,]/g)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const normalizeSkill = (value: string): string => value.replace(/\s+/g, ' ').trim();

const uniqueSkills = (skills: string[]): string[] => {
  const seen = new Set<string>();
  return skills.filter((skill) => {
    const normalized = normalizeSkill(skill);
    if (!normalized) {
      return false;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const toSkillLevelsRecord = (value: unknown): Record<string, string> => {
  const source = getRecord(value);
  if (!source) {
    return {};
  }

  const result: Record<string, string> = {};
  Object.entries(source).forEach(([rawSkill, rawLevel]) => {
    if (typeof rawSkill !== 'string' || typeof rawLevel !== 'string') {
      return;
    }

    const skill = rawSkill.trim().toLowerCase();
    const level = rawLevel.trim().toUpperCase();
    if (!skill || !['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(level)) {
      return;
    }
    result[skill] = level;
  });

  return result;
};

const normalizePreferredList = (value: string): string[] => {
  return Array.from(new Set(listFromText(value).map((entry) => entry.toUpperCase())));
};

const getNotificationHref = (notification: AppNotification): string | null => {
  const payload = notification.payload || {};
  const vacancyId = typeof payload.vacancyId === 'string' ? payload.vacancyId : '';

  if (notification.type === 'VACANCY_INVITE') {
    return vacancyId ? `/app/jobs/${vacancyId}` : '/app/profile#invites';
  }

  if (notification.type === 'NEW_APPLICATION') {
    return '/app/applications';
  }

  return null;
};

export const ProfilePage = () => {
  const { t } = useUISettings();
  const { currentUser, updateProfile, loadProfile, currentProfile } = useUserStore();
  const {
    items: favoriteItems,
    isLoading: favoritesLoading,
    loadMyFavorites,
  } = useFavoritesStore();
  const {
    myInvites,
    isLoading: invitesLoading,
    loadMyInvites,
  } = useInviteStore();
  const {
    items: notifications,
    meta: notificationsMeta,
    telegramSettings,
    telegramLinkSession,
    isLoading: notificationsLoading,
    isMutating: notificationsMutating,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    initializeTelegramSettings,
    updateTelegramSettings,
    createTelegramLink,
  } = useNotificationsStore();
  const {
    uploadAndAttach,
    deleteFile,
    getDownloadUrl,
    isUploading: isUploadingMedia,
    isDeleting: isDeletingMedia,
  } = useMediaStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activitySuccess, setActivitySuccess] = useState<string | null>(null);
  const [resumeTitle, setResumeTitle] = useState('');
  const [resumePrimary, setResumePrimary] = useState(true);
  const [isResumeUploadModalOpen, setIsResumeUploadModalOpen] = useState(false);
  const [isPortfolioUploadModalOpen, setIsPortfolioUploadModalOpen] = useState(false);
  const [resumeUploadFile, setResumeUploadFile] = useState<File | null>(null);
  const [portfolioUploadFile, setPortfolioUploadFile] = useState<File | null>(null);
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState('');
  const [resolvedCompanyLogoUrl, setResolvedCompanyLogoUrl] = useState('');
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [privacySuccess, setPrivacySuccess] = useState<string | null>(null);
  const [isPrivacyLoading, setIsPrivacyLoading] = useState(false);
  const [isPrivacyMutating, setIsPrivacyMutating] = useState(false);
  const [localResumeFiles, setLocalResumeFiles] = useState<Record<string, unknown>[]>([]);
  const [localPortfolioFiles, setLocalPortfolioFiles] = useState<Record<string, unknown>[]>([]);
  const [consentVersion, setConsentVersion] = useState('v1.0-2026-05-13');
  const [consentDraft, setConsentDraft] = useState<Record<ConsentType, boolean>>({
    PRIVACY: false,
    TERMS: false,
    MARKETING: false,
  });
  const [consents, setConsents] = useState<
    Array<{
      id: string;
      type: ConsentType;
      version: string;
      accepted: boolean;
      createdAt?: string;
    }>
  >([]);
  const [privacyExport, setPrivacyExport] = useState<PrivacyExport | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteRequestStatus, setDeleteRequestStatus] = useState<string | null>(null);
  const [complaintTargetType, setComplaintTargetType] = useState<ComplaintTargetType>('VACANCY');
  const [complaintTargetId, setComplaintTargetId] = useState('');
  const [complaintReason, setComplaintReason] = useState('');
  const [complaintDetails, setComplaintDetails] = useState('');
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [companyVerification, setCompanyVerification] = useState<CompanyVerificationMe | null>(null);
  const [candidateSkills, setCandidateSkills] = useState<string[]>([]);
  const [candidateSkillDraft, setCandidateSkillDraft] = useState('');
  const [candidateSkillLevels, setCandidateSkillLevels] = useState<Record<string, string>>({});
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [isUniversitiesLoading, setIsUniversitiesLoading] = useState(false);
  const resumeFileInputRef = useRef<HTMLInputElement | null>(null);
  const portfolioFileInputRef = useRef<HTMLInputElement | null>(null);

  const profile = (currentProfile as Record<string, unknown> | null) || null;
  const universityRecord = getRecord(profile?.university);
  const universityName =
    getString(universityRecord?.shortName) ||
    getString(universityRecord?.name);
  const currentUserId = currentUser?.id || null;
  const currentUserRole = currentUser?.role || null;
  const rawUser = getRecord(profile?.user);
  const rawAvatarFile = getRecord(rawUser?.avatarFile) || getRecord(profile?.avatarFile);
  const avatarFileId = getFileId(rawAvatarFile);
  const companyLogoFileId = getFileId(getRecord(profile?.companyLogoFile));
  const avatarSrc =
    resolvedAvatarUrl ||
    getString(rawUser?.avatarUrl) ||
    getString(profile?.avatarUrl) ||
    getString(rawAvatarFile?.downloadUrl) ||
    getString(rawAvatarFile?.url) ||
    currentUser?.avatar ||
    '';
  const companyLogoSrc =
    resolvedCompanyLogoUrl ||
    getString(profile?.logoUrl) ||
    getString(profile?.companyLogoUrl) ||
    getFileHref(getRecord(profile?.companyLogoFile));
  const isTelegramLinked = Boolean(telegramSettings.telegramChatId);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<ProfileFormValues>({
    defaultValues: buildInitialValues(profile),
  });

  useEffect(() => {
    let cancelled = false;

    const loadUniversities = async () => {
      setIsUniversitiesLoading(true);
      try {
        const response = await api.get('/universities');
        const items = Array.isArray(response.data)
          ? response.data
          : [];
        if (!cancelled) {
          setUniversities(
            items
              .filter(
                (entry): entry is UniversityOption =>
                  typeof entry === 'object' &&
                  entry !== null &&
                  typeof (entry as { id?: unknown }).id === 'string' &&
                  typeof (entry as { name?: unknown }).name === 'string',
              )
              .map((entry) => ({
                id: entry.id,
                name: entry.name,
                shortName: entry.shortName ?? null,
                city: entry.city ?? null,
              })),
          );
        }
      } catch {
        if (!cancelled) {
          setUniversities([]);
        }
      } finally {
        if (!cancelled) {
          setIsUniversitiesLoading(false);
        }
      }
    };

    void loadUniversities();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!currentUserId) {
        setIsLoading(false);
        return;
      }

      try {
        await loadProfile();
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [currentUserId, loadProfile]);

  useEffect(() => {
    reset(buildInitialValues(profile));
  }, [profile, reset]);

  useEffect(() => {
    if (!avatarFileId) {
      const cached = currentUserId ? readCachedAvatar(currentUserId) : null;
      setResolvedAvatarUrl(cached?.url || '');
      return;
    }

    let cancelled = false;

    void getDownloadUrl(avatarFileId)
      .then((downloadUrl) => {
        if (!cancelled) {
          setResolvedAvatarUrl(downloadUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedAvatarUrl('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [avatarFileId, currentUserId, getDownloadUrl]);

  useEffect(() => {
    if (!companyLogoFileId) {
      setResolvedCompanyLogoUrl('');
      return;
    }

    let cancelled = false;

    void getDownloadUrl(companyLogoFileId)
      .then((downloadUrl) => {
        if (!cancelled) {
          setResolvedCompanyLogoUrl(downloadUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedCompanyLogoUrl('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [companyLogoFileId, getDownloadUrl]);

  useEffect(() => {
    const telegramChatId = extractTelegramChatId(profile);

    initializeTelegramSettings({
      telegramChatId,
      telegramNotificationsEnabled: getBoolean(profile?.telegramNotificationsEnabled, false),
      telegramNotifyInvites: getBoolean(profile?.telegramNotifyInvites, true),
      telegramNotifyApplications: getBoolean(profile?.telegramNotifyApplications, true),
    });
  }, [initializeTelegramSettings, profile]);

  useEffect(() => {
    if (!currentUserId || !currentUserRole) {
      return;
    }

    const loadSections = async () => {
      setIsPrivacyLoading(true);
      const tasks: Array<Promise<unknown>> = [loadNotifications({ limit: 20, offset: 0 })];
      const privacyTasks: Array<Promise<unknown>> = [
        complianceApi.listMyConsents().then((items) => {
          setConsents(items);
          const latestByType = items.reduce(
            (acc, entry) => {
              if (!(entry.type in acc)) {
                acc[entry.type] = entry.accepted;
              }
              return acc;
            },
            {} as Partial<Record<ConsentType, boolean>>,
          );

          setConsentDraft({
            PRIVACY: latestByType.PRIVACY ?? false,
            TERMS: latestByType.TERMS ?? false,
            MARKETING: latestByType.MARKETING ?? false,
          });
        }),
        complianceApi.listMyComplaints().then((items) => {
          setMyComplaints(items);
        }),
      ];

      if (isCandidateRole(currentUserRole)) {
        tasks.push(loadMyFavorites({ limit: 100 }));
        tasks.push(loadMyInvites({ limit: 20, offset: 0 }));
      }

      if (isEmployerRole(currentUserRole)) {
        privacyTasks.push(
          complianceApi.getMyCompanyVerification().then((snapshot) => {
            setCompanyVerification(snapshot);
          }),
        );
      }

      const appResults = await Promise.allSettled(tasks);
      const privacyResults = await Promise.allSettled(privacyTasks);

      const appFailed = appResults.some((result) => result.status === 'rejected');
      const privacyFailed = privacyResults.some((result) => result.status === 'rejected');

      if (appFailed) {
        setActivityError('Some activity blocks failed to load.');
      }

      if (privacyFailed) {
        setPrivacyError('Some privacy blocks failed to load.');
      }

      setIsPrivacyLoading(false);
    };

    void loadSections();
  }, [
    currentUserId,
    currentUserRole,
    loadMyFavorites,
    loadMyInvites,
    loadNotifications,
  ]);

  const isHr = isEmployerRole(currentUser?.role);
  const isCandidate = isCandidateRole(currentUser?.role);
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');
  const avatarFile = getRecord(profile?.avatarFile);
  const cachedAvatar = currentUserId ? readCachedAvatar(currentUserId) : null;
  const avatarFileIdForDelete = getFileId(avatarFile) || getString(cachedAvatar?.fileId);
  const companyLogoFile = getRecord(profile?.companyLogoFile);
  const resumes = getFileArray(profile?.resumes);
  const portfolioFiles = getFileArray(profile?.portfolioFiles);

  useEffect(() => {
    if (!currentUserId) {
      setLocalResumeFiles([]);
      setLocalPortfolioFiles([]);
      return;
    }

    setLocalResumeFiles(readCachedUploadedFiles(currentUserId, 'resumes'));
    setLocalPortfolioFiles(readCachedUploadedFiles(currentUserId, 'portfolio'));
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    writeCachedUploadedFiles(currentUserId, 'resumes', localResumeFiles);
  }, [currentUserId, localResumeFiles]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    writeCachedUploadedFiles(currentUserId, 'portfolio', localPortfolioFiles);
  }, [currentUserId, localPortfolioFiles]);

  useEffect(() => {
    const serverResumesById = new Map<string, Record<string, unknown>>();
    resumes.forEach((entry) => {
      const id = getFileId(entry);
      if (id) {
        serverResumesById.set(id, entry);
      }
    });

    if (!serverResumesById.size) {
      return;
    }

    setLocalResumeFiles((prev) =>
      prev.filter((entry) => {
        const id = getFileId(entry);
        if (!id) {
          return true;
        }

        const serverEntry = serverResumesById.get(id);
        if (!serverEntry) {
          return true;
        }

        const serverTitle =
          getString(serverEntry.resumeTitle) || getString(serverEntry.title) || getString(serverEntry.name);
        const localTitle = getString(entry.resumeTitle) || getString(entry.title) || getString(entry.name);

        return Boolean(localTitle && !serverTitle);
      }),
    );
  }, [resumes]);

  useEffect(() => {
    const serverPortfolioIds = new Set(
      portfolioFiles.map((entry) => getFileId(entry)).filter(Boolean),
    );
    if (!serverPortfolioIds.size) {
      return;
    }

    setLocalPortfolioFiles((prev) =>
      prev.filter((entry) => {
        const id = getFileId(entry);
        return !id || !serverPortfolioIds.has(id);
      }),
    );
  }, [portfolioFiles]);

  const displayedResumes = useMemo(() => {
    const seen = new Set<string>();
    const merged: Record<string, unknown>[] = [];
    const localById = new Map<string, Record<string, unknown>>();

    for (const localEntry of localResumeFiles) {
      const localId = getFileId(localEntry);
      if (localId) {
        localById.set(localId, localEntry);
      }
    }

    for (const file of resumes) {
      const id = getFileId(file);
      if (id && localById.has(id)) {
        const local = localById.get(id);
        const mergedEntry: Record<string, unknown> = {
          ...file,
          title:
            getString(file.title) ||
            getString(file.resumeTitle) ||
            getString(local?.title) ||
            getString(local?.resumeTitle) ||
            undefined,
          resumeTitle:
            getString(file.resumeTitle) ||
            getString(file.title) ||
            getString(local?.resumeTitle) ||
            getString(local?.title) ||
            undefined,
        };
        const key = id;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(mergedEntry);
        }
        localById.delete(id);
        continue;
      }

      const key = id || JSON.stringify(file);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(file);
    }

    for (const file of localResumeFiles) {
      const id = getFileId(file);
      const key = id || JSON.stringify(file);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(file);
    }

    return merged;
  }, [localResumeFiles, resumes]);
  const displayedPortfolioFiles = useMemo(() => {
    const seen = new Set<string>();
    const merged: Record<string, unknown>[] = [];

    for (const file of [...portfolioFiles, ...localPortfolioFiles]) {
      const id = getFileId(file);
      const key = id || JSON.stringify(file);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(file);
    }

    return merged;
  }, [localPortfolioFiles, portfolioFiles]);

  const availableTabs = useMemo(
    () =>
      [
        { id: 'profile' as const, label: t('profile.tabs.profile.label'), description: t('profile.tabs.profile.description') },
        {
          id: 'documents' as const,
          label: t('profile.tabs.documents.label'),
          description: isCandidate
            ? t('profile.tabs.documents.descriptionCandidate')
            : t('profile.tabs.documents.descriptionHr'),
        },
        ...(isCandidate
          ? [{
            id: 'activity' as const,
            label: t('profile.tabs.activity.label'),
            description: t('profile.tabs.activity.description'),
          }]
          : []),
        {
          id: 'notifications' as const,
          label: t('profile.tabs.notifications.label'),
          description: t('profile.tabs.notifications.description'),
        },
        { id: 'privacy' as const, label: t('profile.tabs.privacy.label'), description: t('profile.tabs.privacy.description') },
      ] satisfies Array<{ id: ProfileTab; label: string; description: string }>,
    [isCandidate, t],
  );

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab('profile');
    }
  }, [activeTab, availableTabs]);

  const displayName = useMemo(() => {
    const firstName = getString(profile?.firstName);
    const lastName = getString(profile?.lastName);
    const combined = `${firstName} ${lastName}`.trim();
    if (combined) {
      return combined;
    }

    if (currentUser?.name) {
      return currentUser.name;
    }

    return currentUser?.email?.split('@')[0] || 'User';
  }, [profile, currentUser]);

  const location = useMemo(() => {
    return [getString(profile?.city), getString(profile?.country)].filter(Boolean).join(', ');
  }, [profile]);
  const preferredEmploymentTypesRaw = watch('preferredEmploymentTypesText');
  const preferredWorkFormatsRaw = watch('preferredWorkFormatsText');
  const selectedEmploymentTypes = useMemo(
    () => normalizePreferredList(preferredEmploymentTypesRaw || ''),
    [preferredEmploymentTypesRaw],
  );
  const selectedWorkFormats = useMemo(
    () => normalizePreferredList(preferredWorkFormatsRaw || ''),
    [preferredWorkFormatsRaw],
  );
  const preferredEmploymentTypes = useMemo(() => {
    return Array.isArray(profile?.preferredEmploymentTypes)
      ? profile.preferredEmploymentTypes.filter(
          (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
        )
      : [];
  }, [profile]);
  const preferredWorkFormats = useMemo(() => {
    return Array.isArray(profile?.preferredWorkFormats)
      ? profile.preferredWorkFormats.filter(
          (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
        )
      : [];
  }, [profile]);
  const savedCandidateSkills = useMemo(() => {
    if (!Array.isArray(profile?.skills)) {
      return [];
    }

    return uniqueSkills(
      profile.skills.filter(
        (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0,
      ),
    ).map((entry) => normalizeSkill(entry));
  }, [profile]);
  const savedCandidateSkillLevels = useMemo(
    () => toSkillLevelsRecord(profile?.skillLevels),
    [profile],
  );
  const candidateScoring = useMemo(() => {
    const candidateProfileRecord = getRecord(profile?.candidateProfile);
    const experiences = Array.isArray(candidateProfileRecord?.experiences)
      ? candidateProfileRecord.experiences
      : [];
    const educations = Array.isArray(candidateProfileRecord?.educations)
      ? candidateProfileRecord.educations
      : [];

    const hasDesiredRole = Boolean(getString(profile?.desiredRole));
    const hasCity = Boolean(getString(profile?.city));
    const hasSkills = savedCandidateSkills.length > 0;
    const hasExperience = experiences.length > 0;
    const hasResume = resumes.length > 0;
    const hasEducation = educations.length > 0;
    const hasCountry = Boolean(getString(profile?.country));
    const isOpenToWork = getBoolean(profile?.openToWork, false);

    const checklist = [
      {
        key: 'desiredRole',
        label: t('profile.scoring.checklist.desiredRole'),
        description: t('profile.scoring.checklist.desiredRoleHint'),
        points: candidateScoringRubric.desiredRole,
        done: hasDesiredRole,
      },
      {
        key: 'skills',
        label: t('profile.scoring.checklist.skills'),
        description: t('profile.scoring.checklist.skillsHint'),
        points: candidateScoringRubric.skills,
        done: hasSkills,
      },
      {
        key: 'experience',
        label: t('profile.scoring.checklist.experience'),
        description: t('profile.scoring.checklist.experienceHint'),
        points: candidateScoringRubric.experience,
        done: hasExperience,
      },
      {
        key: 'resume',
        label: t('profile.scoring.checklist.resume'),
        description: t('profile.scoring.checklist.resumeHint'),
        points: candidateScoringRubric.resume,
        done: hasResume,
      },
      {
        key: 'education',
        label: t('profile.scoring.checklist.education'),
        description: t('profile.scoring.checklist.educationHint'),
        points: candidateScoringRubric.education,
        done: hasEducation,
      },
      {
        key: 'city',
        label: t('profile.scoring.checklist.city'),
        description: t('profile.scoring.checklist.cityHint'),
        points: candidateScoringRubric.city,
        done: hasCity,
      },
      {
        key: 'country',
        label: t('profile.scoring.checklist.country'),
        description: t('profile.scoring.checklist.countryHint'),
        points: candidateScoringRubric.country,
        done: hasCountry,
      },
    ];

    const score = checklist.reduce((total, item) => total + (item.done ? item.points : 0), 0);

    return {
      score: Math.max(0, Math.min(100, score)),
      checklist,
      isOpenToWork,
    };
  }, [profile, resumes.length, savedCandidateSkills, t]);
  const allSkillOptions = useMemo(
    () =>
      uniqueSkills([...candidateSkillSuggestions, ...savedCandidateSkills])
        .map((entry) => normalizeSkill(entry))
        .sort((a, b) => a.localeCompare(b)),
    [savedCandidateSkills],
  );
  const skillSearchOptions = useMemo(() => {
    const selected = new Set(candidateSkills.map((entry) => entry.toLowerCase()));
    const available = allSkillOptions.filter((entry) => !selected.has(entry.toLowerCase()));
    const query = candidateSkillDraft.trim().toLowerCase();

    if (!query) {
      return available.slice(0, 14);
    }

    return available.filter((entry) => entry.toLowerCase().includes(query)).slice(0, 14);
  }, [allSkillOptions, candidateSkillDraft, candidateSkills]);

  useEffect(() => {
    setCandidateSkills(savedCandidateSkills);
    setCandidateSkillLevels(savedCandidateSkillLevels);
    setCandidateSkillDraft('');
  }, [savedCandidateSkillLevels, savedCandidateSkills]);

  const togglePreferredOption = (field: PreferredFieldKey, value: string) => {
    const current = normalizePreferredList(
      field === 'preferredEmploymentTypesText'
        ? preferredEmploymentTypesRaw || ''
        : preferredWorkFormatsRaw || '',
    );
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];

    setValue(field, next.join(', '), { shouldDirty: true });
  };

  const addCandidateSkill = (rawValue: string) => {
    const skill = normalizeSkill(rawValue);
    if (!skill) {
      return;
    }

    setCandidateSkills((prev) => {
      if (prev.some((entry) => entry.toLowerCase() === skill.toLowerCase())) {
        return prev;
      }

      return [...prev, skill];
    });
    setCandidateSkillDraft('');
  };

  const removeCandidateSkill = (skillToRemove: string) => {
    setCandidateSkills((prev) =>
      prev.filter((entry) => entry.toLowerCase() !== skillToRemove.toLowerCase()),
    );
    setCandidateSkillLevels((prev) => {
      const next = { ...prev };
      delete next[skillToRemove.toLowerCase()];
      return next;
    });
  };

  const setCandidateSkillLevel = (skill: string, level: string) => {
    const key = skill.toLowerCase();
    setCandidateSkillLevels((prev) => {
      const next = { ...prev };
      if (!level) {
        delete next[key];
      } else {
        next[key] = level.toUpperCase();
      }
      return next;
    });
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!currentUser) {
      return;
    }

    const payload: Record<string, unknown> = {
      bio: data.bio,
      city: data.city,
      country: data.country,
    };

    if (isHr) {
      payload.companyName = data.companyName;
      payload.position = data.position;
      payload.companyWebsite = data.companyWebsite;
      payload.aboutCompany = data.aboutCompany;
      payload.companyContactPhone = data.companyContactPhone;
      payload.hrPhone = data.hrPhone;
    } else {
      payload.dateOfBirth = data.dateOfBirth || undefined;
      payload.desiredRole = data.desiredRole;
      payload.desiredSalary = data.desiredSalary ? Number(data.desiredSalary) : undefined;
      payload.graduationYear = data.graduationYear ? Number(data.graduationYear) : undefined;
      payload.universityId = data.universityId || undefined;
      payload.isNonStudent = data.isNonStudent;
      payload.openToWork = data.openToWork;
      payload.availability = data.availability || undefined;
      payload.hoursPerWeek = data.hoursPerWeek ? Number(data.hoursPerWeek) : undefined;
      payload.remoteReady = data.remoteReady;
      payload.relocationReady = data.relocationReady;
      payload.educationLevel = data.educationLevel || undefined;
      payload.preferredEmploymentTypes = listFromText(data.preferredEmploymentTypesText).map((entry) =>
        entry.toUpperCase(),
      );
      payload.preferredWorkFormats = listFromText(data.preferredWorkFormatsText).map((entry) =>
        entry.toUpperCase(),
      );
      payload.skills = uniqueSkills(candidateSkills).map((entry) => normalizeSkill(entry));
      payload.skillLevels = candidateSkillLevels;
    }

    setError(null);
    setIsSaving(true);

    try {
      await updateProfile(currentUser.id, payload as never);
      setIsEditing(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('profile.errors.updateProfile'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTelegramSettingsSave = async () => {
    setActivityError(null);
    setActivitySuccess(null);

    if (
      telegramSettings.telegramNotificationsEnabled &&
      !telegramSettings.telegramChatId
    ) {
      setActivityError(t('profile.errors.telegramLinkRequired'));
      return;
    }

    try {
      await updateTelegramSettings({
        telegramNotificationsEnabled: telegramSettings.telegramNotificationsEnabled,
        telegramNotifyInvites: telegramSettings.telegramNotifyInvites,
        telegramNotifyApplications: telegramSettings.telegramNotifyApplications,
      });
      setActivitySuccess(t('profile.success.telegramSettingsSaved'));
    } catch (saveError) {
      setActivityError(
        saveError instanceof Error ? saveError.message : t('profile.errors.saveTelegramSettings'),
      );
    }
  };

  const handleTelegramLinkCreate = async () => {
    setActivityError(null);
    setActivitySuccess(null);

    try {
      const session = await createTelegramLink({
        telegramNotifyInvites: telegramSettings.telegramNotifyInvites,
        telegramNotifyApplications: telegramSettings.telegramNotifyApplications,
        expiresInMinutes: 15,
      });
      setActivitySuccess(
        session.instructions || 'Telegram link created. Open it and press Start in the bot.',
      );
    } catch (linkError) {
      setActivityError(
        linkError instanceof Error ? linkError.message : t('profile.errors.createTelegramLink'),
      );
    }
  };

  const handleTelegramChatIdCopy = async () => {
    if (!telegramSettings.telegramChatId) {
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(telegramSettings.telegramChatId);
        setActivitySuccess(t('profile.success.telegramChatIdCopied'));
      }
    } catch {
      setActivityError(t('profile.errors.copyChatId'));
    }
  };

  const handleTelegramStatusRefresh = async () => {
    setActivityError(null);
    setActivitySuccess(null);

    try {
      await loadProfile();

      const nextProfile = (useUserStore.getState().currentProfile as Record<string, unknown> | null) || null;
      let nextChatId = extractTelegramChatId(nextProfile);

      if (!nextChatId) {
        await updateTelegramSettings({
          telegramNotificationsEnabled: telegramSettings.telegramNotificationsEnabled,
          telegramNotifyInvites: telegramSettings.telegramNotifyInvites,
          telegramNotifyApplications: telegramSettings.telegramNotifyApplications,
        });

        nextChatId = useNotificationsStore.getState().telegramSettings.telegramChatId;
      }

      if (nextChatId) {
        setActivitySuccess(t('profile.success.telegramLinked'));
      } else {
        setActivityError(t('profile.errors.telegramStillNotLinked'));
      }
    } catch (refreshError) {
      setActivityError(
        refreshError instanceof Error
          ? refreshError.message
          : t('profile.errors.refreshTelegramStatus'),
      );
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setActivityError(null);
    setActivitySuccess(null);

    try {
      const changed = await markAllAsRead();
      setActivitySuccess(`Marked ${changed} notification(s) as read.`);
    } catch (markError) {
      setActivityError(
        markError instanceof Error ? markError.message : t('profile.errors.markNotificationsRead'),
      );
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    setActivityError(null);

    try {
      await markAsRead(notificationId);
    } catch (markError) {
      setActivityError(
        markError instanceof Error ? markError.message : t('profile.errors.markNotificationRead'),
      );
    }
  };

  const handleProfileUpload = async (
    file: File,
    config: {
      target: MediaUploadTarget;
      successMessage: string;
      resumeTitle?: string;
      isPrimary?: boolean;
    },
  ): Promise<boolean> => {
    const maxBytes = getUploadLimitBytes(config.target);
    if (file.size > maxBytes) {
      setActivityError(t('profile.errors.fileTooLarge', { limit: getUploadLimitLabel(config.target) }));
      setActivitySuccess(null);
      return false;
    }

    setActivityError(null);
    setActivitySuccess(null);

    try {
      const uploadResult = await uploadAndAttach({
        file,
        target: config.target,
        resumeTitle: config.resumeTitle,
        isPrimary: config.isPrimary,
      });
      const uploadedFile = uploadResult.file;
      const hasAttachment = Boolean(
        uploadResult.attachment && Object.keys(uploadResult.attachment).length,
      );

      if (config.target === 'USER_AVATAR') {
        let nextAvatarUrl = '';

        if (uploadedFile.downloadUrl) {
          nextAvatarUrl = uploadedFile.downloadUrl;
        } else if (uploadedFile.id) {
          try {
            const uploadDownloadUrl = await getDownloadUrl(uploadedFile.id);
            nextAvatarUrl = uploadDownloadUrl;
          } catch {
            if (uploadedFile.url) {
              nextAvatarUrl = uploadedFile.url;
            }
          }
        } else if (uploadedFile.url) {
          nextAvatarUrl = uploadedFile.url;
        }

        if (nextAvatarUrl) {
          setResolvedAvatarUrl(nextAvatarUrl);
          syncAuthUserAvatar(nextAvatarUrl);
          if (currentUserId) {
            writeCachedAvatar(currentUserId, {
              fileId: uploadedFile.id || undefined,
              url: nextAvatarUrl,
            });
          }
        }
      }

      if (config.target === 'CANDIDATE_RESUME' && !hasAttachment && uploadedFile.id) {
        setLocalResumeFiles((prev) => [
          makeLocalFileEntry(uploadedFile, {
            title: config.resumeTitle,
            resumeTitle: config.resumeTitle,
            isPrimary: config.isPrimary === true,
          }),
          ...prev.filter((entry) => getFileId(entry) !== uploadedFile.id),
        ]);
      }

      if (config.target === 'CANDIDATE_PORTFOLIO' && !hasAttachment && uploadedFile.id) {
        setLocalPortfolioFiles((prev) => [
          makeLocalFileEntry(uploadedFile),
          ...prev.filter((entry) => getFileId(entry) !== uploadedFile.id),
        ]);
      }

      if (config.target === 'COMPANY_LOGO') {
        if (uploadedFile.downloadUrl) {
          setResolvedCompanyLogoUrl(uploadedFile.downloadUrl);
        } else if (uploadedFile.id) {
          try {
            const uploadDownloadUrl = await getDownloadUrl(uploadedFile.id);
            setResolvedCompanyLogoUrl(uploadDownloadUrl);
          } catch {
            if (uploadedFile.url) {
              setResolvedCompanyLogoUrl(uploadedFile.url);
            }
          }
        } else if (uploadedFile.url) {
          setResolvedCompanyLogoUrl(uploadedFile.url);
        }
      }

      await loadProfile();
      setActivitySuccess(config.successMessage);

      if (config.target === 'CANDIDATE_RESUME') {
        setResumeTitle('');
        setResumePrimary(false);
      }
      return true;
    } catch (uploadError) {
      setActivityError(uploadError instanceof Error ? uploadError.message : t('profile.errors.uploadFile'));
      return false;
    }
  };

  const handleFileInputChange = async (
    event: ChangeEvent<HTMLInputElement>,
    config: {
      target: MediaUploadTarget;
      successMessage: string;
      resumeTitle?: string;
      isPrimary?: boolean;
    },
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    await handleProfileUpload(file, config);
  };

  const handleResumeUploadConfirm = async () => {
    if (!resumeUploadFile) {
      setActivityError(t('profile.errors.pickResumeFile'));
      return;
    }

    const ok = await handleProfileUpload(resumeUploadFile, {
      target: 'CANDIDATE_RESUME',
      resumeTitle: resumeTitle.trim() || undefined,
      isPrimary: resumePrimary,
      successMessage: t('profile.success.resumeUploaded'),
    });

    if (ok) {
      setResumeUploadFile(null);
      setIsResumeUploadModalOpen(false);
    }
  };

  const handlePortfolioUploadConfirm = async () => {
    if (!portfolioUploadFile) {
      setActivityError(t('profile.errors.pickPortfolioFile'));
      return;
    }

    const ok = await handleProfileUpload(portfolioUploadFile, {
      target: 'CANDIDATE_PORTFOLIO',
      successMessage: t('profile.success.portfolioUploaded'),
    });

    if (ok) {
      setPortfolioUploadFile(null);
      setIsPortfolioUploadModalOpen(false);
    }
  };

  const handleDeleteUploadedFile = async (
    fileId: string,
    successMessage: string,
    target?: MediaUploadTarget,
  ) => {
    if (!fileId) {
      setActivityError(t('profile.errors.fileIdMissing'));
      return;
    }

    setActivityError(null);
    setActivitySuccess(null);

    try {
      await deleteFile(fileId);
      setLocalResumeFiles((prev) => prev.filter((entry) => getFileId(entry) !== fileId));
      setLocalPortfolioFiles((prev) => prev.filter((entry) => getFileId(entry) !== fileId));
      if (target === 'USER_AVATAR') {
        setResolvedAvatarUrl('');
        syncAuthUserAvatar(undefined);
        if (currentUserId) {
          clearCachedAvatar(currentUserId);
        }
      }
      await loadProfile();
      setActivitySuccess(successMessage);
    } catch (deleteError) {
      setActivityError(deleteError instanceof Error ? deleteError.message : t('profile.errors.deleteFile'));
    }
  };

  const handleOpenFile = async (file: Record<string, unknown> | null) => {
    const fileId = getFileId(file);
    if (!fileId) {
      setActivityError(t('profile.errors.fileUnavailable'));
      return;
    }

    try {
      const nextHref = await getDownloadUrl(fileId);

      if (!nextHref) {
        throw new Error('Download URL is unavailable');
      }

      window.open(nextHref, '_blank', 'noopener,noreferrer');
    } catch (openError) {
      setActivityError(openError instanceof Error ? openError.message : t('profile.errors.openFile'));
    }
  };

  const reloadPrivacyCenter = async () => {
    setPrivacyError(null);
    setIsPrivacyLoading(true);

    try {
      const [nextConsents, nextComplaints] = await Promise.all([
        complianceApi.listMyConsents(),
        complianceApi.listMyComplaints(),
      ]);

      setConsents(nextConsents);
      setMyComplaints(nextComplaints);

      const latestByType = nextConsents.reduce(
        (acc, entry) => {
          if (!(entry.type in acc)) {
            acc[entry.type] = entry.accepted;
          }
          return acc;
        },
        {} as Partial<Record<ConsentType, boolean>>,
      );

      setConsentDraft({
        PRIVACY: latestByType.PRIVACY ?? false,
        TERMS: latestByType.TERMS ?? false,
        MARKETING: latestByType.MARKETING ?? false,
      });

      if (isHr) {
        const verification = await complianceApi.getMyCompanyVerification();
        setCompanyVerification(verification);
      }
    } catch (privacyLoadError) {
      setPrivacyError(
        privacyLoadError instanceof Error
          ? privacyLoadError.message
          : t('profile.errors.reloadPrivacyCenter'),
      );
    } finally {
      setIsPrivacyLoading(false);
    }
  };

  const handleSaveConsents = async () => {
    if (!consentVersion.trim()) {
      setPrivacyError(t('profile.errors.consentVersionRequired'));
      return;
    }

    setPrivacyError(null);
    setPrivacySuccess(null);
    setIsPrivacyMutating(true);

    try {
      await Promise.all(
        privacyConsentTypes.map((type) =>
          complianceApi.saveConsent({
            type,
            version: consentVersion.trim(),
            accepted: consentDraft[type],
          }),
        ),
      );

      await reloadPrivacyCenter();
      setPrivacySuccess('Consent snapshot saved.');
    } catch (consentError) {
      setPrivacyError(consentError instanceof Error ? consentError.message : t('profile.errors.saveConsent'));
    } finally {
      setIsPrivacyMutating(false);
    }
  };

  const handleExportMyData = async () => {
    setPrivacyError(null);
    setPrivacySuccess(null);
    setIsPrivacyMutating(true);

    try {
      const payload = await complianceApi.exportMyData();
      setPrivacyExport(payload);
      setPrivacySuccess('Personal data export generated.');
    } catch (exportError) {
      setPrivacyError(exportError instanceof Error ? exportError.message : t('profile.errors.exportData'));
    } finally {
      setIsPrivacyMutating(false);
    }
  };

  const handleCreateDeleteRequest = async () => {
    if (!deleteReason.trim()) {
      setPrivacyError(t('profile.errors.deleteReasonRequired'));
      return;
    }

    setPrivacyError(null);
    setPrivacySuccess(null);
    setIsPrivacyMutating(true);

    try {
      const result = await complianceApi.createDeleteRequest(deleteReason.trim());
      setDeleteRequestStatus(result?.status || 'REQUESTED');
      setPrivacySuccess(t('profile.success.deleteRequestCreated'));
    } catch (deleteRequestError) {
      setPrivacyError(
        deleteRequestError instanceof Error
          ? deleteRequestError.message
          : t('profile.errors.createDeleteRequest'),
      );
    } finally {
      setIsPrivacyMutating(false);
    }
  };

  const handleCancelDeleteRequest = async () => {
    setPrivacyError(null);
    setPrivacySuccess(null);
    setIsPrivacyMutating(true);

    try {
      const result = await complianceApi.cancelDeleteRequest();
      setDeleteRequestStatus(result?.status || 'CANCELED');
      setPrivacySuccess(t('profile.success.deleteRequestCanceled'));
    } catch (cancelError) {
      setPrivacyError(cancelError instanceof Error ? cancelError.message : t('profile.errors.cancelDeleteRequest'));
    } finally {
      setIsPrivacyMutating(false);
    }
  };

  const handleCreateComplaint = async () => {
    if (!complaintTargetId.trim() || !complaintReason.trim()) {
      setPrivacyError(t('profile.errors.complaintRequiredFields'));
      return;
    }

    setPrivacyError(null);
    setPrivacySuccess(null);
    setIsPrivacyMutating(true);

    try {
      await complianceApi.createComplaint({
        targetType: complaintTargetType,
        targetId: complaintTargetId.trim(),
        reason: complaintReason.trim(),
        details: complaintDetails.trim() || undefined,
      });
      setComplaintReason('');
      setComplaintDetails('');
      setComplaintTargetId('');
      await reloadPrivacyCenter();
      setPrivacySuccess(t('profile.success.complaintSubmitted'));
    } catch (complaintError) {
      setPrivacyError(
        complaintError instanceof Error ? complaintError.message : t('profile.errors.submitComplaint'),
      );
    } finally {
      setIsPrivacyMutating(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="container mx-auto px-6 py-12" style={{ maxWidth: '1280px' }}>
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold mb-4" style={{ color: 'var(--surface-text-primary)' }}>
              {t('profile.signInRequired')}
            </h1>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="container mx-auto px-6 py-12" style={{ maxWidth: '1280px' }}>
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold mb-4" style={{ color: 'var(--surface-text-primary)' }}>
              {t('profile.loading')}
            </h1>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell app-page">
      <AppHeader />
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8" style={{ maxWidth: '1280px' }}>
        <div className="max-w-5xl mx-auto space-y-6">
          <section className="app-section-card p-4 sm:p-5">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">{t('profile.workspace.title')}</p>
                <p className="mt-1 text-sm text-[var(--surface-text-soft)]">{t('profile.workspace.description')}</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {availableTabs.map((tab) => {
                  const active = activeTab === tab.id;
                  const unreadTabCount = tab.id === 'notifications' ? notificationsMeta.unread : 0;
                  const showUnreadTabBadge = unreadTabCount > 0;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative rounded-2xl border px-4 py-3 text-left transition-colors ${
                        active
                          ? 'border-[#2B6A4D]/30 bg-[var(--surface-soft)] dark:border-[#4A966E]/30'
                          : 'border-[#9FB08A]/30 bg-white hover:bg-[var(--surface-soft)] dark:border-[var(--surface-border-strong)]'
                      }`}
                    >
                      {showUnreadTabBadge && (
                        <span
                          className="absolute right-3 top-3 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D62525] px-1 text-[11px] font-semibold leading-none text-white"
                          aria-label={t('profile.notifications.unreadWithCount', { count: unreadTabCount })}
                        >
                          {unreadTabCount > 9 ? '9+' : unreadTabCount}
                        </span>
                      )}
                      <p className="text-sm font-semibold text-[var(--surface-text-primary)]">{tab.label}</p>
                      <p className="mt-1 text-xs text-[var(--surface-text-soft)]">{tab.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {activeTab === 'profile' && (
            <div id="profile-overview" className="bg-white rounded-2xl shadow-lg p-6 sm:p-8" style={cardStyle}>
            <div className="flex items-start justify-between mb-6 gap-4">
              <div className="flex items-center gap-6">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={displayName} className="w-24 h-24 rounded-full object-cover" />
                ) : (
                  <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--surface-chip)' }}>
                    <User className="w-12 h-12" style={{ color: 'var(--surface-text-primary)' }} />
                  </div>
                )}
                <div>
                  <h1 className="font-heading text-3xl font-bold mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                    {displayName}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4" style={{ color: 'var(--surface-text-muted)' }}>
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span>{currentUser.email}</span>
                    </div>
                    {location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{location}</span>
                      </div>
                    )}
                    <span className="px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: 'var(--surface-chip)', color: 'var(--surface-text-primary)' }}>
                      {isHr ? t('profile.role.hr') : t('profile.role.candidate')}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (isEditing) {
                    reset(buildInitialValues(profile));
                    setCandidateSkills(savedCandidateSkills);
                    setCandidateSkillLevels(savedCandidateSkillLevels);
                    setCandidateSkillDraft('');
                    setError(null);
                  }
                  setIsEditing((prev) => !prev);
                }}
                className="px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium border-2"
                style={{
                  borderColor: 'var(--surface-border-strong)',
                  color: 'var(--surface-text-primary)',
                  backgroundColor: 'transparent',
                }}
              >
                {isEditing ? t('common.cancel') : t('profile.actions.edit')}
              </button>
            </div>

            <div className="mb-6 flex flex-wrap gap-3">
              <label
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
                style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-subtle)', color: 'var(--surface-text-primary)' }}
              >
                <UploadCloud className="w-4 h-4" />
                {t('profile.actions.uploadAvatar')}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) =>
                    void handleFileInputChange(event, {
                      target: 'USER_AVATAR',
                      successMessage: t('profile.success.avatarUpdated'),
                    })
                  }
                />
              </label>

              {avatarFileIdForDelete && (
                <button
                  type="button"
                  onClick={() =>
                    void handleDeleteUploadedFile(avatarFileIdForDelete, t('profile.success.avatarRemoved'), 'USER_AVATAR')
                  }
                  disabled={isDeletingMedia}
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: 'rgba(220, 38, 38, 0.3)', backgroundColor: 'var(--surface-base)', color: 'var(--tone-danger-text)' }}
                >
                  <Trash2 className="w-4 h-4" />
                  {t('profile.actions.removeAvatar')}
                </button>
              )}

              {isHr && (
                <>
                  <label
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
                    style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-subtle)', color: 'var(--surface-text-primary)' }}
                  >
                    <ImagePlus className="w-4 h-4" />
                    {t('profile.actions.uploadCompanyLogo')}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) =>
                        void handleFileInputChange(event, {
                          target: 'COMPANY_LOGO',
                          successMessage: t('profile.success.companyLogoUpdated'),
                        })
                      }
                    />
                  </label>

                  {companyLogoFile && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleDeleteUploadedFile(getFileId(companyLogoFile), t('profile.success.companyLogoRemoved'))
                      }
                      disabled={isDeletingMedia}
                      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
                      style={{ borderColor: 'rgba(220, 38, 38, 0.3)', backgroundColor: 'var(--surface-base)', color: 'var(--tone-danger-text)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('profile.actions.removeLogo')}
                    </button>
                  )}
                </>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--tone-danger-bg)', color: 'var(--tone-danger-text)' }}>
                {error}
              </div>
            )}

            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                      City
                    </label>
                    <Input {...register('city')} className="h-12" style={{ borderColor: 'var(--surface-border-strong)', borderRadius: '0.75rem' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                      Country
                    </label>
                    <Input {...register('country')} className="h-12" style={{ borderColor: 'var(--surface-border-strong)', borderRadius: '0.75rem' }} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                    Bio
                  </label>
                  <Textarea {...register('bio')} rows={4} style={{ borderColor: 'var(--surface-border-strong)', borderRadius: '0.75rem' }} />
                </div>

                {isHr ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                          Company name
                        </label>
                        <Input {...register('companyName')} className="h-12" style={{ borderColor: 'var(--surface-border-strong)', borderRadius: '0.75rem' }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.fields.position')}
                        </label>
                        <Input {...register('position')} className="h-12" style={{ borderColor: 'var(--surface-border-strong)', borderRadius: '0.75rem' }} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                        {t('profile.fields.companyWebsite')}
                      </label>
                      <Input {...register('companyWebsite')} type="url" className="h-12" style={{ borderColor: 'var(--surface-border-strong)', borderRadius: '0.75rem' }} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                        {t('profile.fields.aboutCompany')}
                      </label>
                      <Textarea {...register('aboutCompany')} rows={4} style={{ borderColor: 'var(--surface-border-strong)', borderRadius: '0.75rem' }} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.fields.companyContactPhone')}
                        </label>
                        <Input {...register('companyContactPhone')} className="h-12" style={{ borderColor: 'var(--surface-border-strong)', borderRadius: '0.75rem' }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.fields.hrPhone')}
                        </label>
                        <Input {...register('hrPhone')} className="h-12" style={{ borderColor: 'var(--surface-border-strong)', borderRadius: '0.75rem' }} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.fields.desiredRole')}
                        </label>
                        <Input {...register('desiredRole')} className="h-12" style={{ borderColor: 'var(--surface-border-strong)', borderRadius: '0.75rem' }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.fields.desiredSalary')}
                        </label>
                        <Input {...register('desiredSalary')} type="number" className="h-12" style={{ borderColor: 'var(--surface-border-strong)', borderRadius: '0.75rem' }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.fields.graduationYear')}
                        </label>
                        <Input {...register('graduationYear')} type="number" className="h-12" style={{ borderColor: 'var(--surface-border-strong)', borderRadius: '0.75rem' }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.fields.dateOfBirth')}
                        </label>
                        <Input {...register('dateOfBirth')} type="date" className="h-12" style={{ borderColor: 'var(--surface-border-strong)', borderRadius: '0.75rem' }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.fields.university')}
                        </label>
                        <select
                          {...register('universityId')}
                          className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                          style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)' }}
                        >
                          <option value="">
                            {isUniversitiesLoading ? t('profile.university.loading') : t('profile.university.select')}
                          </option>
                          {universities.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.shortName ? `${entry.shortName} — ${entry.name}` : entry.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="inline-flex items-center gap-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}>
                        <input type="checkbox" {...register('isNonStudent')} className="h-4 w-4" />
                        {t('profile.fields.nonStudent')}
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="inline-flex items-center gap-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}>
                        <input type="checkbox" {...register('openToWork')} className="h-4 w-4" />
                        {t('profile.fields.openToWork')}
                      </label>
                      <label className="inline-flex items-center gap-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}>
                        <input type="checkbox" {...register('remoteReady')} className="h-4 w-4" />
                        {t('profile.fields.remoteReady')}
                      </label>
                      <label className="inline-flex items-center gap-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}>
                        <input type="checkbox" {...register('relocationReady')} className="h-4 w-4" />
                        {t('profile.fields.relocationReady')}
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.fields.availability')}
                        </label>
                        <select
                          {...register('availability')}
                          className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                          style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)' }}
                        >
                          <option value="">{t('profile.options.notSet')}</option>
                          <option value="IMMEDIATE">{t('profile.options.availability.immediate')}</option>
                          <option value="AFTER_GRADUATION">{t('profile.options.availability.afterGraduation')}</option>
                          <option value="WEEKENDS_ONLY">{t('profile.options.availability.weekendsOnly')}</option>
                          <option value="CUSTOM">{t('profile.options.availability.custom')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.fields.educationLevel')}
                        </label>
                        <select
                          {...register('educationLevel')}
                          className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                          style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)' }}
                        >
                          <option value="">{t('profile.options.notSet')}</option>
                          <option value="NONE">{t('profile.options.education.none')}</option>
                          <option value="SECONDARY">{t('profile.options.education.secondary')}</option>
                          <option value="VOCATIONAL">{t('profile.options.education.vocational')}</option>
                          <option value="BACHELOR">{t('profile.options.education.bachelor')}</option>
                          <option value="MASTER">{t('profile.options.education.master')}</option>
                          <option value="PHD">{t('profile.options.education.phd')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.fields.hoursPerWeek')}
                        </label>
                        <Input {...register('hoursPerWeek')} type="number" className="h-12" style={{ borderColor: 'var(--surface-border-strong)', borderRadius: '0.75rem' }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.fields.preferredEmploymentTypes')}
                        </label>
                        <div className="flex flex-wrap gap-2 rounded-xl border p-3" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)' }}>
                          {preferredEmploymentTypeOptions.map((option) => {
                            const active = selectedEmploymentTypes.includes(option.value);
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => togglePreferredOption('preferredEmploymentTypesText', option.value)}
                                className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                                style={{
                                  borderColor: active ? '#2B6A4D' : 'var(--surface-border-strong)',
                                  backgroundColor: active ? 'var(--surface-soft)' : 'white',
                                  color: active ? 'var(--tone-info-text)' : 'var(--surface-text-primary)',
                                }}
                              >
                                {t(option.labelKey)}
                              </button>
                            );
                          })}
                        </div>
                        <input type="hidden" {...register('preferredEmploymentTypesText')} />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.fields.preferredWorkFormats')}
                        </label>
                        <div className="flex flex-wrap gap-2 rounded-xl border p-3" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)' }}>
                          {preferredWorkFormatOptions.map((option) => {
                            const active = selectedWorkFormats.includes(option.value);
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => togglePreferredOption('preferredWorkFormatsText', option.value)}
                                className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                                style={{
                                  borderColor: active ? '#2B6A4D' : 'var(--surface-border-strong)',
                                  backgroundColor: active ? 'var(--surface-soft)' : 'white',
                                  color: active ? 'var(--tone-info-text)' : 'var(--surface-text-primary)',
                                }}
                              >
                                {t(option.labelKey)}
                              </button>
                            );
                          })}
                        </div>
                        <input type="hidden" {...register('preferredWorkFormatsText')} />
                      </div>
                    </div>

                    <div className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)' }}>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h3 className="font-heading text-lg font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.skills.title')}
                        </h3>
                        {candidateSkills.length > 0 && (
                          <button
                            type="button"
                            className="text-xs font-semibold"
                            style={{ color: 'var(--surface-text-muted)' }}
                            onClick={() => {
                              setCandidateSkills([]);
                              setCandidateSkillLevels({});
                            }}
                          >
                            {t('profile.skills.clearAll')}
                          </button>
                        )}
                      </div>

                      <div className="flex gap-2 mb-3">
                        <Input
                          value={candidateSkillDraft}
                          onChange={(event) => setCandidateSkillDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              addCandidateSkill(candidateSkillDraft);
                            }
                          }}
                          placeholder={t('profile.skills.searchPlaceholder')}
                          className="h-11"
                          style={{ borderColor: 'var(--surface-border-strong)', borderRadius: '0.75rem' }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addCandidateSkill(candidateSkillDraft)}
                          style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)' }}
                        >
                          {t('profile.skills.add')}
                        </Button>
                      </div>

                      <div className="rounded-xl border p-3 mb-3" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-base)' }}>
                        <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--surface-text-soft)' }}>
                          {t('profile.skills.suggestions')}
                        </p>
                        {skillSearchOptions.length === 0 ? (
                          <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>
                            {t('profile.skills.nothingFound')}
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {skillSearchOptions.map((skill) => (
                              <button
                                key={`profile-skill-suggest-${skill}`}
                                type="button"
                                onClick={() => addCandidateSkill(skill)}
                                className="rounded-full border px-2.5 py-1 text-xs font-medium"
                                style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}
                              >
                                {skill}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {candidateSkills.length === 0 ? (
                        <p className="text-xs" style={{ color: 'var(--surface-text-muted)' }}>
                          {t('profile.skills.noneSelected')}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {candidateSkills.map((skill) => {
                            const level = candidateSkillLevels[skill.toLowerCase()] || '';
                            return (
                              <div
                                key={`candidate-skill-${skill}`}
                                className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr,220px,auto]"
                                style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-base)' }}
                              >
                                <div className="self-center text-sm font-medium" style={{ color: 'var(--surface-text-primary)' }}>
                                  {skill}
                                </div>
                                <select
                                  value={level}
                                  onChange={(event) => setCandidateSkillLevel(skill, event.target.value)}
                                  className="flex h-10 w-full rounded-lg border px-3 py-2 text-sm"
                                  style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)' }}
                                >
                                  <option value="">{t('profile.skills.levelNotSet')}</option>
                                  {candidateSkillLevelOptions.map((option) => (
                                    <option key={`${skill}-${option.value}`} value={option.value}>
                                      {t(option.labelKey)}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => removeCandidateSkill(skill)}
                                  className="inline-flex h-10 items-center justify-center rounded-lg border px-3 text-xs font-semibold"
                                  style={{ borderColor: 'rgba(220, 38, 38, 0.3)', color: 'var(--tone-danger-text)', backgroundColor: 'var(--surface-base)' }}
                                >
                                  {t('common.remove')}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  disabled={isSaving}
                  style={{ backgroundColor: 'var(--surface-text-primary)', color: 'white' }}
                >
                  {isSaving ? t('common.saving') : t('profile.actions.saveChanges')}
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                <section
                  className="rounded-2xl border px-5 py-5 sm:px-6"
                  style={{
                    borderColor: 'var(--surface-border-strong)',
                    background:
                      'linear-gradient(145deg, var(--surface-subtle) 0%, var(--surface-base) 100%)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}
                    >
                      <User className="h-4 w-4" />
                    </span>
                    <h2 className="font-heading text-xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                      {t('profile.sections.about')}
                    </h2>
                  </div>
                  <p className="mt-4 text-sm leading-7 sm:text-base" style={{ color: 'var(--surface-text-muted)' }}>
                    {getString(profile?.bio) || t('profile.empty.about')}
                  </p>
                </section>

                {isHr ? (
                  <>
                    {(getString(profile?.companyName) || getString(profile?.position)) && (
                      <div>
                        <h2 className="font-heading text-xl font-bold mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.sections.company')}
                        </h2>
                        <div className="flex items-center gap-2" style={{ color: 'var(--surface-text-muted)' }}>
                          <Building2 className="w-4 h-4" />
                          <span>{[getString(profile?.companyName), getString(profile?.position)].filter(Boolean).join(' • ')}</span>
                        </div>
                      </div>
                    )}

                    {(getString(profile?.companyWebsite) || getString(profile?.companyContactPhone) || getString(profile?.hrPhone)) && (
                      <div>
                        <h2 className="font-heading text-xl font-bold mb-2" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.sections.contacts')}
                        </h2>
                        <div className="flex flex-col gap-2" style={{ color: 'var(--surface-text-muted)' }}>
                          {getString(profile?.companyWebsite) && (
                            <a href={getString(profile?.companyWebsite)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline" style={{ color: 'var(--surface-text-primary)' }}>
                              <Globe className="w-4 h-4" />
                              <span>{t('profile.fields.companyWebsite')}</span>
                            </a>
                          )}
                          {getString(profile?.companyContactPhone) && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{t('profile.labels.companyPhone')}: {getString(profile?.companyContactPhone)}</span>
                            </div>
                          )}
                          {getString(profile?.hrPhone) && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{t('profile.labels.hrPhone')}: {getString(profile?.hrPhone)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <section
                      className="rounded-2xl border p-5 sm:p-6"
                      style={{
                        borderColor: 'var(--surface-border-strong)',
                        background:
                          'linear-gradient(140deg, var(--tone-info-bg) 0%, var(--surface-base) 100%)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ backgroundColor: 'var(--surface-base)', color: 'var(--surface-text-primary)' }}
                        >
                          <Gauge className="h-4 w-4" />
                        </span>
                        <h2 className="font-heading text-xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.scoring.title')}
                        </h2>
                      </div>
                      <p className="mt-3 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                        {t('profile.scoring.description')}
                      </p>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--surface-text-soft)' }}>
                            {t('profile.scoring.currentScore')}
                          </p>
                          <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                            {candidateScoring.score}/100
                          </p>
                        </div>
                        <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--surface-base)', color: 'var(--surface-text-primary)' }}>
                          {t('profile.scoring.hrPriority')}
                        </span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--surface-border-soft)' }}>
                        <div className="h-full rounded-full" style={{ width: `${candidateScoring.score}%`, backgroundColor: 'var(--surface-text-primary)' }} />
                      </div>

                      <p className="mt-3 text-xs" style={{ color: 'var(--surface-text-soft)' }}>
                        {t('profile.scoring.vacancyNote')}
                      </p>

                      {!candidateScoring.isOpenToWork && (
                        <div className="mt-3 rounded-xl border px-3 py-2 text-xs font-semibold" style={{ borderColor: 'var(--tone-warning-text)', color: 'var(--tone-warning-text)', backgroundColor: 'var(--tone-warning-bg)' }}>
                          {t('profile.scoring.openToWorkWarning')}
                        </div>
                      )}

                      <div className="mt-4 space-y-2">
                        {candidateScoring.checklist.map((item) => (
                          <div key={item.key} className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--surface-border-soft)', backgroundColor: 'var(--surface-base)' }}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                {item.done ? (
                                  <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--tone-success-text)' }} />
                                ) : (
                                  <AlertTriangle className="h-4 w-4" style={{ color: 'var(--tone-warning-text)' }} />
                                )}
                                <p className="text-sm font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                                  {item.label}
                                </p>
                              </div>
                              <span className="text-xs font-semibold" style={{ color: item.done ? 'var(--tone-success-text)' : 'var(--surface-text-soft)' }}>
                                +{item.points}
                              </span>
                            </div>
                            <p className="mt-1 text-xs" style={{ color: 'var(--surface-text-muted)' }}>
                              {item.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section
                      className="rounded-2xl border p-5 sm:p-6"
                      style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}
                        >
                          <Briefcase className="h-4 w-4" />
                        </span>
                        <h2 className="font-heading text-xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.sections.careerPreferences')}
                        </h2>
                      </div>

                      <p className="mt-3 text-base font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                        {getString(profile?.desiredRole) || t('profile.empty.desiredRole')}
                      </p>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--surface-border-soft)', backgroundColor: 'var(--surface-base)' }}>
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--surface-text-soft)' }}>{t('profile.fields.salary')}</p>
                          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                            {profile?.desiredSalary !== undefined && profile?.desiredSalary !== null ? String(profile.desiredSalary) : t('profile.options.notSet')}
                          </p>
                        </div>
                        <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--surface-border-soft)', backgroundColor: 'var(--surface-base)' }}>
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--surface-text-soft)' }}>{t('profile.labels.graduation')}</p>
                          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                            {profile?.graduationYear !== undefined && profile?.graduationYear !== null ? String(profile.graduationYear) : t('profile.options.notSet')}
                          </p>
                        </div>
                        <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--surface-border-soft)', backgroundColor: 'var(--surface-base)' }}>
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--surface-text-soft)' }}>{t('profile.fields.university')}</p>
                          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                            {universityName || t('profile.options.notSet')}
                          </p>
                        </div>
                        <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--surface-border-soft)', backgroundColor: 'var(--surface-base)' }}>
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--surface-text-soft)' }}>{t('profile.fields.education')}</p>
                          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                            {getString(profile?.educationLevel) ? formatEnum(getString(profile?.educationLevel)) : t('profile.options.notSet')}
                          </p>
                        </div>
                        <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--surface-border-soft)', backgroundColor: 'var(--surface-base)' }}>
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--surface-text-soft)' }}>{t('profile.fields.availability')}</p>
                          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                            {getString(profile?.availability) ? formatEnum(getString(profile?.availability)) : t('profile.options.notSet')}
                          </p>
                        </div>
                        <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--surface-border-soft)', backgroundColor: 'var(--surface-base)' }}>
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--surface-text-soft)' }}>{t('profile.fields.hoursPerWeekShort')}</p>
                          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                            {profile?.hoursPerWeek !== undefined && profile?.hoursPerWeek !== null ? String(profile.hoursPerWeek) : t('profile.options.notSet')}
                          </p>
                        </div>
                        <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--surface-border-soft)', backgroundColor: 'var(--surface-base)' }}>
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--surface-text-soft)' }}>{t('profile.fields.dateOfBirth')}</p>
                          <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                            {getString(profile?.dateOfBirth) ? getString(profile?.dateOfBirth).slice(0, 10) : t('profile.options.notSet')}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: getBoolean(profile?.openToWork, false) ? 'var(--tone-success-bg)' : 'var(--surface-chip)',
                            color: getBoolean(profile?.openToWork, false) ? 'var(--tone-success-text)' : 'var(--surface-text-muted)',
                          }}
                        >
                          {t('profile.fields.openToWork')}: {getBoolean(profile?.openToWork, false) ? t('common.yes') : t('common.no')}
                        </span>
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: getBoolean(profile?.remoteReady, false) ? 'var(--tone-info-bg)' : 'var(--surface-chip)',
                            color: getBoolean(profile?.remoteReady, false) ? 'var(--tone-info-text)' : 'var(--surface-text-muted)',
                          }}
                        >
                          {t('profile.fields.remoteReady')}: {getBoolean(profile?.remoteReady, false) ? t('common.yes') : t('common.no')}
                        </span>
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: getBoolean(profile?.relocationReady, false) ? 'var(--tone-warning-bg)' : 'var(--surface-chip)',
                            color: getBoolean(profile?.relocationReady, false) ? 'var(--tone-warning-text)' : 'var(--surface-text-muted)',
                          }}
                        >
                          {t('profile.fields.relocation')}: {getBoolean(profile?.relocationReady, false) ? t('common.yes') : t('common.no')}
                        </span>
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: getBoolean(profile?.isNonStudent, false) ? 'var(--tone-warning-bg)' : 'var(--surface-chip)',
                            color: getBoolean(profile?.isNonStudent, false) ? 'var(--tone-warning-text)' : 'var(--surface-text-muted)',
                          }}
                        >
                          {t('profile.fields.nonStudent')}: {getBoolean(profile?.isNonStudent, false) ? t('common.yes') : t('common.no')}
                        </span>
                      </div>

                      {(preferredEmploymentTypes.length > 0 || preferredWorkFormats.length > 0) && (
                        <div className="mt-5 space-y-3">
                          {preferredEmploymentTypes.length > 0 && (
                            <div>
                              <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--surface-text-soft)' }}>
                                {t('profile.fields.preferredEmployment')}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {preferredEmploymentTypes.map((entry) => (
                                  <span
                                    key={entry}
                                    className="rounded-lg px-2.5 py-1 text-xs font-medium"
                                    style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}
                                  >
                                    {formatEnum(entry)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {preferredWorkFormats.length > 0 && (
                            <div>
                              <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--surface-text-soft)' }}>
                                {t('profile.fields.preferredFormats')}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {preferredWorkFormats.map((entry) => (
                                  <span
                                    key={entry}
                                    className="rounded-lg px-2.5 py-1 text-xs font-medium"
                                    style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}
                                  >
                                    {formatEnum(entry)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {savedCandidateSkills.length > 0 && (
                        <div className="mt-5">
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--surface-text-soft)' }}>
                            {t('profile.skills.title')}
                          </p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {savedCandidateSkills.map((skill) => {
                              const level = savedCandidateSkillLevels[skill.toLowerCase()];
                              const levelLabelKey = candidateSkillLevelOptions.find((option) => option.value === level)?.labelKey;
                              return (
                                <div
                                  key={`candidate-skill-readonly-${skill}`}
                                  className="rounded-xl border px-3 py-2"
                                  style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-base)' }}
                                >
                                  <p className="text-sm font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                                    {skill}
                                  </p>
                                  <p className="text-xs mt-0.5" style={{ color: 'var(--surface-text-soft)' }}>
                                    {(levelLabelKey ? t(levelLabelKey) : '') || t('profile.skills.levelNotSet')}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </section>
                  </>
                )}
              </div>
            )}
            </div>
          )}

          {activeTab === 'documents' && isHr && (
            <section id="company-media" className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-2xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                    {t('profile.documents.companyMedia')}
                  </h2>
                  <p className="mt-2 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                    {t('profile.documents.companyMediaDescription')}
                  </p>
                </div>
                {(companyLogoFile || companyLogoSrc) && (
                  <button
                    type="button"
                    onClick={() =>
                      companyLogoFile
                        ? void handleOpenFile(companyLogoFile)
                        : window.open(companyLogoSrc, '_blank', 'noopener,noreferrer')
                    }
                    className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                    style={{ color: 'var(--surface-text-primary)' }}
                  >
                    {t('profile.actions.openLogo')}
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>

              {companyLogoSrc ? (
                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <img
                    src={companyLogoSrc}
                    alt={getString(profile?.companyName) || t('profile.documents.companyLogo')}
                    className="h-24 w-24 rounded-2xl object-cover"
                  />
                  <div className="text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                    <p className="font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                      {companyLogoFile ? getFileName(companyLogoFile) : t('profile.documents.companyLogo')}
                    </p>
                    {companyLogoFile && (
                      <p className="mt-1">{formatFileSize(companyLogoFile.sizeBytes)}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-black/10 bg-[var(--surface-soft)] p-5 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                  {t('profile.empty.uploadCompanyLogoHint')}
                </div>
              )}
            </section>
          )}

          {(activityError || activitySuccess) && (
            <div className="space-y-2">
              {activityError && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tone-danger-bg)', color: 'var(--tone-danger-text)' }}>
                  {activityError}
                </div>
              )}
              {activitySuccess && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tone-success-bg)', color: 'var(--tone-success-text)' }}>
                  {activitySuccess}
                </div>
              )}
            </div>
          )}

          {(isUploadingMedia || isDeletingMedia) && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--surface-border-soft)', color: 'var(--surface-text-primary)' }}>
              {isUploadingMedia ? t('profile.status.uploadingFile') : t('profile.status.removingFile')}
            </div>
          )}

          {activeTab === 'documents' && isCandidate && (
            <>
              <section id="files" className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
                  <div
                    className="rounded-2xl border p-4 sm:p-5"
                    style={{
                      borderColor: 'var(--surface-border-strong)',
                      background:
                        'linear-gradient(145deg, var(--surface-subtle) 0%, var(--surface-base) 100%)',
                    }}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="font-heading text-2xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.documents.resumes')}
                        </h2>
                        <p className="mt-2 text-sm leading-6" style={{ color: 'var(--surface-text-muted)' }}>
                          {t('profile.documents.resumesDescription')}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}>
                            {displayedResumes.length} file(s)
                          </span>
                          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-muted)' }}>
                            {t('profile.documents.maxSize40mb')}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setResumeUploadFile(null);
                          setResumeTitle('');
                          setResumePrimary(displayedResumes.length === 0);
                          setIsResumeUploadModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all hover:shadow-sm"
                        style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}
                      >
                        <FileUp className="h-4 w-4" />
                        {t('profile.actions.addResume')}
                      </button>
                    </div>
                  </div>

                  {displayedResumes.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed p-6 text-sm" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-muted)' }}>
                      <p className="font-semibold" style={{ color: 'var(--surface-text-primary)' }}>{t('profile.empty.noResumes')}</p>
                      <p className="mt-2">{t('profile.empty.noResumesDescription')}</p>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-4">
                      {displayedResumes.map((resume, index) => (
                        <article
                          key={getFileId(resume) || getString(resume.id) || `resume-${index}`}
                          className="rounded-2xl border p-4"
                          style={{
                            borderColor: 'var(--surface-border-soft)',
                            background:
                              'linear-gradient(145deg, var(--surface-subtle) 0%, var(--surface-base) 100%)',
                          }}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}>
                                  <FileArchive className="h-4 w-4" />
                                </span>
                                <p className="font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                                  {getFileName(resume)}
                                </p>
                                {resume.isPrimary === true && (
                                  <span className="rounded-lg px-2 py-1 text-[11px] font-semibold" style={{ backgroundColor: 'var(--tone-info-text)', color: 'white' }}>
                                    {t('profile.labels.primary')}
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 text-xs" style={{ color: 'var(--surface-text-soft)' }}>
                                {formatFileSize(resume.sizeBytes)} • {t('profile.labels.updated')}: {formatDateTime(getString(resume.updatedAt) || getString(resume.createdAt))}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {getFileId(resume) && (
                                <button
                                  type="button"
                                  onClick={() => void handleOpenFile(resume)}
                                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium"
                                  style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)', backgroundColor: 'var(--surface-base)' }}
                                >
                                  <Download className="h-4 w-4" />
                                  {t('common.open')}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteUploadedFile(getFileId(resume), t('profile.success.resumeDeleted'))
                                }
                                disabled={isDeletingMedia}
                                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium"
                                style={{ borderColor: 'rgba(220, 38, 38, 0.2)', color: 'var(--tone-danger-text)', backgroundColor: 'var(--surface-base)' }}
                              >
                                <Trash2 className="h-4 w-4" />
                                {t('common.delete')}
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
                  <div
                    className="rounded-2xl border p-4 sm:p-5"
                    style={{
                      borderColor: 'var(--surface-border-strong)',
                      background:
                        'linear-gradient(145deg, var(--surface-subtle) 0%, var(--surface-base) 100%)',
                    }}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="font-heading text-2xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.documents.portfolioFiles')}
                        </h2>
                        <p className="mt-2 text-sm leading-6" style={{ color: 'var(--surface-text-muted)' }}>
                          {t('profile.documents.portfolioDescription')}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}>
                            {displayedPortfolioFiles.length} file(s)
                          </span>
                          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-muted)' }}>
                            {t('profile.documents.maxSize40mb')}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPortfolioUploadFile(null);
                          setIsPortfolioUploadModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all hover:shadow-sm"
                        style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}
                      >
                        <UploadCloud className="h-4 w-4" />
                        {t('profile.actions.addPortfolio')}
                      </button>
                    </div>
                  </div>

                  {displayedPortfolioFiles.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed p-6 text-sm" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-muted)' }}>
                      <p className="font-semibold" style={{ color: 'var(--surface-text-primary)' }}>{t('profile.empty.noPortfolio')}</p>
                      <p className="mt-2">{t('profile.empty.noPortfolioDescription')}</p>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-4">
                      {displayedPortfolioFiles.map((file, index) => (
                        <article
                          key={getFileId(file) || getString(file.id) || `portfolio-${index}`}
                          className="rounded-2xl border p-4"
                          style={{
                            borderColor: 'var(--surface-border-soft)',
                            background:
                              'linear-gradient(145deg, var(--surface-subtle) 0%, var(--surface-base) 100%)',
                          }}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}>
                                  <FileArchive className="h-4 w-4" />
                                </span>
                                <p className="font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                                  {getFileName(file)}
                                </p>
                              </div>
                              <p className="mt-2 text-xs" style={{ color: 'var(--surface-text-soft)' }}>
                                {formatFileSize(file.sizeBytes)} • {t('profile.labels.uploaded')}: {formatDateTime(getString(file.createdAt))}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {getFileId(file) && (
                                <button
                                  type="button"
                                  onClick={() => void handleOpenFile(file)}
                                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium"
                                  style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)', backgroundColor: 'var(--surface-base)' }}
                                >
                                  <Download className="h-4 w-4" />
                                  Open
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteUploadedFile(getFileId(file), t('profile.success.portfolioDeleted'))
                                }
                                disabled={isDeletingMedia}
                                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium"
                                style={{ borderColor: 'rgba(220, 38, 38, 0.2)', color: 'var(--tone-danger-text)', backgroundColor: 'var(--surface-base)' }}
                              >
                                <Trash2 className="h-4 w-4" />
                                {t('common.delete')}
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {isResumeUploadModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur-sm">
                  <div className="w-full max-w-xl rounded-3xl border bg-white p-6 shadow-2xl sm:p-7" style={{ borderColor: 'var(--surface-border-strong)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--surface-text-soft)' }}>
                          {t('profile.modals.resume.badge')}
                        </p>
                        <h3 className="mt-1 font-heading text-2xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.modals.resume.title')}
                        </h3>
                        <p className="mt-2 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                          {t('profile.modals.resume.description')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsResumeUploadModalOpen(false)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border"
                        style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-soft)' }}
                        aria-label={t('common.close')}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)' }}>
                        <input
                          ref={resumeFileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            event.target.value = '';
                            setResumeUploadFile(file);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => resumeFileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
                          style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}
                        >
                          <UploadCloud className="h-4 w-4" />
                          {resumeUploadFile ? t('profile.actions.changeFile') : t('profile.actions.chooseFile')}
                        </button>
                        <p className="mt-3 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                          {resumeUploadFile ? `${resumeUploadFile.name} • ${formatFileSize(resumeUploadFile.size)}` : t('profile.empty.noFileSelected')}
                        </p>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.fields.resumeTitle')}
                        </label>
                        <div className="relative">
                          <Pencil className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--surface-text-soft)' }} />
                          <Input
                            value={resumeTitle}
                            onChange={(event) => setResumeTitle(event.target.value)}
                            placeholder={t('profile.placeholders.resumeTitle')}
                            className="h-12 rounded-xl border pl-10"
                            style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)' }}
                          />
                        </div>
                      </div>

                      <label className="inline-flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}>
                        <input
                          type="checkbox"
                          checked={resumePrimary}
                          onChange={(event) => setResumePrimary(event.target.checked)}
                          className="h-4 w-4"
                        />
                        {t('profile.fields.markPrimaryResume')}
                      </label>
                    </div>

                    <div className="mt-7 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsResumeUploadModalOpen(false)}
                        className="rounded-xl border px-4 py-2 text-sm font-semibold"
                        style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-soft)', backgroundColor: 'var(--surface-base)' }}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleResumeUploadConfirm()}
                        disabled={!resumeUploadFile || isUploadingMedia}
                        className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: 'var(--tone-info-text)' }}
                      >
                        {isUploadingMedia ? t('common.uploading') : t('profile.actions.uploadResume')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isPortfolioUploadModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur-sm">
                  <div className="w-full max-w-xl rounded-3xl border bg-white p-6 shadow-2xl sm:p-7" style={{ borderColor: 'var(--surface-border-strong)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--surface-text-soft)' }}>
                          {t('profile.modals.portfolio.badge')}
                        </p>
                        <h3 className="mt-1 font-heading text-2xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                          {t('profile.modals.portfolio.title')}
                        </h3>
                        <p className="mt-2 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                          {t('profile.modals.portfolio.description')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPortfolioUploadModalOpen(false)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border"
                        style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-soft)' }}
                        aria-label={t('common.close')}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)' }}>
                      <input
                        ref={portfolioFileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          event.target.value = '';
                          setPortfolioUploadFile(file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => portfolioFileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
                        style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}
                      >
                        <UploadCloud className="h-4 w-4" />
                        {portfolioUploadFile ? t('profile.actions.changeFile') : t('profile.actions.chooseFile')}
                      </button>
                      <p className="mt-3 text-sm" style={{ color: 'var(--surface-text-soft)' }}>
                        {portfolioUploadFile ? `${portfolioUploadFile.name} • ${formatFileSize(portfolioUploadFile.size)}` : t('profile.empty.noFileSelected')}
                      </p>
                    </div>

                    <div className="mt-7 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPortfolioUploadModalOpen(false)}
                        className="rounded-xl border px-4 py-2 text-sm font-semibold"
                        style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-soft)', backgroundColor: 'var(--surface-base)' }}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handlePortfolioUploadConfirm()}
                        disabled={!portfolioUploadFile || isUploadingMedia}
                        className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: 'var(--tone-info-text)' }}
                      >
                        {isUploadingMedia ? t('common.uploading') : t('profile.actions.uploadPortfolio')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'activity' && isCandidate && (
            <div id="activity" className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="font-heading text-2xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                      {t('profile.activity.savedVacancies')}
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                      {t('profile.activity.savedVacanciesDescription')}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}>
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('profile.activity.savedCount', { count: favoriteItems.length })}
                  </div>
                </div>

                {favoritesLoading ? (
                  <p style={{ color: 'var(--surface-text-muted)' }}>{t('profile.activity.loadingSavedVacancies')}</p>
                ) : favoriteItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-5" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)' }}>
                    <p style={{ color: 'var(--surface-text-muted)' }}>
                      {t('profile.activity.savedVacanciesEmpty')}
                    </p>
                    <Link
                      to="/app/jobs"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all hover:shadow-sm"
                      style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)', backgroundColor: 'var(--surface-soft)' }}
                    >
                      <Compass className="h-4 w-4" />
                      {t('applications.browseJobs')}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {favoriteItems.map((item) => (
                      <div key={item.vacancy.id} className="rounded-2xl border border-black/5 p-4" style={{ backgroundColor: 'var(--surface-subtle)' }}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link to={`/app/jobs/${item.vacancy.id}`} className="font-semibold hover:underline" style={{ color: 'var(--surface-text-primary)' }}>
                              {item.vacancy.title}
                            </Link>
                            <p className="mt-1 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                              {item.vacancy.company?.name || t('common.company')}
                              {item.vacancy.publicationCity?.name
                                ? ` • ${item.vacancy.publicationCity.name}`
                                : ''}
                            </p>
                          </div>
                          <span className="rounded-lg px-2 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--surface-base)', color: 'var(--surface-text-primary)' }}>
                            {t('profile.activity.savedCount', { count: item.vacancy.favoritesCount })}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.vacancy.specializations.slice(0, 3).map((specialization) => (
                            <span key={`${item.vacancy.id}-${specialization.id || specialization.name}`} className="rounded-lg px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'var(--surface-base)', color: 'var(--surface-text-primary)' }}>
                              {specialization.name || t('profile.labels.specialization')}
                            </span>
                          ))}
                        </div>
                        <p className="mt-3 text-xs" style={{ color: 'var(--surface-text-soft)' }}>
                          {t('profile.labels.savedAt')}: {formatDateTime(item.favoriteCreatedAt)}
                        </p>
                        <Link
                          to={`/app/jobs/${item.vacancy.id}`}
                          className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all hover:shadow-sm"
                          style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)', backgroundColor: 'var(--surface-base)' }}
                        >
                          <Eye className="h-4 w-4" />
                          {t('jobs.viewVacancy')}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section id="invites" className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="font-heading text-2xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                      {t('profile.activity.myInvites')}
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                      {t('profile.activity.myInvitesDescription')}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}>
                    <Send className="w-3.5 h-3.5" />
                    {t('profile.activity.invitesCount', { count: myInvites.length })}
                  </div>
                </div>

                {invitesLoading ? (
                  <p style={{ color: 'var(--surface-text-muted)' }}>{t('profile.activity.loadingInvites')}</p>
                ) : myInvites.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-5" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-soft)' }}>
                    <p style={{ color: 'var(--surface-text-muted)' }}>
                      {t('profile.activity.invitesEmpty')}
                    </p>
                    <Link
                      to="/app/applications"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all hover:shadow-sm"
                      style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)', backgroundColor: 'var(--surface-soft)' }}
                    >
                      <Briefcase className="h-4 w-4" />
                      {t('profile.actions.openApplications')}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myInvites.map((invite) => (
                      <div key={invite.id} className="rounded-2xl border border-black/5 p-4" style={{ backgroundColor: 'var(--surface-subtle)' }}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                              {invite.vacancy?.title || t('profile.activity.vacancyInvite')}
                            </p>
                            <p className="mt-1 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                              {invite.vacancy?.company?.name || t('common.company')}
                            </p>
                          </div>
                          <span
                            className="rounded-lg px-2 py-1 text-xs font-semibold"
                            style={getInviteStatusStyle(invite.status)}
                          >
                            {formatInviteStatus(invite.status)}
                          </span>
                        </div>

                        {invite.message && (
                          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--surface-text-muted)' }}>
                            {invite.message}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--surface-text-soft)' }}>
                          <span>{t('profile.labels.created')}: {formatDateTime(invite.createdAt)}</span>
                          <span>{t('profile.labels.interview')}: {formatDateTime(invite.interviewAt)}</span>
                        </div>

                        {invite.vacancy?.id && (
                          <Link
                            to={`/app/jobs/${invite.vacancy.id}`}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all hover:shadow-sm"
                            style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)', backgroundColor: 'var(--surface-base)' }}
                          >
                            <ExternalLink className="w-4 h-4" />
                            {t('jobs.viewVacancy')}
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'notifications' && (
            <section id="notifications" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-heading text-2xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                      {t('profile.notifications.title')}
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                      {t('profile.notifications.description')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}>
                      <BellRing className="h-3.5 w-3.5" />
                      {t('profile.notifications.unreadWithCount', { count: notificationsMeta.unread })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void loadNotifications({ limit: 20, offset: 0 })}
                      disabled={notificationsLoading}
                      style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)' }}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      {t('applications.refresh')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={notificationsMutating || notificationsMeta.unread === 0}
                      onClick={() => void handleMarkAllNotificationsRead()}
                      style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)' }}
                    >
                      <CheckCheck className="h-4 w-4" />
                      {t('header.markAllRead')}
                    </Button>
                  </div>
                </div>

                {notificationsLoading ? (
                  <div className="rounded-2xl border border-dashed border-black/10 bg-[var(--surface-subtle)] p-6 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                    {t('header.loadingNotifications')}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/10 bg-[var(--surface-subtle)] p-8 text-center">
                    <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-base)] text-[var(--surface-text-primary)]">
                      <Bell className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-lg font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                      {t('header.noNotifications')}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                      New invites, status changes, and system events will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[680px] space-y-3 overflow-y-auto pr-1">
                    {notifications.map((notification) => {
                      const href = getNotificationHref(notification);
                      const isUnread = !notification.readAt;

                      return (
                        <div
                          key={notification.id}
                          className={`rounded-2xl border p-4 ${
                            isUnread ? 'border-[var(--tone-info-text)]/30 bg-[var(--surface-soft)]' : 'border-black/5 bg-[var(--surface-base)]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                                {notification.title}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--surface-text-faint)' }}>
                                {notification.type}
                              </p>
                            </div>
                            <span
                              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                              style={{
                                backgroundColor: isUnread ? 'var(--tone-info-bg)' : 'var(--surface-chip)',
                                color: isUnread ? 'var(--tone-info-text)' : 'var(--surface-text-primary)',
                              }}
                            >
                              {isUnread ? t('header.unread') : t('header.read')}
                            </span>
                          </div>

                          <p className="mt-3 text-xs" style={{ color: 'var(--surface-text-soft)' }}>
                            {formatDateTime(notification.createdAt)}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-3">
                            {href && (
                              <Link to={href} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all hover:shadow-sm" style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)', backgroundColor: 'var(--surface-base)' }}>
                                {t('common.open')}
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            )}
                            {isUnread && (
                              <button
                                type="button"
                                onClick={() => void handleMarkNotificationRead(notification.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all hover:shadow-sm"
                                style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)', backgroundColor: 'var(--surface-base)' }}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                {t('header.markRead')}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl p-6 sm:p-8 xl:sticky xl:top-[110px] xl:h-fit" style={cardStyle}>
                <div className="mb-5">
                  <h2 className="font-heading text-2xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                    Telegram Notifications
                  </h2>
                  <p className="mt-1 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                    Connect Telegram once, then manage what exactly should be delivered there.
                  </p>
                </div>

                <div className="mb-4 rounded-2xl border p-4" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-subtle)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--surface-text-soft)' }}>
                        Connection Status
                      </p>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: isTelegramLinked ? 'var(--tone-success-bg)' : 'var(--tone-danger-bg)', color: isTelegramLinked ? 'var(--tone-success-text)' : 'var(--tone-danger-text)' }}>
                        {isTelegramLinked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        {isTelegramLinked ? 'Connected' : 'Not connected'}
                      </div>
                    </div>
                    {isTelegramLinked && (
                      <button
                        type="button"
                        onClick={() => void handleTelegramChatIdCopy()}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all hover:shadow-sm"
                        style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)', backgroundColor: 'var(--surface-base)' }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy ID
                      </button>
                    )}
                  </div>

                  <div className="mt-3 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--surface-border-strong)', backgroundColor: 'var(--surface-base)' }}>
                    <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--surface-text-soft)' }}>Chat ID</p>
                    <p className="mt-1 font-mono text-sm" style={{ color: 'var(--surface-text-primary)' }}>
                      {telegramSettings.telegramChatId || '—'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() =>
                      initializeTelegramSettings({
                        telegramNotificationsEnabled: !telegramSettings.telegramNotificationsEnabled,
                      })
                    }
                    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-black/5 bg-[var(--surface-subtle)] p-4 text-left"
                  >
                    <div>
                      <p className="font-medium" style={{ color: 'var(--surface-text-primary)' }}>
                        Enable Telegram notifications
                      </p>
                      <p className="text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                        Toggle delivery to Telegram for all enabled event types.
                      </p>
                    </div>
                    <span className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${telegramSettings.telegramNotificationsEnabled ? 'bg-[#2B6A4D]' : 'bg-[var(--surface-border-strong)]'}`}>
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white keep-white transition-all ${telegramSettings.telegramNotificationsEnabled ? 'left-6' : 'left-1'}`} />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      initializeTelegramSettings({
                        telegramNotifyInvites: !telegramSettings.telegramNotifyInvites,
                      })
                    }
                    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-black/5 bg-[var(--surface-subtle)] p-4 text-left"
                  >
                    <div>
                      <p className="font-medium" style={{ color: 'var(--surface-text-primary)' }}>
                        Invite notifications
                      </p>
                      <p className="text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                        Vacancy invites from HR.
                      </p>
                    </div>
                    <span className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${telegramSettings.telegramNotifyInvites ? 'bg-[#2B6A4D]' : 'bg-[var(--surface-border-strong)]'}`}>
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white keep-white transition-all ${telegramSettings.telegramNotifyInvites ? 'left-6' : 'left-1'}`} />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      initializeTelegramSettings({
                        telegramNotifyApplications: !telegramSettings.telegramNotifyApplications,
                      })
                    }
                    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-black/5 bg-[var(--surface-subtle)] p-4 text-left"
                  >
                    <div>
                      <p className="font-medium" style={{ color: 'var(--surface-text-primary)' }}>
                        Application notifications
                      </p>
                      <p className="text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                        Alerts for new applications and application-related events.
                      </p>
                    </div>
                    <span className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${telegramSettings.telegramNotifyApplications ? 'bg-[#2B6A4D]' : 'bg-[var(--surface-border-strong)]'}`}>
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white keep-white transition-all ${telegramSettings.telegramNotifyApplications ? 'left-6' : 'left-1'}`} />
                    </span>
                  </button>
                </div>

                <div className="mt-5 grid gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void handleTelegramSettingsSave()}
                    disabled={notificationsMutating}
                    className="justify-center"
                    style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)' }}
                  >
                    <CheckCheck className="h-4 w-4" />
                    Save settings
                  </Button>
                  <Button
                    variant="hero"
                    onClick={() => void handleTelegramLinkCreate()}
                    disabled={notificationsMutating}
                    className="justify-center"
                    style={{ backgroundColor: '#2B6A4D', color: 'white' }}
                  >
                    <Rocket className="h-4 w-4" />
                    Generate Telegram link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handleTelegramStatusRefresh()}
                    disabled={notificationsMutating}
                    className="justify-center"
                    style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)' }}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Refresh connection status
                  </Button>
                </div>

                {telegramLinkSession?.deepLink && (
                  <div className="mt-5 rounded-2xl border border-black/5 bg-[var(--surface-subtle)] p-4">
                    <p className="inline-flex items-center gap-2 font-medium" style={{ color: 'var(--surface-text-primary)' }}>
                      <MessageCircle className="h-4 w-4" />
                      Telegram deep-link is ready
                    </p>
                    <p className="mt-2 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                      Expires at: {formatDateTime(telegramLinkSession.expiresAt)}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                      Bot: {telegramLinkSession.botUsername || 'configured bot'}
                    </p>
                    <a
                      href={telegramLinkSession.deepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold hover:underline"
                      style={{ color: 'var(--surface-text-primary)' }}
                    >
                      Open Telegram
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    {telegramLinkSession.instructions && (
                      <p className="mt-3 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                        {telegramLinkSession.instructions}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'privacy' && (
            <section className="space-y-6">
              <div className="app-section-card p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      Trust & Compliance
                    </p>
                    <p className="mt-1 text-sm text-[var(--surface-text-soft)]">
                      Manage consents, export personal data, send complaints, and control deletion workflow.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => void reloadPrivacyCenter()}
                    disabled={isPrivacyLoading}
                    style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--surface-text-primary)' }}
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              {privacyError && (
                <div
                  className="rounded-2xl border px-4 py-3 text-sm"
                  style={{ borderColor: 'rgba(220, 38, 38, 0.28)', backgroundColor: 'var(--tone-danger-bg)', color: 'var(--tone-danger-text)' }}
                >
                  {privacyError}
                </div>
              )}

              {privacySuccess && (
                <div
                  className="rounded-2xl border bg-[var(--surface-soft)] px-4 py-3 text-sm"
                  style={{ borderColor: 'var(--surface-border-strong)', color: 'var(--tone-success-text)' }}
                >
                  {privacySuccess}
                </div>
              )}

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl p-6 sm:p-7" style={cardStyle}>
                  <div className="mb-4 flex items-center gap-2">
                    <FileArchive className="h-4 w-4 text-[var(--tone-info-text)]" />
                    <h2 className="font-heading text-xl font-bold text-[var(--surface-text-primary)]">Consent Snapshots</h2>
                  </div>
                  <p className="mb-4 text-sm text-[var(--surface-text-soft)]">
                    Backend stores consent history as snapshots, not overwrites.
                  </p>

                  <Input
                    value={consentVersion}
                    onChange={(event) => setConsentVersion(event.target.value)}
                    placeholder="Consent version, e.g. v1.0-2026-05-13"
                    className="mb-4 rounded-xl border-black/10 bg-[var(--surface-soft)]"
                  />

                  <div className="space-y-3">
                    {privacyConsentTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setConsentDraft((prev) => ({
                            ...prev,
                            [type]: !prev[type],
                          }))
                        }
                        className="flex w-full items-center justify-between rounded-2xl border border-black/5 bg-[var(--surface-subtle)] px-4 py-3 text-left"
                      >
                        <div>
                          <p className="font-medium text-[var(--surface-text-primary)]">{formatEnum(type)}</p>
                          <p className="text-xs text-[var(--surface-text-soft)]">Current draft: {consentDraft[type] ? 'Accepted' : 'Declined'}</p>
                        </div>
                        <span
                          className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
                            consentDraft[type] ? 'bg-[#2B6A4D]' : 'bg-[var(--surface-border-strong)]'
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white keep-white transition-all ${
                              consentDraft[type] ? 'left-6' : 'left-1'
                            }`}
                          />
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <Button
                      variant="hero"
                      onClick={() => void handleSaveConsents()}
                      disabled={isPrivacyMutating}
                    >
                      Save consent snapshot
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void handleExportMyData()}
                      disabled={isPrivacyMutating}
                    >
                      <Download className="h-4 w-4" />
                      Export my data
                    </Button>
                  </div>

                  {privacyExport && (
                    <div className="mt-5 rounded-2xl border border-black/5 bg-[var(--surface-subtle)] p-4 text-sm text-[var(--surface-text-muted)]">
                      <p>
                        Exported at: <span className="font-semibold text-[var(--surface-text-primary)]">{formatDateTime(privacyExport.exportedAt)}</span>
                      </p>
                      <p className="mt-1">
                        Files indexed: <span className="font-semibold text-[var(--surface-text-primary)]">{privacyExport.filesIndex.length}</span>
                      </p>
                    </div>
                  )}

                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      Latest consent history
                    </p>
                    <div className="space-y-2">
                      {consents.slice(0, 6).map((entry) => (
                        <div key={entry.id} className="rounded-xl border border-black/5 bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--surface-text-soft)]">
                          <span className="font-semibold text-[var(--surface-text-primary)]">{formatEnum(entry.type)}</span> • {entry.version} •{' '}
                          {entry.accepted ? 'accepted' : 'declined'} • {formatDateTime(entry.createdAt)}
                        </div>
                      ))}
                      {consents.length === 0 && !isPrivacyLoading && (
                        <p className="text-sm text-[var(--surface-text-muted)]">No consent snapshots yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl p-6 sm:p-7" style={cardStyle}>
                    <div className="mb-4 flex items-center gap-2">
                      <UserRoundX className="h-4 w-4 text-[var(--tone-danger-text)]" />
                      <h2 className="font-heading text-xl font-bold text-[var(--surface-text-primary)]">Delete Request</h2>
                    </div>
                    <p className="mb-4 text-sm text-[var(--surface-text-soft)]">
                      Creates account deletion request and schedules hard-delete according to backend policy.
                    </p>
                    <Textarea
                      value={deleteReason}
                      onChange={(event) => setDeleteReason(event.target.value)}
                      rows={3}
                      placeholder="Reason for delete request"
                      className="rounded-xl border-black/10 bg-[var(--surface-soft)]"
                    />
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Button
                        variant="hero"
                        onClick={() => void handleCreateDeleteRequest()}
                        disabled={isPrivacyMutating}
                      >
                        Create request
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void handleCancelDeleteRequest()}
                        disabled={isPrivacyMutating}
                      >
                        Cancel request
                      </Button>
                    </div>
                    {deleteRequestStatus && (
                      <div className="mt-4 inline-flex rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--surface-text-primary)]">
                        Current status: {formatEnum(deleteRequestStatus)}
                      </div>
                    )}
                  </div>

                  {isHr && (
                    <div className="rounded-2xl p-6 sm:p-7" style={cardStyle}>
                      <div className="mb-4 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[var(--tone-info-text)]" />
                        <h2 className="font-heading text-xl font-bold text-[var(--surface-text-primary)]">Company Verification</h2>
                      </div>

                      {companyVerification ? (
                        <>
                          <div className="inline-flex rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--surface-text-primary)]">
                            Status: {companyVerificationStatuses.includes(companyVerification.verificationStatus || 'PENDING') ? formatEnum(companyVerification.verificationStatus) : 'Pending'}
                          </div>
                          <p className="mt-3 text-sm text-[var(--surface-text-soft)]">
                            Reviewed at: {formatDateTime(companyVerification.verificationReviewedAt)}
                          </p>
                          <p className="text-sm text-[var(--surface-text-soft)]">
                            Due at: {formatDateTime(companyVerification.verificationDueAt)}
                          </p>
                          {companyVerification.verificationComment && (
                            <p className="mt-2 rounded-xl bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--surface-text-muted)]">
                              Comment: {companyVerification.verificationComment}
                            </p>
                          )}
                          <div className="mt-4 space-y-2">
                            {companyVerification.verificationSubmissions.map((submission) => (
                              <div key={submission.id} className="rounded-xl border border-black/5 bg-[var(--surface-soft)] px-3 py-2 text-xs text-[var(--surface-text-soft)]">
                                <span className="font-semibold text-[var(--surface-text-primary)]">
                                  {formatEnum(submission.status)}
                                </span>{' '}
                                • {submission.binIin || 'No BIN/IIN'} • {formatDateTime(submission.createdAt)}
                              </div>
                            ))}
                            {companyVerification.verificationSubmissions.length === 0 && (
                              <p className="text-sm text-[var(--surface-text-muted)]">No verification submissions yet.</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-[var(--surface-text-muted)]">
                          Verification snapshot not available yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl p-6 sm:p-7" style={cardStyle}>
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--tone-danger-text)]" />
                  <h2 className="font-heading text-xl font-bold text-[var(--surface-text-primary)]">Complaints</h2>
                </div>
                <p className="mb-4 text-sm text-[var(--surface-text-soft)]">
                  Report vacancy, profile, or message directly to moderation queue.
                </p>

                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    value={complaintTargetType}
                    onChange={(event) => setComplaintTargetType(event.target.value as ComplaintTargetType)}
                    className="h-11 rounded-xl border border-black/10 bg-[var(--surface-soft)] px-3 text-sm"
                  >
                    {complaintTargetTypes.map((type) => (
                      <option key={type} value={type}>
                        {formatEnum(type)}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={complaintTargetId}
                    onChange={(event) => setComplaintTargetId(event.target.value)}
                    placeholder="Target ID (vacancy/profile/message)"
                    className="h-11 rounded-xl border-black/10 bg-[var(--surface-soft)]"
                  />
                </div>

                <Input
                  value={complaintReason}
                  onChange={(event) => setComplaintReason(event.target.value)}
                  placeholder="Reason"
                  className="mt-3 h-11 rounded-xl border-black/10 bg-[var(--surface-soft)]"
                />
                <Textarea
                  value={complaintDetails}
                  onChange={(event) => setComplaintDetails(event.target.value)}
                  rows={3}
                  placeholder="Details (optional)"
                  className="mt-3 rounded-xl border-black/10 bg-[var(--surface-soft)]"
                />
                <div className="mt-3">
                  <Button variant="hero" onClick={() => void handleCreateComplaint()} disabled={isPrivacyMutating}>
                    Submit complaint
                  </Button>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-4">
                  {complaintStatuses.map((status) => {
                    const count = myComplaints.filter((entry) => entry.status === status).length;

                    return (
                      <div key={status} className="rounded-xl border border-black/5 bg-[var(--surface-soft)] px-3 py-2 text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--surface-text-soft)]">
                          {formatEnum(status)}
                        </p>
                        <p className="mt-1 text-base font-bold text-[var(--surface-text-primary)]">{count}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 space-y-2">
                  {myComplaints.slice(0, 8).map((complaint) => (
                    <div key={complaint.id} className="rounded-xl border border-black/5 bg-[var(--surface-soft)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--surface-text-primary)]">
                          {formatEnum(complaint.targetType)} • {complaint.targetId || 'No target'}
                        </p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--surface-text-soft)]">
                          {formatEnum(complaint.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--surface-text-muted)]">{complaint.reason || 'No reason'}</p>
                      {complaint.details && (
                        <p className="mt-1 text-xs text-[var(--surface-text-muted)]">{complaint.details}</p>
                      )}
                      <p className="mt-1 text-xs text-[var(--surface-text-muted)]">{formatDateTime(complaint.createdAt)}</p>
                    </div>
                  ))}
                  {myComplaints.length === 0 && !isPrivacyLoading && (
                    <p className="text-sm text-[var(--surface-text-muted)]">No complaints yet.</p>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};
