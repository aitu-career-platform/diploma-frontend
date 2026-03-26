import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Send,
  User,
} from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input, Textarea } from '@shared/ui';
import { isCandidateRole, isEmployerRole, useUserStore } from '@entities/user';
import { useFavoritesStore } from '@entities/favorite';
import { useInviteStore } from '@entities/invite';
import { useNotificationsStore, type AppNotification } from '@entities/notification';

interface ProfileFormValues {
  firstName: string;
  lastName: string;
  bio: string;
  city: string;
  country: string;
  university: string;
  major: string;
  graduationYear: string;
  githubUrl: string;
  linkedinUrl: string;
  portfolioUrl: string;
  companyName: string;
  position: string;
  companyWebsite: string;
  aboutCompany: string;
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

const buildInitialValues = (profile: Record<string, unknown> | null): ProfileFormValues => {
  return {
    firstName: getString(profile?.firstName),
    lastName: getString(profile?.lastName),
    bio: getString(profile?.bio),
    city: getString(profile?.city),
    country: getString(profile?.country),
    university: getString(profile?.university),
    major: getString(profile?.major),
    graduationYear: profile?.graduationYear ? String(profile.graduationYear) : '',
    githubUrl: getString(profile?.githubUrl),
    linkedinUrl: getString(profile?.linkedinUrl),
    portfolioUrl: getString(profile?.portfolioUrl),
    companyName: getString(profile?.companyName),
    position: getString(profile?.position),
    companyWebsite: getString(profile?.companyWebsite),
    aboutCompany: getString(profile?.aboutCompany),
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

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activitySuccess, setActivitySuccess] = useState<string | null>(null);

  const profile = (currentProfile as Record<string, unknown> | null) || null;

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<ProfileFormValues>({
    defaultValues: buildInitialValues(profile),
  });

  useEffect(() => {
    const load = async () => {
      if (!currentUser) {
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
  }, [currentUser, loadProfile]);

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
    if (!currentUser) {
      return;
    }

    const loadSections = async () => {
      const tasks: Array<Promise<unknown>> = [loadNotifications({ limit: 20, offset: 0 })];

      if (isCandidateRole(currentUser.role)) {
        tasks.push(loadMyFavorites({ limit: 100 }));
        tasks.push(loadMyInvites({ limit: 20, offset: 0 }));
      }

      await Promise.allSettled(tasks);
    };

    void loadSections();
  }, [
    currentUser,
    currentUser?.id,
    currentUser?.role,
    loadMyFavorites,
    loadMyInvites,
    loadNotifications,
  ]);

  const isHr = isEmployerRole(currentUser?.role);
  const isCandidate = isCandidateRole(currentUser?.role);

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
      firstName: data.firstName,
      lastName: data.lastName,
      bio: data.bio,
      city: data.city,
      country: data.country,
      linkedinUrl: data.linkedinUrl,
    };

    if (isHr) {
      payload.companyName = data.companyName;
      payload.position = data.position;
      payload.companyWebsite = data.companyWebsite;
      payload.aboutCompany = data.aboutCompany;
    } else {
      payload.university = data.university;
      payload.major = data.major;
      payload.graduationYear = data.graduationYear ? Number(data.graduationYear) : undefined;
      payload.githubUrl = data.githubUrl;
      payload.portfolioUrl = data.portfolioUrl;
    }

    setError(null);
    setIsSaving(true);

    try {
      await updateProfile(currentUser.id, payload as never);
      await loadProfile();
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
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={displayName} className="w-24 h-24 rounded-full" />
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
                      First Name
                    </label>
                    <Input {...register('firstName')} className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                      Last Name
                    </label>
                    <Input {...register('lastName')} className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                  </div>
                </div>

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

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                    LinkedIn URL
                  </label>
                  <Input {...register('linkedinUrl')} type="url" className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
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
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          University
                        </label>
                        <Input {...register('university')} className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                          Major
                        </label>
                        <Input {...register('major')} className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                        Graduation Year
                      </label>
                      <Input {...register('graduationYear')} type="number" className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                        GitHub URL
                      </label>
                      <Input {...register('githubUrl')} type="url" className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                        Portfolio URL
                      </label>
                      <Input {...register('portfolioUrl')} type="url" className="h-12" style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }} />
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

                    {(getString(profile?.companyWebsite) || getString(profile?.linkedinUrl)) && (
                      <div>
                        <h2 className="font-heading text-xl font-bold mb-2" style={{ color: '#333A2F' }}>
                          Links
                        </h2>
                        <div className="flex flex-col gap-2">
                          {getString(profile?.companyWebsite) && (
                            <a href={getString(profile?.companyWebsite)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline" style={{ color: '#333A2F' }}>
                              <Globe className="w-4 h-4" />
                              <span>Company website</span>
                            </a>
                          )}
                          {getString(profile?.linkedinUrl) && (
                            <a href={getString(profile?.linkedinUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline" style={{ color: '#333A2F' }}>
                              <Globe className="w-4 h-4" />
                              <span>LinkedIn</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {(getString(profile?.university) || getString(profile?.major)) && (
                      <div>
                        <h2 className="font-heading text-xl font-bold mb-2" style={{ color: '#333A2F' }}>
                          Education
                        </h2>
                        <div className="flex items-center gap-2" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                          <Briefcase className="w-4 h-4" />
                          <span>{[getString(profile?.university), getString(profile?.major), profile?.graduationYear ? String(profile.graduationYear) : ''].filter(Boolean).join(', ')}</span>
                        </div>
                      </div>
                    )}

                    {(getString(profile?.githubUrl) || getString(profile?.linkedinUrl) || getString(profile?.portfolioUrl)) && (
                      <div>
                        <h2 className="font-heading text-xl font-bold mb-2" style={{ color: '#333A2F' }}>
                          Links
                        </h2>
                        <div className="flex flex-col gap-2">
                          {getString(profile?.githubUrl) && (
                            <a href={getString(profile?.githubUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline" style={{ color: '#333A2F' }}>
                              <Globe className="w-4 h-4" />
                              <span>GitHub</span>
                            </a>
                          )}
                          {getString(profile?.linkedinUrl) && (
                            <a href={getString(profile?.linkedinUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline" style={{ color: '#333A2F' }}>
                              <Globe className="w-4 h-4" />
                              <span>LinkedIn</span>
                            </a>
                          )}
                          {getString(profile?.portfolioUrl) && (
                            <a href={getString(profile?.portfolioUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline" style={{ color: '#333A2F' }}>
                              <Globe className="w-4 h-4" />
                              <span>Portfolio</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

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
