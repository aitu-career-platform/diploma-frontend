import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  AlertTriangle,
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  FileArchive,
  Download,
  ExternalLink,
  FileUp,
  Globe,
  ImagePlus,
  Mail,
  MapPin,
  Send,
  Trash2,
  UploadCloud,
  User,
  UserRoundX,
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
import { useMediaStore } from '@entities/media';

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

const privacyConsentTypes: ConsentType[] = ['PRIVACY', 'TERMS', 'MARKETING'];
const complaintTargetTypes: ComplaintTargetType[] = ['VACANCY', 'PROFILE', 'MESSAGE'];
const complaintStatuses: ComplaintStatus[] = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];
const companyVerificationStatuses: CompanyVerificationStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'RETRY_REQUIRED',
];

const cardStyle = {
  backgroundColor: 'white',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
};

const getString = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
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
    getString(nestedFile?.downloadUrl) ||
    getString(file?.fileUrl) ||
    getString(file?.url) ||
    getString(nestedFile?.url)
  );
};

const getFileName = (file: Record<string, unknown> | null): string => {
  const nestedFile = getRecord(file?.file);

  return (
    getString(nestedFile?.filename) ||
    getString(file?.filename) ||
    getString(file?.title) ||
    'Untitled file'
  );
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
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [privacySuccess, setPrivacySuccess] = useState<string | null>(null);
  const [isPrivacyLoading, setIsPrivacyLoading] = useState(false);
  const [isPrivacyMutating, setIsPrivacyMutating] = useState(false);
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

  const profile = (currentProfile as Record<string, unknown> | null) || null;
  const currentUserId = currentUser?.id || null;
  const currentUserRole = currentUser?.role || null;
  const rawUser = getRecord(profile?.user);
  const rawAvatarFile = getRecord(rawUser?.avatarFile) || getRecord(profile?.avatarFile);
  const avatarSrc =
    getString(profile?.avatarUrl) ||
    getString(rawAvatarFile?.downloadUrl) ||
    getString(rawAvatarFile?.url) ||
    currentUser?.avatar ||
    '';

  const {
    register,
    handleSubmit,
    reset,
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
    initializeTelegramSettings({
      telegramChatId:
        typeof profile?.telegramChatId === 'string' ? profile.telegramChatId : null,
      telegramNotificationsEnabled: getBoolean(profile?.telegramNotificationsEnabled, false),
      telegramNotifyInvites: getBoolean(profile?.telegramNotifyInvites, true),
      telegramNotifyApplications: getBoolean(profile?.telegramNotifyApplications, true),
    });
  }, [
    initializeTelegramSettings,
    profile?.telegramChatId,
    profile?.telegramNotificationsEnabled,
    profile?.telegramNotifyInvites,
    profile?.telegramNotifyApplications,
  ]);

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
  const companyLogoFile = getRecord(profile?.companyLogoFile);
  const resumes = getFileArray(profile?.resumes);
  const portfolioFiles = getFileArray(profile?.portfolioFiles);

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

  const handleTelegramStatusRefresh = async () => {
    setActivityError(null);
    setActivitySuccess(null);

    try {
      await loadProfile();

      const nextProfile = (useUserStore.getState().currentProfile as Record<string, unknown> | null) || null;
      const nextChatId =
        nextProfile && typeof nextProfile.telegramChatId === 'string'
          ? nextProfile.telegramChatId
          : null;

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
    event: ChangeEvent<HTMLInputElement>,
    config: {
      target: 'USER_AVATAR' | 'COMPANY_LOGO' | 'CANDIDATE_RESUME' | 'CANDIDATE_PORTFOLIO';
      entityType: 'USER_AVATAR' | 'COMPANY_LOGO' | 'CANDIDATE_RESUME' | 'CANDIDATE_PORTFOLIO';
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

    setActivityError(null);
    setActivitySuccess(null);

    try {
      await uploadAndAttach({
        file,
        target: config.target,
        entityType: config.entityType,
        resumeTitle: config.resumeTitle,
        isPrimary: config.isPrimary,
      });
      await loadProfile();
      setActivitySuccess(config.successMessage);

      if (config.entityType === 'CANDIDATE_RESUME') {
        setResumeTitle('');
        setResumePrimary(false);
      }
    } catch (uploadError) {
      setActivityError(uploadError instanceof Error ? uploadError.message : 'Failed to upload file');
    }
  };

  const handleDeleteUploadedFile = async (fileId: string, successMessage: string) => {
    if (!fileId) {
      setActivityError('File ID is missing');
      return;
    }

    setActivityError(null);
    setActivitySuccess(null);

    try {
      await deleteFile(fileId);
      await loadProfile();
      setActivitySuccess(successMessage);
    } catch (deleteError) {
      setActivityError(deleteError instanceof Error ? deleteError.message : 'Failed to delete file');
    }
  };

  const handleOpenFile = async (file: Record<string, unknown> | null) => {
    const fileId = getFileId(file);
    const fallbackHref = getFileHref(file);

    try {
      const nextHref = fileId ? await getDownloadUrl(fileId) : fallbackHref;

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

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                        active
                          ? 'border-[#2B6A4D]/30 bg-[#EAF4DF]'
                          : 'border-[#9FB08A]/30 bg-white hover:bg-[#F4F8EA]'
                      }`}
                    >
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
                onClick={() => setIsEditing((prev) => !prev)}
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
                    void handleProfileUpload(event, {
                      target: 'USER_AVATAR',
                      entityType: 'USER_AVATAR',
                      successMessage: 'Avatar updated.',
                    })
                  }
                />
              </label>

              {avatarFile && (
                <button
                  type="button"
                  onClick={() => void handleDeleteUploadedFile(getFileId(avatarFile), 'Avatar removed.')}
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
                        void handleProfileUpload(event, {
                          target: 'COMPANY_LOGO',
                          entityType: 'COMPANY_LOGO',
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          Preferred employment types
                        </label>
                        <Textarea
                          {...register('preferredEmploymentTypesText')}
                          rows={3}
                          placeholder="FULL_TIME, PROJECT"
                          style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          Preferred work formats
                        </label>
                        <Textarea
                          {...register('preferredWorkFormatsText')}
                          rows={3}
                          placeholder="REMOTE, HYBRID"
                          style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                        />
                      </div>
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
                {getString(profile?.bio) && (
                  <div>
                    <h2 className="font-heading text-xl font-bold mb-2" style={{ color: '#333A2F' }}>
                      About
                    </h2>
                    <p style={{ color: 'rgba(51, 58, 47, 0.7)' }}>{getString(profile?.bio)}</p>
                  </div>
                )}

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
                    {(getString(profile?.desiredRole) || profile?.desiredSalary || profile?.graduationYear || getString(profile?.dateOfBirth)) && (
                      <div>
                        <h2 className="font-heading text-xl font-bold mb-2" style={{ color: '#333A2F' }}>
                          Career Preferences
                        </h2>
                        <div className="flex items-center gap-2 mb-2" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                          <Briefcase className="w-4 h-4" />
                          <span>{getString(profile?.desiredRole) || 'Desired role not set'}</span>
                        </div>
                        <div className="space-y-1 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                          {profile?.desiredSalary !== undefined && profile?.desiredSalary !== null && (
                            <p>Desired salary: {String(profile.desiredSalary)}</p>
                          )}
                          {profile?.graduationYear !== undefined && profile?.graduationYear !== null && (
                            <p>Graduation year: {String(profile.graduationYear)}</p>
                          )}
                          {getString(profile?.dateOfBirth) && (
                            <p>Date of birth: {getString(profile?.dateOfBirth).slice(0, 10)}</p>
                          )}
                          <p>Open to work: {getBoolean(profile?.openToWork, false) ? 'Yes' : 'No'}</p>
                          {getString(profile?.availability) && (
                            <p>Availability: {getString(profile?.availability)}</p>
                          )}
                          {(profile?.hoursPerWeek !== undefined && profile?.hoursPerWeek !== null) && (
                            <p>Hours per week: {String(profile.hoursPerWeek)}</p>
                          )}
                          <p>Remote ready: {getBoolean(profile?.remoteReady, false) ? 'Yes' : 'No'}</p>
                          <p>Relocation ready: {getBoolean(profile?.relocationReady, false) ? 'Yes' : 'No'}</p>
                          {getString(profile?.educationLevel) && (
                            <p>Education: {getString(profile?.educationLevel)}</p>
                          )}
                        </div>
                      </div>
                    )}
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
                    Logo is uploaded via signed S3/R2 URL and attached to your company profile.
                  </p>
                </div>
                {companyLogoFile && (
                  <button
                    type="button"
                    onClick={() => void handleOpenFile(companyLogoFile)}
                    className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                    style={{ color: '#333A2F' }}
                  >
                    Open logo
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>

              {companyLogoFile && getFileHref(companyLogoFile) ? (
                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <img
                    src={getFileHref(companyLogoFile)}
                    alt={getString(profile?.companyName) || 'Company logo'}
                    className="h-24 w-24 rounded-2xl object-cover"
                  />
                  <div className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.72)' }}>
                    <p className="font-semibold" style={{ color: '#333A2F' }}>
                      {getFileName(companyLogoFile)}
                    </p>
                    <p className="mt-1">{formatFileSize(companyLogoFile.sizeBytes)}</p>
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
            <section id="files" className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-heading text-2xl font-bold" style={{ color: '#333A2F' }}>
                      Resumes
                    </h2>
                    <p className="mt-2 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                      Upload CV files via presigned URL. HR can open them from application details.
                    </p>
                  </div>
                  <label
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
                    style={{ borderColor: 'rgba(51, 58, 47, 0.12)', backgroundColor: '#F7F8F1', color: '#333A2F' }}
                  >
                    <FileUp className="w-4 h-4" />
                    Upload resume
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={(event) =>
                        void handleProfileUpload(event, {
                          target: 'CANDIDATE_RESUME',
                          entityType: 'CANDIDATE_RESUME',
                          resumeTitle: resumeTitle || undefined,
                          isPrimary: resumePrimary,
                          successMessage: 'Resume uploaded.',
                        })
                      }
                    />
                  </label>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
                  <Input
                    value={resumeTitle}
                    onChange={(event) => setResumeTitle(event.target.value)}
                    placeholder="Resume title, for example Frontend CV v2"
                    className="h-11 rounded-xl border-black/10 bg-[#F9FAF3]"
                  />
                  <label className="inline-flex items-center gap-3 rounded-xl border px-4 py-2 text-sm" style={{ borderColor: 'rgba(51, 58, 47, 0.12)', backgroundColor: '#F9FAF3', color: '#333A2F' }}>
                    <input
                      type="checkbox"
                      checked={resumePrimary}
                      onChange={(event) => setResumePrimary(event.target.checked)}
                      className="h-4 w-4"
                    />
                    Mark as primary
                  </label>
                </div>

                {resumes.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-black/10 bg-[#F9FAF3] p-5 text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                    No resumes yet. Upload one PDF or DOCX file to use it in applications.
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {resumes.map((resume) => (
                      <div key={getString(resume.id)} className="rounded-2xl border border-black/5 p-4" style={{ backgroundColor: '#F7F8F1' }}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold" style={{ color: '#333A2F' }}>
                                {getFileName(resume)}
                              </p>
                              {resume.isPrimary === true && (
                                <span className="rounded-lg px-2 py-1 text-[11px] font-semibold" style={{ backgroundColor: '#333A2F', color: 'white' }}>
                                  Primary
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                              Updated: {formatDateTime(getString(resume.updatedAt) || getString(resume.createdAt))}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {getFileId(resume) && (
                              <button
                                type="button"
                                onClick={() => void handleOpenFile(resume)}
                                className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                                style={{ color: '#333A2F' }}
                              >
                                <Download className="w-4 h-4" />
                                Open
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                void handleDeleteUploadedFile(getFileId(resume), 'Resume deleted.')
                              }
                              disabled={isDeletingMedia}
                              className="inline-flex items-center gap-2 text-sm font-medium"
                              style={{ color: '#b91c1c' }}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-heading text-2xl font-bold" style={{ color: '#333A2F' }}>
                      Portfolio Files
                    </h2>
                    <p className="mt-2 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                      Images and supporting documents stored in the new media module.
                    </p>
                  </div>
                  <label
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
                    style={{ borderColor: 'rgba(51, 58, 47, 0.12)', backgroundColor: '#F7F8F1', color: '#333A2F' }}
                  >
                    <UploadCloud className="w-4 h-4" />
                    Upload portfolio file
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={(event) =>
                        void handleProfileUpload(event, {
                          target: 'CANDIDATE_PORTFOLIO',
                          entityType: 'CANDIDATE_PORTFOLIO',
                          successMessage: 'Portfolio file uploaded.',
                        })
                      }
                    />
                  </label>
                </div>

                {portfolioFiles.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-black/10 bg-[#F9FAF3] p-5 text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                    No portfolio files yet.
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {portfolioFiles.map((file) => (
                      <div key={getFileId(file)} className="rounded-2xl border border-black/5 p-4" style={{ backgroundColor: '#F7F8F1' }}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold" style={{ color: '#333A2F' }}>
                              {getFileName(file)}
                            </p>
                            <p className="mt-1 text-xs" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                              {formatFileSize(file.sizeBytes)} • Uploaded {formatDateTime(getString(file.createdAt))}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {getFileId(file) && (
                              <button
                                type="button"
                                onClick={() => void handleOpenFile(file)}
                                className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
                                style={{ color: '#333A2F' }}
                              >
                                <Download className="w-4 h-4" />
                                Open
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                void handleDeleteUploadedFile(getFileId(file), 'Portfolio file deleted.')
                              }
                              disabled={isDeletingMedia}
                              className="inline-flex items-center gap-2 text-sm font-medium"
                              style={{ color: '#b91c1c' }}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
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
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: '#EBEDDF', color: '#333A2F' }}>
                    <Bookmark className="w-3.5 h-3.5" />
                    {favoriteItems.length} saved
                  </div>
                </div>

                {favoritesLoading ? (
                  <p style={{ color: 'rgba(51, 58, 47, 0.7)' }}>Loading saved vacancies...</p>
                ) : favoriteItems.length === 0 ? (
                  <p style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                    Save a vacancy from the jobs list or vacancy details to see it here.
                  </p>
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
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: '#EBEDDF', color: '#333A2F' }}>
                    <Send className="w-3.5 h-3.5" />
                    {myInvites.length} invite(s)
                  </div>
                </div>

                {invitesLoading ? (
                  <p style={{ color: 'rgba(51, 58, 47, 0.7)' }}>Loading invites...</p>
                ) : myInvites.length === 0 ? (
                  <p style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                    HR invites will appear here after an employer sends one.
                  </p>
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
                          <span className="rounded-lg px-2 py-1 text-xs font-semibold" style={{ backgroundColor: 'white', color: '#333A2F' }}>
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
                          <Link to={`/app/jobs/${invite.vacancy.id}`} className="mt-3 inline-flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: '#333A2F' }}>
                            Open vacancy
                            <ExternalLink className="w-4 h-4" />
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
                    <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: '#EBEDDF', color: '#333A2F' }}>
                      <Bell className="h-3.5 w-3.5" />
                      {notificationsMeta.unread} unread
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void loadNotifications({ limit: 20, offset: 0 })}
                      disabled={notificationsLoading}
                      style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                    >
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={notificationsMutating || notificationsMeta.unread === 0}
                      onClick={() => void handleMarkAllNotificationsRead()}
                      style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                    >
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
                              <Link to={href} className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: '#2B5A41' }}>
                                Open
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            )}
                            {isUnread && (
                              <button
                                type="button"
                                onClick={() => void handleMarkNotificationRead(notification.id)}
                                className="text-sm font-medium hover:underline"
                                style={{ color: '#333A2F' }}
                              >
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
                        Chat ID: {telegramSettings.telegramChatId || 'not linked yet'}
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
                    Save settings
                  </Button>
                  <Button
                    variant="hero"
                    onClick={() => void handleTelegramLinkCreate()}
                    disabled={notificationsMutating}
                    className="justify-center"
                    style={{ backgroundColor: '#2B6A4D', color: 'white' }}
                  >
                    Generate Telegram link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handleTelegramStatusRefresh()}
                    disabled={notificationsMutating}
                    className="justify-center"
                    style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                  >
                    Refresh connection status
                  </Button>
                </div>

                {telegramLinkSession?.deepLink && (
                  <div className="mt-5 rounded-2xl border border-black/5 bg-[#F7F8F1] p-4">
                    <p className="font-medium" style={{ color: '#333A2F' }}>
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
