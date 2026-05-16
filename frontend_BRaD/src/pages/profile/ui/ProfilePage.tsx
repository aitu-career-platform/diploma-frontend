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
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'WATCH', label: 'Internship' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'SIDE_JOB', label: 'Side Job' },
] as const;

const preferredWorkFormatOptions = [
  { value: 'ONSITE', label: 'Onsite' },
  { value: 'REMOTE', label: 'Remote' },
  { value: 'HYBRID', label: 'Hybrid' },
] as const;

const candidateSkillLevelOptions = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
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
  backgroundColor: 'white',
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
    return { backgroundColor: '#DBF2DD', color: '#166534' };
  }

  if (normalized === 'REJECTED') {
    return { backgroundColor: '#FEE2E2', color: '#991B1B' };
  }

  if (normalized === 'EXPIRED') {
    return { backgroundColor: '#E5E7EB', color: '#374151' };
  }

  return { backgroundColor: '#EAF4DF', color: '#2D553F' };
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
  const resumeFileInputRef = useRef<HTMLInputElement | null>(null);
  const portfolioFileInputRef = useRef<HTMLInputElement | null>(null);

  const profile = (currentProfile as Record<string, unknown> | null) || null;
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
        { id: 'profile' as const, label: 'Profile', description: 'Personal and role data' },
        { id: 'documents' as const, label: 'Documents', description: isCandidate ? 'Resumes and portfolio' : 'Company media' },
        ...(isCandidate
          ? [{ id: 'activity' as const, label: 'Activity', description: 'Saved vacancies and invites' }]
          : []),
        { id: 'notifications' as const, label: 'Notifications', description: 'In-app and Telegram settings' },
        { id: 'privacy' as const, label: 'Privacy', description: 'Consents, export, and reports' },
      ] satisfies Array<{ id: ProfileTab; label: string; description: string }>,
    [isCandidate],
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
      setError(submitError instanceof Error ? submitError.message : 'Failed to update profile');
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
      setActivityError(
        'Link Telegram first: generate the deep-link, press Start in the bot, then refresh Telegram status.',
      );
      return;
    }

    try {
      await updateTelegramSettings({
        telegramNotificationsEnabled: telegramSettings.telegramNotificationsEnabled,
        telegramNotifyInvites: telegramSettings.telegramNotifyInvites,
        telegramNotifyApplications: telegramSettings.telegramNotifyApplications,
      });
      setActivitySuccess('Telegram settings saved.');
    } catch (saveError) {
      setActivityError(
        saveError instanceof Error ? saveError.message : 'Failed to save Telegram settings',
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
        linkError instanceof Error ? linkError.message : 'Failed to create Telegram link',
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
        setActivitySuccess('Telegram Chat ID copied.');
      }
    } catch {
      setActivityError('Failed to copy Chat ID.');
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
        setActivitySuccess('Telegram linked successfully. You can save notification flags now.');
      } else {
        setActivityError(
          'Telegram is not linked yet. Open the deep-link, press Start in the bot, then try refresh again.',
        );
      }
    } catch (refreshError) {
      setActivityError(
        refreshError instanceof Error
          ? refreshError.message
          : 'Failed to refresh Telegram status',
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
        markError instanceof Error ? markError.message : 'Failed to mark notifications as read',
      );
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    setActivityError(null);

    try {
      await markAsRead(notificationId);
    } catch (markError) {
      setActivityError(
        markError instanceof Error ? markError.message : 'Failed to mark notification as read',
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
      setActivityError(`File is too large. Max allowed for this upload is ${getUploadLimitLabel(config.target)}.`);
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
      setActivityError(uploadError instanceof Error ? uploadError.message : 'Failed to upload file');
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
      setActivityError('Pick a resume file first.');
      return;
    }

    const ok = await handleProfileUpload(resumeUploadFile, {
      target: 'CANDIDATE_RESUME',
      resumeTitle: resumeTitle.trim() || undefined,
      isPrimary: resumePrimary,
      successMessage: 'Resume uploaded.',
    });

    if (ok) {
      setResumeUploadFile(null);
      setIsResumeUploadModalOpen(false);
    }
  };

  const handlePortfolioUploadConfirm = async () => {
    if (!portfolioUploadFile) {
      setActivityError('Pick a portfolio file first.');
      return;
    }

    const ok = await handleProfileUpload(portfolioUploadFile, {
      target: 'CANDIDATE_PORTFOLIO',
      successMessage: 'Portfolio file uploaded.',
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
      setActivityError('File ID is missing');
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
      setActivityError(deleteError instanceof Error ? deleteError.message : 'Failed to delete file');
    }
  };

  const handleOpenFile = async (file: Record<string, unknown> | null) => {
    const fileId = getFileId(file);
    if (!fileId) {
      setActivityError('File is unavailable for download.');
      return;
    }

    try {
      const nextHref = await getDownloadUrl(fileId);

      if (!nextHref) {
        throw new Error('Download URL is unavailable');
      }

      window.open(nextHref, '_blank', 'noopener,noreferrer');
    } catch (openError) {
      setActivityError(openError instanceof Error ? openError.message : 'Failed to open file');
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
          : 'Failed to reload privacy center',
      );
    } finally {
      setIsPrivacyLoading(false);
    }
  };

  const handleSaveConsents = async () => {
    if (!consentVersion.trim()) {
      setPrivacyError('Consent version is required.');
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
      setPrivacyError(consentError instanceof Error ? consentError.message : 'Failed to save consent');
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
      setPrivacyError(exportError instanceof Error ? exportError.message : 'Failed to export data');
    } finally {
      setIsPrivacyMutating(false);
    }
  };

  const handleCreateDeleteRequest = async () => {
    if (!deleteReason.trim()) {
      setPrivacyError('Delete request reason is required.');
      return;
    }

    setPrivacyError(null);
    setPrivacySuccess(null);
    setIsPrivacyMutating(true);

    try {
      const result = await complianceApi.createDeleteRequest(deleteReason.trim());
      setDeleteRequestStatus(result?.status || 'REQUESTED');
      setPrivacySuccess('Delete request created. Account is now in deletion workflow.');
    } catch (deleteRequestError) {
      setPrivacyError(
        deleteRequestError instanceof Error
          ? deleteRequestError.message
          : 'Failed to create delete request',
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
      setPrivacySuccess('Delete request canceled. Account returned to active state.');
    } catch (cancelError) {
      setPrivacyError(cancelError instanceof Error ? cancelError.message : 'Failed to cancel delete request');
    } finally {
      setIsPrivacyMutating(false);
    }
  };

  const handleCreateComplaint = async () => {
    if (!complaintTargetId.trim() || !complaintReason.trim()) {
      setPrivacyError('Complaint target ID and reason are required.');
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
      setPrivacySuccess('Complaint submitted.');
    } catch (complaintError) {
      setPrivacyError(
        complaintError instanceof Error ? complaintError.message : 'Failed to submit complaint',
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
            <h1 className="font-heading text-3xl font-bold mb-4" style={{ color: '#333A2F' }}>
              Please sign in
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
            <h1 className="font-heading text-3xl font-bold mb-4" style={{ color: '#333A2F' }}>
              Loading profile...
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
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#526347]">Profile Workspace</p>
                <p className="mt-1 text-sm text-[#465A3B]">Everything is split into focused tabs instead of one long page.</p>
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
                          ? 'border-[#2B6A4D]/30 bg-[#EAF4DF]'
                          : 'border-[#9FB08A]/30 bg-white hover:bg-[#F4F8EA]'
                      }`}
                    >
                      {showUnreadTabBadge && (
                        <span
                          className="absolute right-3 top-3 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D62525] px-1 text-[11px] font-semibold leading-none text-white"
                          aria-label={`${unreadTabCount} unread notification${unreadTabCount === 1 ? '' : 's'}`}
                        >
                          {unreadTabCount > 9 ? '9+' : unreadTabCount}
                        </span>
                      )}
                      <p className="text-sm font-semibold text-[#23311D]">{tab.label}</p>
                      <p className="mt-1 text-xs text-[#566B4A]">{tab.description}</p>
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
                  <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EBEDDF' }}>
                    <User className="w-12 h-12" style={{ color: '#333A2F' }} />
                  </div>
                )}
                <div>
                  <h1 className="font-heading text-3xl font-bold mb-2" style={{ color: '#333A2F' }}>
                    {displayName}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
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
                    <span className="px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: '#EBEDDF', color: '#333A2F' }}>
                      {isHr ? 'HR profile' : 'Candidate profile'}
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
                  borderColor: 'rgba(51, 58, 47, 0.2)',
                  color: '#333A2F',
                  backgroundColor: 'transparent',
                }}
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            <div className="mb-6 flex flex-wrap gap-3">
              <label
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
                style={{ borderColor: 'rgba(51, 58, 47, 0.12)', backgroundColor: '#F7F8F1', color: '#333A2F' }}
              >
                <UploadCloud className="w-4 h-4" />
                Upload avatar
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) =>
                    void handleFileInputChange(event, {
                      target: 'USER_AVATAR',
                      successMessage: 'Avatar updated.',
                    })
                  }
                />
              </label>

              {avatarFileIdForDelete && (
                <button
                  type="button"
                  onClick={() =>
                    void handleDeleteUploadedFile(avatarFileIdForDelete, 'Avatar removed.', 'USER_AVATAR')
                  }
                  disabled={isDeletingMedia}
                  className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
                  style={{ borderColor: 'rgba(220, 38, 38, 0.2)', backgroundColor: 'white', color: '#b91c1c' }}
                >
                  <Trash2 className="w-4 h-4" />
                  Remove avatar
                </button>
              )}

              {isHr && (
                <>
                  <label
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
                    style={{ borderColor: 'rgba(51, 58, 47, 0.12)', backgroundColor: '#F7F8F1', color: '#333A2F' }}
                  >
                    <ImagePlus className="w-4 h-4" />
                    Upload company logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) =>
                        void handleFileInputChange(event, {
                          target: 'COMPANY_LOGO',
                          successMessage: 'Company logo updated.',
                        })
                      }
                    />
                  </label>

                  {companyLogoFile && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleDeleteUploadedFile(getFileId(companyLogoFile), 'Company logo removed.')
                      }
                      disabled={isDeletingMedia}
                      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
                      style={{ borderColor: 'rgba(220, 38, 38, 0.2)', backgroundColor: 'white', color: '#b91c1c' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove logo
                    </button>
                  )}
                </>
              )}
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}>
                {error}
              </div>
            )}

            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                      City
                    </label>
                    <Input {...register('city')} className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                      Country
                    </label>
                    <Input {...register('country')} className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                    Bio
                  </label>
                  <Textarea {...register('bio')} rows={4} style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                </div>

                {isHr ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          Company name
                        </label>
                        <Input {...register('companyName')} className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          Position
                        </label>
                        <Input {...register('position')} className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                        Company website
                      </label>
                      <Input {...register('companyWebsite')} type="url" className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                        About company
                      </label>
                      <Textarea {...register('aboutCompany')} rows={4} style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          Company contact phone
                        </label>
                        <Input {...register('companyContactPhone')} className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          HR phone
                        </label>
                        <Input {...register('hrPhone')} className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          Desired role
                        </label>
                        <Input {...register('desiredRole')} className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          Desired salary
                        </label>
                        <Input {...register('desiredSalary')} type="number" className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          Graduation Year
                        </label>
                        <Input {...register('graduationYear')} type="number" className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          Date of birth
                        </label>
                        <Input {...register('dateOfBirth')} type="date" className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="inline-flex items-center gap-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(51, 58, 47, 0.12)', backgroundColor: '#F9FAF3', color: '#333A2F' }}>
                        <input type="checkbox" {...register('openToWork')} className="h-4 w-4" />
                        Open to work
                      </label>
                      <label className="inline-flex items-center gap-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(51, 58, 47, 0.12)', backgroundColor: '#F9FAF3', color: '#333A2F' }}>
                        <input type="checkbox" {...register('remoteReady')} className="h-4 w-4" />
                        Remote ready
                      </label>
                      <label className="inline-flex items-center gap-3 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(51, 58, 47, 0.12)', backgroundColor: '#F9FAF3', color: '#333A2F' }}>
                        <input type="checkbox" {...register('relocationReady')} className="h-4 w-4" />
                        Relocation ready
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          Availability
                        </label>
                        <select
                          {...register('availability')}
                          className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                          style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                        >
                          <option value="">Not set</option>
                          <option value="IMMEDIATE">Immediate</option>
                          <option value="AFTER_GRADUATION">After graduation</option>
                          <option value="WEEKENDS_ONLY">Weekends only</option>
                          <option value="CUSTOM">Custom</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          Education level
                        </label>
                        <select
                          {...register('educationLevel')}
                          className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                          style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                        >
                          <option value="">Not set</option>
                          <option value="NONE">None</option>
                          <option value="SECONDARY">Secondary</option>
                          <option value="VOCATIONAL">Vocational</option>
                          <option value="BACHELOR">Bachelor</option>
                          <option value="MASTER">Master</option>
                          <option value="PHD">PhD</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          Hours per week
                        </label>
                        <Input {...register('hoursPerWeek')} type="number" className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          Preferred employment types
                        </label>
                        <div className="flex flex-wrap gap-2 rounded-xl border p-3" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', backgroundColor: '#F9FAF3' }}>
                          {preferredEmploymentTypeOptions.map((option) => {
                            const active = selectedEmploymentTypes.includes(option.value);
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => togglePreferredOption('preferredEmploymentTypesText', option.value)}
                                className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                                style={{
                                  borderColor: active ? '#2B6A4D' : 'rgba(51, 58, 47, 0.18)',
                                  backgroundColor: active ? '#E3F1E5' : 'white',
                                  color: active ? '#1F513A' : '#33412C',
                                }}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                        <input type="hidden" {...register('preferredEmploymentTypesText')} />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          Preferred work formats
                        </label>
                        <div className="flex flex-wrap gap-2 rounded-xl border p-3" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', backgroundColor: '#F9FAF3' }}>
                          {preferredWorkFormatOptions.map((option) => {
                            const active = selectedWorkFormats.includes(option.value);
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => togglePreferredOption('preferredWorkFormatsText', option.value)}
                                className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors"
                                style={{
                                  borderColor: active ? '#2B6A4D' : 'rgba(51, 58, 47, 0.18)',
                                  backgroundColor: active ? '#E3F1E5' : 'white',
                                  color: active ? '#1F513A' : '#33412C',
                                }}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                        <input type="hidden" {...register('preferredWorkFormatsText')} />
                      </div>
                    </div>

                    <div className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'rgba(51, 58, 47, 0.15)', backgroundColor: '#F7FAF3' }}>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h3 className="font-heading text-lg font-semibold" style={{ color: '#2F3B2A' }}>
                          Skills & Levels
                        </h3>
                        {candidateSkills.length > 0 && (
                          <button
                            type="button"
                            className="text-xs font-semibold"
                            style={{ color: '#4F5E46' }}
                            onClick={() => {
                              setCandidateSkills([]);
                              setCandidateSkillLevels({});
                            }}
                          >
                            Clear all
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
                          placeholder="Search skills or type your own"
                          className="h-11"
                          style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addCandidateSkill(candidateSkillDraft)}
                          style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                        >
                          Add
                        </Button>
                      </div>

                      <div className="rounded-xl border p-3 mb-3" style={{ borderColor: 'rgba(51, 58, 47, 0.15)', backgroundColor: '#ffffff' }}>
                        <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#6B7B62' }}>
                          Suggestions
                        </p>
                        {skillSearchOptions.length === 0 ? (
                          <p className="text-xs" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                            Nothing found. Add custom skill manually.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {skillSearchOptions.map((skill) => (
                              <button
                                key={`profile-skill-suggest-${skill}`}
                                type="button"
                                onClick={() => addCandidateSkill(skill)}
                                className="rounded-full border px-2.5 py-1 text-xs font-medium"
                                style={{ borderColor: 'rgba(51, 58, 47, 0.2)', backgroundColor: '#F9FCF6', color: '#32422B' }}
                              >
                                {skill}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {candidateSkills.length === 0 ? (
                        <p className="text-xs" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                          No skills selected yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {candidateSkills.map((skill) => {
                            const level = candidateSkillLevels[skill.toLowerCase()] || '';
                            return (
                              <div
                                key={`candidate-skill-${skill}`}
                                className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr,220px,auto]"
                                style={{ borderColor: 'rgba(51, 58, 47, 0.14)', backgroundColor: '#FFFFFF' }}
                              >
                                <div className="self-center text-sm font-medium" style={{ color: '#2D3A27' }}>
                                  {skill}
                                </div>
                                <select
                                  value={level}
                                  onChange={(event) => setCandidateSkillLevel(skill, event.target.value)}
                                  className="flex h-10 w-full rounded-lg border px-3 py-2 text-sm"
                                  style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                                >
                                  <option value="">Level not set</option>
                                  {candidateSkillLevelOptions.map((option) => (
                                    <option key={`${skill}-${option.value}`} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => removeCandidateSkill(skill)}
                                  className="inline-flex h-10 items-center justify-center rounded-lg border px-3 text-xs font-semibold"
                                  style={{ borderColor: 'rgba(220, 38, 38, 0.25)', color: '#B91C1C', backgroundColor: '#fff' }}
                                >
                                  Remove
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
                  style={{ backgroundColor: '#333A2F', color: 'white' }}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                <section
                  className="rounded-2xl border px-5 py-5 sm:px-6"
                  style={{
                    borderColor: 'rgba(51, 58, 47, 0.12)',
                    background:
                      'linear-gradient(145deg, rgba(247,248,241,0.95) 0%, rgba(255,255,255,0.92) 100%)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: '#E3EAD4', color: '#2E3A2A' }}
                    >
                      <User className="h-4 w-4" />
                    </span>
                    <h2 className="font-heading text-xl font-bold" style={{ color: '#333A2F' }}>
                      About
                    </h2>
                  </div>
                  <p className="mt-4 text-sm leading-7 sm:text-base" style={{ color: '#4F5E46' }}>
                    {getString(profile?.bio) || 'Add a short summary about your goals, strengths, and the type of work you are looking for.'}
                  </p>
                </section>

                {isHr ? (
                  <>
                    {(getString(profile?.companyName) || getString(profile?.position)) && (
                      <div>
                        <h2 className="font-heading text-xl font-bold mb-2" style={{ color: '#333A2F' }}>
                          Company
                        </h2>
                        <div className="flex items-center gap-2" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                          <Building2 className="w-4 h-4" />
                          <span>{[getString(profile?.companyName), getString(profile?.position)].filter(Boolean).join(' • ')}</span>
                        </div>
                      </div>
                    )}

                    {(getString(profile?.companyWebsite) || getString(profile?.companyContactPhone) || getString(profile?.hrPhone)) && (
                      <div>
                        <h2 className="font-heading text-xl font-bold mb-2" style={{ color: '#333A2F' }}>
                          Contacts
                        </h2>
                        <div className="flex flex-col gap-2" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                          {getString(profile?.companyWebsite) && (
                            <a href={getString(profile?.companyWebsite)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline" style={{ color: '#333A2F' }}>
                              <Globe className="w-4 h-4" />
                              <span>Company website</span>
                            </a>
                          )}
                          {getString(profile?.companyContactPhone) && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>Company phone: {getString(profile?.companyContactPhone)}</span>
                            </div>
                          )}
                          {getString(profile?.hrPhone) && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>HR phone: {getString(profile?.hrPhone)}</span>
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
                      style={{ borderColor: 'rgba(51, 58, 47, 0.12)', backgroundColor: '#FCFDF9' }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ backgroundColor: '#E9EFDA', color: '#2E3A2A' }}
                        >
                          <Briefcase className="h-4 w-4" />
                        </span>
                        <h2 className="font-heading text-xl font-bold" style={{ color: '#333A2F' }}>
                          Career Preferences
                        </h2>
                      </div>

                      <p className="mt-3 text-base font-semibold" style={{ color: '#2F3B2A' }}>
                        {getString(profile?.desiredRole) || 'Desired role is not set yet'}
                      </p>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'rgba(51, 58, 47, 0.1)', backgroundColor: 'white' }}>
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: '#74836A' }}>Salary</p>
                          <p className="mt-1 text-sm font-semibold" style={{ color: '#2F3B2A' }}>
                            {profile?.desiredSalary !== undefined && profile?.desiredSalary !== null ? String(profile.desiredSalary) : 'Not set'}
                          </p>
                        </div>
                        <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'rgba(51, 58, 47, 0.1)', backgroundColor: 'white' }}>
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: '#74836A' }}>Graduation</p>
                          <p className="mt-1 text-sm font-semibold" style={{ color: '#2F3B2A' }}>
                            {profile?.graduationYear !== undefined && profile?.graduationYear !== null ? String(profile.graduationYear) : 'Not set'}
                          </p>
                        </div>
                        <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'rgba(51, 58, 47, 0.1)', backgroundColor: 'white' }}>
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: '#74836A' }}>Education</p>
                          <p className="mt-1 text-sm font-semibold" style={{ color: '#2F3B2A' }}>
                            {getString(profile?.educationLevel) ? formatEnum(getString(profile?.educationLevel)) : 'Not set'}
                          </p>
                        </div>
                        <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'rgba(51, 58, 47, 0.1)', backgroundColor: 'white' }}>
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: '#74836A' }}>Availability</p>
                          <p className="mt-1 text-sm font-semibold" style={{ color: '#2F3B2A' }}>
                            {getString(profile?.availability) ? formatEnum(getString(profile?.availability)) : 'Not set'}
                          </p>
                        </div>
                        <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'rgba(51, 58, 47, 0.1)', backgroundColor: 'white' }}>
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: '#74836A' }}>Hours / Week</p>
                          <p className="mt-1 text-sm font-semibold" style={{ color: '#2F3B2A' }}>
                            {profile?.hoursPerWeek !== undefined && profile?.hoursPerWeek !== null ? String(profile.hoursPerWeek) : 'Not set'}
                          </p>
                        </div>
                        <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'rgba(51, 58, 47, 0.1)', backgroundColor: 'white' }}>
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: '#74836A' }}>Date of Birth</p>
                          <p className="mt-1 text-sm font-semibold" style={{ color: '#2F3B2A' }}>
                            {getString(profile?.dateOfBirth) ? getString(profile?.dateOfBirth).slice(0, 10) : 'Not set'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: getBoolean(profile?.openToWork, false) ? '#DBF2DD' : '#ECEDE7',
                            color: getBoolean(profile?.openToWork, false) ? '#166534' : '#4D5A45',
                          }}
                        >
                          Open to work: {getBoolean(profile?.openToWork, false) ? 'Yes' : 'No'}
                        </span>
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: getBoolean(profile?.remoteReady, false) ? '#DDECF6' : '#ECEDE7',
                            color: getBoolean(profile?.remoteReady, false) ? '#1D4F72' : '#4D5A45',
                          }}
                        >
                          Remote ready: {getBoolean(profile?.remoteReady, false) ? 'Yes' : 'No'}
                        </span>
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: getBoolean(profile?.relocationReady, false) ? '#FCE8D8' : '#ECEDE7',
                            color: getBoolean(profile?.relocationReady, false) ? '#9A3412' : '#4D5A45',
                          }}
                        >
                          Relocation: {getBoolean(profile?.relocationReady, false) ? 'Yes' : 'No'}
                        </span>
                      </div>

                      {(preferredEmploymentTypes.length > 0 || preferredWorkFormats.length > 0) && (
                        <div className="mt-5 space-y-3">
                          {preferredEmploymentTypes.length > 0 && (
                            <div>
                              <p className="text-xs uppercase tracking-[0.12em]" style={{ color: '#6C7A63' }}>
                                Preferred Employment
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {preferredEmploymentTypes.map((entry) => (
                                  <span
                                    key={entry}
                                    className="rounded-lg px-2.5 py-1 text-xs font-medium"
                                    style={{ backgroundColor: '#EEF3E3', color: '#334028' }}
                                  >
                                    {formatEnum(entry)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {preferredWorkFormats.length > 0 && (
                            <div>
                              <p className="text-xs uppercase tracking-[0.12em]" style={{ color: '#6C7A63' }}>
                                Preferred Formats
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {preferredWorkFormats.map((entry) => (
                                  <span
                                    key={entry}
                                    className="rounded-lg px-2.5 py-1 text-xs font-medium"
                                    style={{ backgroundColor: '#E8F2F3', color: '#264146' }}
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
                          <p className="text-xs uppercase tracking-[0.12em]" style={{ color: '#6C7A63' }}>
                            Skills
                          </p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {savedCandidateSkills.map((skill) => {
                              const level = savedCandidateSkillLevels[skill.toLowerCase()];
                              const levelLabel = candidateSkillLevelOptions.find((option) => option.value === level)?.label;
                              return (
                                <div
                                  key={`candidate-skill-readonly-${skill}`}
                                  className="rounded-xl border px-3 py-2"
                                  style={{ borderColor: 'rgba(51, 58, 47, 0.12)', backgroundColor: 'white' }}
                                >
                                  <p className="text-sm font-semibold" style={{ color: '#2F3B2A' }}>
                                    {skill}
                                  </p>
                                  <p className="text-xs mt-0.5" style={{ color: '#66775E' }}>
                                    {levelLabel || 'Level not set'}
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
                  <h2 className="font-heading text-2xl font-bold" style={{ color: '#333A2F' }}>
                    Company Media
                  </h2>
                  <p className="mt-2 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                    Logo is uploaded through backend proxy and opened via secure download URL. Max size: 15MB.
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
                    style={{ color: '#333A2F' }}
                  >
                    Open logo
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>

              {companyLogoSrc ? (
                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <img
                    src={companyLogoSrc}
                    alt={getString(profile?.companyName) || 'Company logo'}
                    className="h-24 w-24 rounded-2xl object-cover"
                  />
                  <div className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.72)' }}>
                    <p className="font-semibold" style={{ color: '#333A2F' }}>
                      {companyLogoFile ? getFileName(companyLogoFile) : 'Company logo'}
                    </p>
                    {companyLogoFile && (
                      <p className="mt-1">{formatFileSize(companyLogoFile.sizeBytes)}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-black/10 bg-[#F9FAF3] p-5 text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                  Upload a company logo to show real branding on vacancies and profile surfaces.
                </div>
              )}
            </section>
          )}

          {(activityError || activitySuccess) && (
            <div className="space-y-2">
              {activityError && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c' }}>
                  {activityError}
                </div>
              )}
              {activitySuccess && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(22, 163, 74, 0.12)', color: '#166534' }}>
                  {activitySuccess}
                </div>
              )}
            </div>
          )}

          {(isUploadingMedia || isDeletingMedia) && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(51, 58, 47, 0.08)', color: '#333A2F' }}>
              {isUploadingMedia ? 'Uploading file...' : 'Removing file...'}
            </div>
          )}

          {activeTab === 'documents' && isCandidate && (
            <>
              <section id="files" className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
                  <div
                    className="rounded-2xl border p-4 sm:p-5"
                    style={{
                      borderColor: 'rgba(51, 58, 47, 0.12)',
                      background:
                        'linear-gradient(140deg, rgba(247,248,241,0.95) 0%, rgba(255,255,255,1) 100%)',
                    }}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="font-heading text-2xl font-bold" style={{ color: '#2D3928' }}>
                          Resumes
                        </h2>
                        <p className="mt-2 text-sm leading-6" style={{ color: 'rgba(51, 58, 47, 0.74)' }}>
                          CV library for applications. Upload PDF or DOCX via backend proxy.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: '#E5EDD7', color: '#34523B' }}>
                            {displayedResumes.length} file(s)
                          </span>
                          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: '#EDF1E7', color: '#4D5A45' }}>
                            Max size 40MB
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
                        style={{ borderColor: '#8FA683', backgroundColor: '#EAF3DD', color: '#2D3928' }}
                      >
                        <FileUp className="h-4 w-4" />
                        Add Resume
                      </button>
                    </div>
                  </div>

                  {displayedResumes.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed p-6 text-sm" style={{ borderColor: 'rgba(51, 58, 47, 0.15)', backgroundColor: '#F8FAF3', color: 'rgba(51, 58, 47, 0.68)' }}>
                      <p className="font-semibold" style={{ color: '#3A4833' }}>No resumes yet</p>
                      <p className="mt-2">Use “Add Resume” to upload your first CV with a custom title.</p>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-4">
                      {displayedResumes.map((resume, index) => (
                        <article
                          key={getFileId(resume) || getString(resume.id) || `resume-${index}`}
                          className="rounded-2xl border p-4"
                          style={{
                            borderColor: 'rgba(51, 58, 47, 0.1)',
                            background:
                              'linear-gradient(145deg, rgba(247,248,241,0.95) 0%, rgba(255,255,255,1) 100%)',
                          }}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: '#E2EBD4', color: '#364631' }}>
                                  <FileArchive className="h-4 w-4" />
                                </span>
                                <p className="font-semibold" style={{ color: '#2D3928' }}>
                                  {getFileName(resume)}
                                </p>
                                {resume.isPrimary === true && (
                                  <span className="rounded-lg px-2 py-1 text-[11px] font-semibold" style={{ backgroundColor: '#2F6A4A', color: 'white' }}>
                                    Primary
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 text-xs" style={{ color: 'rgba(51, 58, 47, 0.63)' }}>
                                {formatFileSize(resume.sizeBytes)} • Updated {formatDateTime(getString(resume.updatedAt) || getString(resume.createdAt))}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {getFileId(resume) && (
                                <button
                                  type="button"
                                  onClick={() => void handleOpenFile(resume)}
                                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium"
                                  style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#2D3928', backgroundColor: 'white' }}
                                >
                                  <Download className="h-4 w-4" />
                                  Open
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteUploadedFile(getFileId(resume), 'Resume deleted.')
                                }
                                disabled={isDeletingMedia}
                                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium"
                                style={{ borderColor: 'rgba(220, 38, 38, 0.2)', color: '#b91c1c', backgroundColor: 'white' }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
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
                      borderColor: 'rgba(51, 58, 47, 0.12)',
                      background:
                        'linear-gradient(140deg, rgba(241,247,250,0.9) 0%, rgba(255,255,255,1) 100%)',
                    }}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="font-heading text-2xl font-bold" style={{ color: '#2D3928' }}>
                          Portfolio Files
                        </h2>
                        <p className="mt-2 text-sm leading-6" style={{ color: 'rgba(51, 58, 47, 0.74)' }}>
                          Certificates, cases, and work samples for recruiters.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: '#DFEEF2', color: '#2D4D58' }}>
                            {displayedPortfolioFiles.length} file(s)
                          </span>
                          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: '#EDF1E7', color: '#4D5A45' }}>
                            Max size 40MB
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
                        style={{ borderColor: '#7EA2AF', backgroundColor: '#E7F1F4', color: '#27444F' }}
                      >
                        <UploadCloud className="h-4 w-4" />
                        Add Portfolio
                      </button>
                    </div>
                  </div>

                  {displayedPortfolioFiles.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed p-6 text-sm" style={{ borderColor: 'rgba(51, 58, 47, 0.15)', backgroundColor: '#F8FAF3', color: 'rgba(51, 58, 47, 0.68)' }}>
                      <p className="font-semibold" style={{ color: '#3A4833' }}>No portfolio files yet</p>
                      <p className="mt-2">Add visual or document evidence of your experience.</p>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-4">
                      {displayedPortfolioFiles.map((file, index) => (
                        <article
                          key={getFileId(file) || getString(file.id) || `portfolio-${index}`}
                          className="rounded-2xl border p-4"
                          style={{
                            borderColor: 'rgba(51, 58, 47, 0.1)',
                            background:
                              'linear-gradient(145deg, rgba(244,248,250,0.85) 0%, rgba(255,255,255,1) 100%)',
                          }}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: '#DCEBF1', color: '#2D4D58' }}>
                                  <FileArchive className="h-4 w-4" />
                                </span>
                                <p className="font-semibold" style={{ color: '#2D3928' }}>
                                  {getFileName(file)}
                                </p>
                              </div>
                              <p className="mt-2 text-xs" style={{ color: 'rgba(51, 58, 47, 0.63)' }}>
                                {formatFileSize(file.sizeBytes)} • Uploaded {formatDateTime(getString(file.createdAt))}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {getFileId(file) && (
                                <button
                                  type="button"
                                  onClick={() => void handleOpenFile(file)}
                                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium"
                                  style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#2D3928', backgroundColor: 'white' }}
                                >
                                  <Download className="h-4 w-4" />
                                  Open
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteUploadedFile(getFileId(file), 'Portfolio file deleted.')
                                }
                                disabled={isDeletingMedia}
                                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium"
                                style={{ borderColor: 'rgba(220, 38, 38, 0.2)', color: '#b91c1c', backgroundColor: 'white' }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
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
                  <div className="w-full max-w-xl rounded-3xl border bg-white p-6 shadow-2xl sm:p-7" style={{ borderColor: 'rgba(51, 58, 47, 0.15)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#5A6F4B' }}>
                          Resume Upload
                        </p>
                        <h3 className="mt-1 font-heading text-2xl font-bold" style={{ color: '#2D3928' }}>
                          Add New Resume
                        </h3>
                        <p className="mt-2 text-sm" style={{ color: 'rgba(51, 58, 47, 0.72)' }}>
                          Set a custom title and upload one PDF or DOCX file.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsResumeUploadModalOpen(false)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.18)', color: '#4B5D41' }}
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div className="rounded-2xl border p-4" style={{ borderColor: 'rgba(51, 58, 47, 0.12)', backgroundColor: '#F8FAF3' }}>
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
                          style={{ borderColor: '#8FA683', backgroundColor: '#EAF3DD', color: '#2D3928' }}
                        >
                          <UploadCloud className="h-4 w-4" />
                          {resumeUploadFile ? 'Change File' : 'Choose File'}
                        </button>
                        <p className="mt-3 text-sm" style={{ color: '#4A5B42' }}>
                          {resumeUploadFile ? `${resumeUploadFile.name} • ${formatFileSize(resumeUploadFile.size)}` : 'No file selected yet'}
                        </p>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold" style={{ color: '#33412C' }}>
                          Resume Title Editor
                        </label>
                        <div className="relative">
                          <Pencil className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: '#6A7A60' }} />
                          <Input
                            value={resumeTitle}
                            onChange={(event) => setResumeTitle(event.target.value)}
                            placeholder="Frontend CV v3 / Product Resume / Internship Resume"
                            className="h-12 rounded-xl border pl-10"
                            style={{ borderColor: 'rgba(51, 58, 47, 0.2)', backgroundColor: '#FBFCF8' }}
                          />
                        </div>
                      </div>

                      <label className="inline-flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium" style={{ borderColor: 'rgba(51, 58, 47, 0.15)', backgroundColor: '#F8FAF3', color: '#33412C' }}>
                        <input
                          type="checkbox"
                          checked={resumePrimary}
                          onChange={(event) => setResumePrimary(event.target.checked)}
                          className="h-4 w-4"
                        />
                        Mark as primary resume
                      </label>
                    </div>

                    <div className="mt-7 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsResumeUploadModalOpen(false)}
                        className="rounded-xl border px-4 py-2 text-sm font-semibold"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.16)', color: '#3F4C37', backgroundColor: 'white' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleResumeUploadConfirm()}
                        disabled={!resumeUploadFile || isUploadingMedia}
                        className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: '#2F6A4A' }}
                      >
                        {isUploadingMedia ? 'Uploading...' : 'Upload Resume'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isPortfolioUploadModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur-sm">
                  <div className="w-full max-w-xl rounded-3xl border bg-white p-6 shadow-2xl sm:p-7" style={{ borderColor: 'rgba(51, 58, 47, 0.15)' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#4E6D75' }}>
                          Portfolio Upload
                        </p>
                        <h3 className="mt-1 font-heading text-2xl font-bold" style={{ color: '#2D3928' }}>
                          Add Portfolio File
                        </h3>
                        <p className="mt-2 text-sm" style={{ color: 'rgba(51, 58, 47, 0.72)' }}>
                          Upload image or document that shows your work.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPortfolioUploadModalOpen(false)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.18)', color: '#4B5D41' }}
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-6 rounded-2xl border p-4" style={{ borderColor: 'rgba(51, 58, 47, 0.12)', backgroundColor: '#F5FAFC' }}>
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
                        style={{ borderColor: '#7EA2AF', backgroundColor: '#E7F1F4', color: '#27444F' }}
                      >
                        <UploadCloud className="h-4 w-4" />
                        {portfolioUploadFile ? 'Change File' : 'Choose File'}
                      </button>
                      <p className="mt-3 text-sm" style={{ color: '#3D5560' }}>
                        {portfolioUploadFile ? `${portfolioUploadFile.name} • ${formatFileSize(portfolioUploadFile.size)}` : 'No file selected yet'}
                      </p>
                    </div>

                    <div className="mt-7 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPortfolioUploadModalOpen(false)}
                        className="rounded-xl border px-4 py-2 text-sm font-semibold"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.16)', color: '#3F4C37', backgroundColor: 'white' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handlePortfolioUploadConfirm()}
                        disabled={!portfolioUploadFile || isUploadingMedia}
                        className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: '#2A5C66' }}
                      >
                        {isUploadingMedia ? 'Uploading...' : 'Upload Portfolio'}
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
                    <h2 className="font-heading text-2xl font-bold" style={{ color: '#333A2F' }}>
                      Saved Vacancies
                    </h2>
                    <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                      Favorites loaded from the new `/favorites/my` flow.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: '#E6F0DA', color: '#2F5138' }}>
                    <Sparkles className="w-3.5 h-3.5" />
                    {favoriteItems.length} saved
                  </div>
                </div>

                {favoritesLoading ? (
                  <p style={{ color: 'rgba(51, 58, 47, 0.7)' }}>Loading saved vacancies...</p>
                ) : favoriteItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-5" style={{ borderColor: 'rgba(51, 58, 47, 0.15)', backgroundColor: '#F7FAF0' }}>
                    <p style={{ color: 'rgba(51, 58, 47, 0.75)' }}>
                      Save a vacancy from the jobs list or vacancy details to see it here.
                    </p>
                    <Link
                      to="/app/jobs"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all hover:shadow-sm"
                      style={{ borderColor: '#8FA683', color: '#2D553F', backgroundColor: '#EAF3DD' }}
                    >
                      <Compass className="h-4 w-4" />
                      Browse jobs
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {favoriteItems.map((item) => (
                      <div key={item.vacancy.id} className="rounded-2xl border border-black/5 p-4" style={{ backgroundColor: '#F7F8F1' }}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link to={`/app/jobs/${item.vacancy.id}`} className="font-semibold hover:underline" style={{ color: '#333A2F' }}>
                              {item.vacancy.title}
                            </Link>
                            <p className="mt-1 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                              {item.vacancy.company?.name || 'Company'}
                              {item.vacancy.publicationCity?.name
                                ? ` • ${item.vacancy.publicationCity.name}`
                                : ''}
                            </p>
                          </div>
                          <span className="rounded-lg px-2 py-1 text-xs font-semibold" style={{ backgroundColor: 'white', color: '#333A2F' }}>
                            {item.vacancy.favoritesCount} saved
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.vacancy.specializations.slice(0, 3).map((specialization) => (
                            <span key={`${item.vacancy.id}-${specialization.id || specialization.name}`} className="rounded-lg px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'white', color: '#333A2F' }}>
                              {specialization.name || 'Specialization'}
                            </span>
                          ))}
                        </div>
                        <p className="mt-3 text-xs" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                          Saved at: {formatDateTime(item.favoriteCreatedAt)}
                        </p>
                        <Link
                          to={`/app/jobs/${item.vacancy.id}`}
                          className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all hover:shadow-sm"
                          style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#2D553F', backgroundColor: 'white' }}
                        >
                          <Eye className="h-4 w-4" />
                          View vacancy
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
                    <h2 className="font-heading text-2xl font-bold" style={{ color: '#333A2F' }}>
                      My Invites
                    </h2>
                    <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                      Candidate invites loaded from `/invites/my`.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: '#EAF4DF', color: '#2D553F' }}>
                    <Send className="w-3.5 h-3.5" />
                    {myInvites.length} invite(s)
                  </div>
                </div>

                {invitesLoading ? (
                  <p style={{ color: 'rgba(51, 58, 47, 0.7)' }}>Loading invites...</p>
                ) : myInvites.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-5" style={{ borderColor: 'rgba(51, 58, 47, 0.15)', backgroundColor: '#F7FAF0' }}>
                    <p style={{ color: 'rgba(51, 58, 47, 0.75)' }}>
                      HR invites will appear here after an employer sends one.
                    </p>
                    <Link
                      to="/app/applications"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all hover:shadow-sm"
                      style={{ borderColor: '#8FA683', color: '#2D553F', backgroundColor: '#EAF3DD' }}
                    >
                      <Briefcase className="h-4 w-4" />
                      Open applications
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myInvites.map((invite) => (
                      <div key={invite.id} className="rounded-2xl border border-black/5 p-4" style={{ backgroundColor: '#F7F8F1' }}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold" style={{ color: '#333A2F' }}>
                              {invite.vacancy?.title || 'Vacancy invite'}
                            </p>
                            <p className="mt-1 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                              {invite.vacancy?.company?.name || 'Company'}
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
                          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(51, 58, 47, 0.75)' }}>
                            {invite.message}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                          <span>Created: {formatDateTime(invite.createdAt)}</span>
                          <span>Interview: {formatDateTime(invite.interviewAt)}</span>
                        </div>

                        {invite.vacancy?.id && (
                          <Link
                            to={`/app/jobs/${invite.vacancy.id}`}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all hover:shadow-sm"
                            style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#2D553F', backgroundColor: 'white' }}
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open vacancy
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
                    <h2 className="font-heading text-2xl font-bold" style={{ color: '#333A2F' }}>
                      Notifications
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: 'rgba(51, 58, 47, 0.68)' }}>
                      Platform events, invite updates, and activity signals from your account.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: '#EAF4DF', color: '#2D553F' }}>
                      <BellRing className="h-3.5 w-3.5" />
                      {notificationsMeta.unread} unread
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void loadNotifications({ limit: 20, offset: 0 })}
                      disabled={notificationsLoading}
                      style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={notificationsMutating || notificationsMeta.unread === 0}
                      onClick={() => void handleMarkAllNotificationsRead()}
                      style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                    >
                      <CheckCheck className="h-4 w-4" />
                      Mark all read
                    </Button>
                  </div>
                </div>

                {notificationsLoading ? (
                  <div className="rounded-2xl border border-dashed border-black/10 bg-[#F7F8F1] p-6 text-sm" style={{ color: 'rgba(51, 58, 47, 0.68)' }}>
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/10 bg-[#F7F8F1] p-8 text-center">
                    <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#37432F]">
                      <Bell className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-lg font-semibold" style={{ color: '#333A2F' }}>
                      No notifications yet
                    </p>
                    <p className="mt-1 text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
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
                            isUnread ? 'border-[#2B6A4D]/20 bg-[#F4F9EA]' : 'border-black/5 bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold" style={{ color: '#333A2F' }}>
                                {notification.title}
                              </p>
                              <p className="mt-1 text-xs uppercase tracking-[0.16em]" style={{ color: 'rgba(51, 58, 47, 0.5)' }}>
                                {notification.type}
                              </p>
                            </div>
                            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: isUnread ? '#2F5E43' : '#EBEDDF', color: isUnread ? 'white' : '#333A2F' }}>
                              {isUnread ? 'Unread' : 'Read'}
                            </span>
                          </div>

                          <p className="mt-3 text-xs" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                            {formatDateTime(notification.createdAt)}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-3">
                            {href && (
                              <Link to={href} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all hover:shadow-sm" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#2B5A41', backgroundColor: 'white' }}>
                                Open
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            )}
                            {isUnread && (
                              <button
                                type="button"
                                onClick={() => void handleMarkNotificationRead(notification.id)}
                                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-all hover:shadow-sm"
                                style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F', backgroundColor: 'white' }}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Mark as read
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
                  <h2 className="font-heading text-2xl font-bold" style={{ color: '#333A2F' }}>
                    Telegram Notifications
                  </h2>
                  <p className="mt-1 text-sm" style={{ color: 'rgba(51, 58, 47, 0.68)' }}>
                    Connect Telegram once, then manage what exactly should be delivered there.
                  </p>
                </div>

                <div className="mb-4 rounded-2xl border p-4" style={{ borderColor: 'rgba(51, 58, 47, 0.12)', backgroundColor: '#F7F8F1' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#61755A' }}>
                        Connection Status
                      </p>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: isTelegramLinked ? '#DCF2DE' : '#FEE2E2', color: isTelegramLinked ? '#166534' : '#991B1B' }}>
                        {isTelegramLinked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        {isTelegramLinked ? 'Connected' : 'Not connected'}
                      </div>
                    </div>
                    {isTelegramLinked && (
                      <button
                        type="button"
                        onClick={() => void handleTelegramChatIdCopy()}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all hover:shadow-sm"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#2E4030', backgroundColor: 'white' }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy ID
                      </button>
                    )}
                  </div>

                  <div className="mt-3 rounded-xl border px-3 py-2" style={{ borderColor: 'rgba(51, 58, 47, 0.12)', backgroundColor: 'white' }}>
                    <p className="text-[11px] uppercase tracking-[0.12em]" style={{ color: '#73836C' }}>Chat ID</p>
                    <p className="mt-1 font-mono text-sm" style={{ color: '#2D3928' }}>
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
                    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-black/5 bg-[#F7F8F1] p-4 text-left"
                  >
                    <div>
                      <p className="font-medium" style={{ color: '#333A2F' }}>
                        Enable Telegram notifications
                      </p>
                      <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.68)' }}>
                        Toggle delivery to Telegram for all enabled event types.
                      </p>
                    </div>
                    <span className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${telegramSettings.telegramNotificationsEnabled ? 'bg-[#2B6A4D]' : 'bg-[#D7DCCC]'}`}>
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${telegramSettings.telegramNotificationsEnabled ? 'left-6' : 'left-1'}`} />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      initializeTelegramSettings({
                        telegramNotifyInvites: !telegramSettings.telegramNotifyInvites,
                      })
                    }
                    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-black/5 bg-[#F7F8F1] p-4 text-left"
                  >
                    <div>
                      <p className="font-medium" style={{ color: '#333A2F' }}>
                        Invite notifications
                      </p>
                      <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.68)' }}>
                        Vacancy invites from HR.
                      </p>
                    </div>
                    <span className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${telegramSettings.telegramNotifyInvites ? 'bg-[#2B6A4D]' : 'bg-[#D7DCCC]'}`}>
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${telegramSettings.telegramNotifyInvites ? 'left-6' : 'left-1'}`} />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      initializeTelegramSettings({
                        telegramNotifyApplications: !telegramSettings.telegramNotifyApplications,
                      })
                    }
                    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-black/5 bg-[#F7F8F1] p-4 text-left"
                  >
                    <div>
                      <p className="font-medium" style={{ color: '#333A2F' }}>
                        Application notifications
                      </p>
                      <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.68)' }}>
                        Alerts for new applications and application-related events.
                      </p>
                    </div>
                    <span className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${telegramSettings.telegramNotifyApplications ? 'bg-[#2B6A4D]' : 'bg-[#D7DCCC]'}`}>
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${telegramSettings.telegramNotifyApplications ? 'left-6' : 'left-1'}`} />
                    </span>
                  </button>
                </div>

                <div className="mt-5 grid gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void handleTelegramSettingsSave()}
                    disabled={notificationsMutating}
                    className="justify-center"
                    style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
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
                    style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Refresh connection status
                  </Button>
                </div>

                {telegramLinkSession?.deepLink && (
                  <div className="mt-5 rounded-2xl border border-black/5 bg-[#F7F8F1] p-4">
                    <p className="inline-flex items-center gap-2 font-medium" style={{ color: '#333A2F' }}>
                      <MessageCircle className="h-4 w-4" />
                      Telegram deep-link is ready
                    </p>
                    <p className="mt-2 text-sm" style={{ color: 'rgba(51, 58, 47, 0.68)' }}>
                      Expires at: {formatDateTime(telegramLinkSession.expiresAt)}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: 'rgba(51, 58, 47, 0.68)' }}>
                      Bot: {telegramLinkSession.botUsername || 'configured bot'}
                    </p>
                    <a
                      href={telegramLinkSession.deepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold hover:underline"
                      style={{ color: '#2B5A41' }}
                    >
                      Open Telegram
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    {telegramLinkSession.instructions && (
                      <p className="mt-3 text-sm" style={{ color: 'rgba(51, 58, 47, 0.68)' }}>
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
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#526347]">
                      Trust & Compliance
                    </p>
                    <p className="mt-1 text-sm text-[#465A3B]">
                      Manage consents, export personal data, send complaints, and control deletion workflow.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => void reloadPrivacyCenter()}
                    disabled={isPrivacyLoading}
                    style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              {privacyError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {privacyError}
                </div>
              )}

              {privacySuccess && (
                <div className="rounded-2xl border border-[#C8D9B3] bg-[#F1F8E8] px-4 py-3 text-sm text-[#2B5A41]">
                  {privacySuccess}
                </div>
              )}

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl p-6 sm:p-7" style={cardStyle}>
                  <div className="mb-4 flex items-center gap-2">
                    <FileArchive className="h-4 w-4 text-[#2B5A41]" />
                    <h2 className="font-heading text-xl font-bold text-[#333A2F]">Consent Snapshots</h2>
                  </div>
                  <p className="mb-4 text-sm text-[#526347]">
                    Backend stores consent history as snapshots, not overwrites.
                  </p>

                  <Input
                    value={consentVersion}
                    onChange={(event) => setConsentVersion(event.target.value)}
                    placeholder="Consent version, e.g. v1.0-2026-05-13"
                    className="mb-4 rounded-xl border-black/10 bg-[#F9FAF3]"
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
                        className="flex w-full items-center justify-between rounded-2xl border border-black/5 bg-[#F7F8F1] px-4 py-3 text-left"
                      >
                        <div>
                          <p className="font-medium text-[#333A2F]">{formatEnum(type)}</p>
                          <p className="text-xs text-[#5A6D4F]">Current draft: {consentDraft[type] ? 'Accepted' : 'Declined'}</p>
                        </div>
                        <span
                          className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
                            consentDraft[type] ? 'bg-[#2B6A4D]' : 'bg-[#D7DCCC]'
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
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
                    <div className="mt-5 rounded-2xl border border-black/5 bg-[#F7F8F1] p-4 text-sm text-[#4E6142]">
                      <p>
                        Exported at: <span className="font-semibold text-[#2D3A26]">{formatDateTime(privacyExport.exportedAt)}</span>
                      </p>
                      <p className="mt-1">
                        Files indexed: <span className="font-semibold text-[#2D3A26]">{privacyExport.filesIndex.length}</span>
                      </p>
                    </div>
                  )}

                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#526347]">
                      Latest consent history
                    </p>
                    <div className="space-y-2">
                      {consents.slice(0, 6).map((entry) => (
                        <div key={entry.id} className="rounded-xl border border-black/5 bg-[#F9FAF3] px-3 py-2 text-xs text-[#526347]">
                          <span className="font-semibold text-[#2D3A26]">{formatEnum(entry.type)}</span> • {entry.version} •{' '}
                          {entry.accepted ? 'accepted' : 'declined'} • {formatDateTime(entry.createdAt)}
                        </div>
                      ))}
                      {consents.length === 0 && !isPrivacyLoading && (
                        <p className="text-sm text-[#607356]">No consent snapshots yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl p-6 sm:p-7" style={cardStyle}>
                    <div className="mb-4 flex items-center gap-2">
                      <UserRoundX className="h-4 w-4 text-[#8A2A2A]" />
                      <h2 className="font-heading text-xl font-bold text-[#333A2F]">Delete Request</h2>
                    </div>
                    <p className="mb-4 text-sm text-[#526347]">
                      Creates account deletion request and schedules hard-delete according to backend policy.
                    </p>
                    <Textarea
                      value={deleteReason}
                      onChange={(event) => setDeleteReason(event.target.value)}
                      rows={3}
                      placeholder="Reason for delete request"
                      className="rounded-xl border-black/10 bg-[#F9FAF3]"
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
                      <div className="mt-4 inline-flex rounded-full bg-[#EDF2E3] px-3 py-1 text-xs font-semibold text-[#2E4638]">
                        Current status: {formatEnum(deleteRequestStatus)}
                      </div>
                    )}
                  </div>

                  {isHr && (
                    <div className="rounded-2xl p-6 sm:p-7" style={cardStyle}>
                      <div className="mb-4 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[#2B5A41]" />
                        <h2 className="font-heading text-xl font-bold text-[#333A2F]">Company Verification</h2>
                      </div>

                      {companyVerification ? (
                        <>
                          <div className="inline-flex rounded-full bg-[#EDF2E3] px-3 py-1 text-xs font-semibold text-[#2E4638]">
                            Status: {companyVerificationStatuses.includes(companyVerification.verificationStatus || 'PENDING') ? formatEnum(companyVerification.verificationStatus) : 'Pending'}
                          </div>
                          <p className="mt-3 text-sm text-[#526347]">
                            Reviewed at: {formatDateTime(companyVerification.verificationReviewedAt)}
                          </p>
                          <p className="text-sm text-[#526347]">
                            Due at: {formatDateTime(companyVerification.verificationDueAt)}
                          </p>
                          {companyVerification.verificationComment && (
                            <p className="mt-2 rounded-xl bg-[#F7F8F1] px-3 py-2 text-sm text-[#4F6143]">
                              Comment: {companyVerification.verificationComment}
                            </p>
                          )}
                          <div className="mt-4 space-y-2">
                            {companyVerification.verificationSubmissions.map((submission) => (
                              <div key={submission.id} className="rounded-xl border border-black/5 bg-[#F9FAF3] px-3 py-2 text-xs text-[#526347]">
                                <span className="font-semibold text-[#2D3A26]">
                                  {formatEnum(submission.status)}
                                </span>{' '}
                                • {submission.binIin || 'No BIN/IIN'} • {formatDateTime(submission.createdAt)}
                              </div>
                            ))}
                            {companyVerification.verificationSubmissions.length === 0 && (
                              <p className="text-sm text-[#607356]">No verification submissions yet.</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-[#607356]">
                          Verification snapshot not available yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl p-6 sm:p-7" style={cardStyle}>
                <div className="mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#8A2A2A]" />
                  <h2 className="font-heading text-xl font-bold text-[#333A2F]">Complaints</h2>
                </div>
                <p className="mb-4 text-sm text-[#526347]">
                  Report vacancy, profile, or message directly to moderation queue.
                </p>

                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    value={complaintTargetType}
                    onChange={(event) => setComplaintTargetType(event.target.value as ComplaintTargetType)}
                    className="h-11 rounded-xl border border-black/10 bg-[#F9FAF3] px-3 text-sm"
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
                    className="h-11 rounded-xl border-black/10 bg-[#F9FAF3]"
                  />
                </div>

                <Input
                  value={complaintReason}
                  onChange={(event) => setComplaintReason(event.target.value)}
                  placeholder="Reason"
                  className="mt-3 h-11 rounded-xl border-black/10 bg-[#F9FAF3]"
                />
                <Textarea
                  value={complaintDetails}
                  onChange={(event) => setComplaintDetails(event.target.value)}
                  rows={3}
                  placeholder="Details (optional)"
                  className="mt-3 rounded-xl border-black/10 bg-[#F9FAF3]"
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
                      <div key={status} className="rounded-xl border border-black/5 bg-[#F9FAF3] px-3 py-2 text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5A6D4F]">
                          {formatEnum(status)}
                        </p>
                        <p className="mt-1 text-base font-bold text-[#2D3A26]">{count}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 space-y-2">
                  {myComplaints.slice(0, 8).map((complaint) => (
                    <div key={complaint.id} className="rounded-xl border border-black/5 bg-[#F9FAF3] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[#2D3A26]">
                          {formatEnum(complaint.targetType)} • {complaint.targetId || 'No target'}
                        </p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#3F5341]">
                          {formatEnum(complaint.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#4F6143]">{complaint.reason || 'No reason'}</p>
                      {complaint.details && (
                        <p className="mt-1 text-xs text-[#607356]">{complaint.details}</p>
                      )}
                      <p className="mt-1 text-xs text-[#607356]">{formatDateTime(complaint.createdAt)}</p>
                    </div>
                  ))}
                  {myComplaints.length === 0 && !isPrivacyLoading && (
                    <p className="text-sm text-[#607356]">No complaints yet.</p>
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
