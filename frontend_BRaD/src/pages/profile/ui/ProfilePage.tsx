import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Briefcase, Building2, Globe, Mail, MapPin, User } from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input, Textarea } from '@shared/ui';
import { isEmployerRole, useUserStore } from '@entities/user';

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

const getString = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
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

export const ProfilePage = () => {
  const { currentUser, updateProfile, loadProfile, currentProfile } = useUserStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const isHr = isEmployerRole(currentUser?.role);

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
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
            <div className="flex items-start justify-between mb-6">
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
                      {isHr ? 'HR profile' : 'User profile'}
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
                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-2 gap-4">
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
                  style={{ backgroundColor: '#333A2F', color: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
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
        </div>
      </main>
    </div>
  );
};
