import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  Download,
  ExternalLink,
  Globe,
  ImagePlus,
  Mail,
  MapPin,
  Send,
  Trash2,
  UploadCloud,
  User,
} from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input, Textarea } from '@shared/ui';
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
}

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

  const profile = (currentProfile as Record<string, unknown> | null) || null;
  const currentUserId = currentUser?.id || null;
  const currentUserRole = currentUser?.role || null;
  const avatarSrc = getString(profile?.avatarUrl) || currentUser?.avatar || '';

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
      const tasks: Array<Promise<unknown>> = [loadNotifications({ limit: 20, offset: 0 })];

      if (isCandidateRole(currentUserRole)) {
        tasks.push(loadMyFavorites({ limit: 100 }));
        tasks.push(loadMyInvites({ limit: 20, offset: 0 }));
      }

      await Promise.allSettled(tasks);
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
  const avatarFile = getRecord(profile?.avatarFile);
  const companyLogoFile = getRecord(profile?.companyLogoFile);
  const resumes = getFileArray(profile?.resumes);
  const portfolioFiles = getFileArray(profile?.portfolioFiles);

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

    try {
      await updateTelegramSettings({
        telegramChatId: telegramSettings.telegramChatId,
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

  if (!currentUser) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#EBEDDF', paddingTop: '8rem' }}>
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
      <div className="min-h-screen" style={{ backgroundColor: '#EBEDDF', paddingTop: '8rem' }}>
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
    <div className="min-h-screen" style={{ backgroundColor: '#EBEDDF', paddingTop: '6rem' }}>
      <AppHeader />
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8" style={{ maxWidth: '1280px' }}>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8" style={cardStyle}>
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
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {isHr && (
            <section className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
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

          {isCandidate && (
            <section className="grid gap-6 xl:grid-cols-2">
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
                    <UploadCloud className="w-4 h-4" />
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

          {isCandidate && (
            <div className="grid gap-6 xl:grid-cols-2">
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

          <section id="notifications" className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
            <div className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-heading text-2xl font-bold" style={{ color: '#333A2F' }}>
                    Notifications
                  </h2>
                  <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                    In-app notifications from `/notifications/my`.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: '#EBEDDF', color: '#333A2F' }}>
                    <Bell className="w-3.5 h-3.5" />
                    {notificationsMeta.unread} unread
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={notificationsMutating || notificationsMeta.unread === 0}
                    onClick={() => void handleMarkAllNotificationsRead()}
                    style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                  >
                    Mark all as read
                  </Button>
                </div>
              </div>

              {notificationsLoading ? (
                <p style={{ color: 'rgba(51, 58, 47, 0.7)' }}>Loading notifications...</p>
              ) : notifications.length === 0 ? (
                <p style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                  No notifications yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => {
                    const href = getNotificationHref(notification);
                    const isUnread = !notification.readAt;

                    return (
                      <div key={notification.id} className="rounded-2xl border border-black/5 p-4" style={{ backgroundColor: isUnread ? '#F7F8F1' : 'white' }}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold" style={{ color: '#333A2F' }}>
                              {notification.title}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em]" style={{ color: 'rgba(51, 58, 47, 0.5)' }}>
                              {notification.type}
                            </p>
                          </div>
                          <span className="rounded-lg px-2 py-1 text-xs font-semibold" style={{ backgroundColor: isUnread ? '#333A2F' : '#EBEDDF', color: isUnread ? 'white' : '#333A2F' }}>
                            {isUnread ? 'Unread' : 'Read'}
                          </span>
                        </div>

                        <p className="mt-3 text-xs" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                          Created: {formatDateTime(notification.createdAt)}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3">
                          {href && (
                            <Link to={href} className="inline-flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: '#333A2F' }}>
                              Open
                              <ExternalLink className="w-4 h-4" />
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

            <div className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
              <div className="mb-6">
                <h2 className="font-heading text-2xl font-bold" style={{ color: '#333A2F' }}>
                  Telegram Notifications
                </h2>
                <p className="text-sm mt-2" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                  Deep-link flow based on `/notifications/telegram/link`.
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-black/5 p-4" style={{ backgroundColor: '#F7F8F1' }}>
                  <div>
                    <div className="font-medium" style={{ color: '#333A2F' }}>
                      Enable Telegram notifications
                    </div>
                    <div className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                      Chat ID: {telegramSettings.telegramChatId || 'not linked yet'}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={telegramSettings.telegramNotificationsEnabled}
                    onChange={(event) =>
                      initializeTelegramSettings({
                        telegramNotificationsEnabled: event.target.checked,
                      })
                    }
                    className="h-5 w-5"
                  />
                </label>

                <label className="flex items-center justify-between gap-4 rounded-2xl border border-black/5 p-4" style={{ backgroundColor: '#F7F8F1' }}>
                  <div>
                    <div className="font-medium" style={{ color: '#333A2F' }}>
                      Invite notifications
                    </div>
                    <div className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                      Vacancy invites from HR.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={telegramSettings.telegramNotifyInvites}
                    onChange={(event) =>
                      initializeTelegramSettings({
                        telegramNotifyInvites: event.target.checked,
                      })
                    }
                    className="h-5 w-5"
                  />
                </label>

                <label className="flex items-center justify-between gap-4 rounded-2xl border border-black/5 p-4" style={{ backgroundColor: '#F7F8F1' }}>
                  <div>
                    <div className="font-medium" style={{ color: '#333A2F' }}>
                      Application notifications
                    </div>
                    <div className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                      New application alerts for HR and any app-side application notifications.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={telegramSettings.telegramNotifyApplications}
                    onChange={(event) =>
                      initializeTelegramSettings({
                        telegramNotifyApplications: event.target.checked,
                      })
                    }
                    className="h-5 w-5"
                  />
                </label>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => void handleTelegramSettingsSave()}
                    disabled={notificationsMutating}
                    style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                  >
                    Save Telegram Settings
                  </Button>
                  <Button
                    variant="hero"
                    onClick={() => void handleTelegramLinkCreate()}
                    disabled={notificationsMutating}
                    style={{ backgroundColor: '#333A2F', color: 'white' }}
                  >
                    Generate Telegram Link
                  </Button>
                </div>

                {telegramLinkSession?.deepLink && (
                  <div className="rounded-2xl border border-black/5 p-4" style={{ backgroundColor: '#F7F8F1' }}>
                    <p className="font-medium" style={{ color: '#333A2F' }}>
                      Telegram deep-link is ready
                    </p>
                    <p className="mt-2 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                      Expires at: {formatDateTime(telegramLinkSession.expiresAt)}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                      Bot: {telegramLinkSession.botUsername || 'configured bot'}
                    </p>
                    <a
                      href={telegramLinkSession.deepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-medium hover:underline"
                      style={{ color: '#333A2F' }}
                    >
                      Open Telegram
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    {telegramLinkSession.instructions && (
                      <p className="mt-3 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                        {telegramLinkSession.instructions}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
