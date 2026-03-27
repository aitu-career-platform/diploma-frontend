import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Edit, Heart, Plus, Send, Trash2, Users } from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input, Textarea } from '@shared/ui';
import { isEmployerRole, useUserStore } from '@entities/user';
import { useVacancyStore, type Vacancy, type VacancyWorkflowStep } from '@entities/vacancy';
import { useFavoritesStore } from '@entities/favorite';
import { useInviteStore } from '@entities/invite';

type VacancyWizardData = {
  basic: {
    title: string;
    specializationIds: string[];
    experienceLevel: string;
    hiringPlan: string;
  };
  conditions: {
    workerKind: string;
    employmentType: string;
    workFormats: string[];
  };
  schedule: {
    schedules: string[];
    workHours: string[];
  };
  address: {
    publicationCityId: string;
    workAddress: string;
    hideWorkAddress: boolean;
  };
  compensation: {
    salaryFrom: string;
    salaryTo: string;
    currency: string;
    salaryPeriod: string;
    salaryTaxMode: string;
    payoutFrequency: string;
  };
  description: {
    description: string;
  };
  skills: {
    skillsText: string;
  };
  languages: {
    languageIds: string[];
  };
};

const emptyWizardData: VacancyWizardData = {
  basic: {
    title: '',
    specializationIds: [],
    experienceLevel: '',
    hiringPlan: '',
  },
  conditions: {
    workerKind: '',
    employmentType: '',
    workFormats: [],
  },
  schedule: {
    schedules: [],
    workHours: [],
  },
  address: {
    publicationCityId: '',
    workAddress: '',
    hideWorkAddress: false,
  },
  compensation: {
    salaryFrom: '',
    salaryTo: '',
    currency: 'USD',
    salaryPeriod: '',
    salaryTaxMode: '',
    payoutFrequency: '',
  },
  description: {
    description: '',
  },
  skills: {
    skillsText: '',
  },
  languages: {
    languageIds: [],
  },
};

const vacancySteps: Array<{ id: VacancyWorkflowStep; label: string; hint: string }> = [
  { id: 'basic', label: '1. Basic', hint: 'Title, specialization, experience' },
  { id: 'conditions', label: '2. Conditions', hint: 'Employment and format' },
  { id: 'schedule', label: '3. Schedule', hint: 'Days and working hours' },
  { id: 'address', label: '4. Address', hint: 'City and work address' },
  { id: 'compensation', label: '5. Compensation', hint: 'Salary and tax mode' },
  { id: 'description', label: '6. Description', hint: 'Short role summary' },
  { id: 'skills', label: '7. Skills', hint: 'Stack and key skills' },
  { id: 'languages', label: '8. Languages', hint: 'Required languages' },
];

const cloneEmptyWizardData = (): VacancyWizardData => {
  return JSON.parse(JSON.stringify(emptyWizardData)) as VacancyWizardData;
};

const listFromText = (value: string): string[] => {
  return value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean);
};

const cleanPayload = (payload: Record<string, unknown>): Record<string, unknown> => {
  const entries = Object.entries(payload).filter(([, value]) => {
    if (value === undefined || value === null) {
      return false;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return true;
  });

  return Object.fromEntries(entries);
};

const toNumberOrUndefined = (value: string): number | undefined => {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
};

const toggleArrayValue = (current: string[], value: string): string[] => {
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }

  return [...current, value];
};

const mapVacancyToForm = (vacancy: Vacancy | null): VacancyWizardData => {
  const next = cloneEmptyWizardData();
  if (!vacancy) {
    return next;
  }

  next.basic.title = String(vacancy.title || '');
  next.basic.specializationIds = Array.isArray(vacancy.specializationIds)
    ? vacancy.specializationIds
    : [];
  next.basic.experienceLevel = String(vacancy.experienceLevel || '');
  next.basic.hiringPlan = String(vacancy.hiringPlan ?? '');

  next.conditions.workerKind = String(vacancy.workerKind || '');
  next.conditions.employmentType = String(vacancy.employmentType || '');
  next.conditions.workFormats = Array.isArray(vacancy.workFormats)
    ? vacancy.workFormats
    : [];

  next.schedule.schedules = Array.isArray(vacancy.schedules) ? vacancy.schedules : [];
  next.schedule.workHours = Array.isArray(vacancy.workHours) ? vacancy.workHours : [];

  next.address.publicationCityId = String(vacancy.publicationCityId || '');
  next.address.workAddress = String(vacancy.workAddress || '');
  next.address.hideWorkAddress = Boolean(vacancy.hideWorkAddress);

  next.compensation.salaryFrom = String(vacancy.salaryFrom ?? '');
  next.compensation.salaryTo = String(vacancy.salaryTo ?? '');
  next.compensation.currency = String(vacancy.currency || 'USD');
  next.compensation.salaryPeriod = String(vacancy.salaryPeriod || '');
  next.compensation.salaryTaxMode = String(vacancy.salaryTaxMode || '');
  next.compensation.payoutFrequency = String(vacancy.payoutFrequency || '');

  next.description.description = String(vacancy.description || '');

  const skills = Array.isArray(vacancy.skills) ? vacancy.skills : [];
  next.skills.skillsText = skills.join(', ');

  next.languages.languageIds = Array.isArray(vacancy.languageIds)
    ? vacancy.languageIds
    : [];

  return next;
};

const getStepPayload = (
  step: VacancyWorkflowStep,
  formData: VacancyWizardData,
): Record<string, unknown> => {
  switch (step) {
    case 'basic':
      return cleanPayload({
        title: formData.basic.title,
        specializationIds: formData.basic.specializationIds,
        experienceLevel: formData.basic.experienceLevel,
        hiringPlan: toNumberOrUndefined(formData.basic.hiringPlan),
      });
    case 'conditions':
      return cleanPayload({
        workerKind: formData.conditions.workerKind,
        employmentType: formData.conditions.employmentType,
        workFormats: formData.conditions.workFormats,
      });
    case 'schedule':
      return cleanPayload({
        schedules: formData.schedule.schedules,
        workHours: formData.schedule.workHours,
      });
    case 'address':
      return cleanPayload({
        publicationCityId: formData.address.publicationCityId,
        workAddress: formData.address.workAddress,
        hideWorkAddress: formData.address.hideWorkAddress,
      });
    case 'compensation':
      return cleanPayload({
        salaryFrom: toNumberOrUndefined(formData.compensation.salaryFrom),
        salaryTo: toNumberOrUndefined(formData.compensation.salaryTo),
        currency: formData.compensation.currency,
        salaryPeriod: formData.compensation.salaryPeriod,
        salaryTaxMode: formData.compensation.salaryTaxMode,
        payoutFrequency: formData.compensation.payoutFrequency,
      });
    case 'description':
      return cleanPayload({
        description: formData.description.description,
      });
    case 'skills':
      return cleanPayload({
        skills: listFromText(String(formData.skills.skillsText || '')),
      });
    case 'languages':
      return cleanPayload({
        languageIds: formData.languages.languageIds,
      });
    default:
      return {};
  }
};

const formatDate = (value?: string): string => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString();
};

const formatEnumLabel = (value: string): string => {
  return value
    .split('_')
    .map((chunk) => `${chunk.slice(0, 1)}${chunk.slice(1).toLowerCase()}`)
    .join(' ');
};

const statusTitle = (status: string): string => {
  const normalized = status.toUpperCase();
  if (normalized === 'PUBLISHED' || normalized === 'ACTIVE') {
    return 'Published';
  }
  if (normalized === 'ARCHIVED') {
    return 'Archived';
  }

  return 'Draft';
};

const formatDateTime = (value?: string): string => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
};

const getCandidateName = (candidate: {
  firstName?: string;
  lastName?: string;
  email?: string;
} | null | undefined): string => {
  const fullName = `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim();
  return fullName || candidate?.email || 'Candidate';
};

export const EmployerPage = () => {
  const { currentUser } = useUserStore();
  const { countsByVacancyId, loadFavoritesCount } = useFavoritesStore();
  const {
    vacancies,
    currentVacancy,
    currentVacancyId,
    dictionaries,
    isDictionariesLoading,
    isLoading,
    isSaving,
    error,
    loadDictionaries,
    loadMyVacancies,
    loadVacancy,
    createDraft,
    saveStep,
    publishCurrent,
    archiveVacancy,
    clearCurrent,
  } = useVacancyStore();
  const {
    suggestedCandidates,
    hrInvites,
    suggestionVacancy,
    isLoading: invitesLoading,
    isMutating: invitesMutating,
    loadSuggestedCandidates,
    sendInvite,
    loadHrInvites,
  } = useInviteStore();

  const [showWizard, setShowWizard] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [wizardSuccess, setWizardSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<VacancyWizardData>(() => cloneEmptyWizardData());
  const [selectedVacancyId, setSelectedVacancyId] = useState('');
  const [inviteMessage, setInviteMessage] = useState(
    'Ваш опыт подходит под вакансию. Будем рады обсудить детали на интервью.',
  );
  const [interviewAt, setInterviewAt] = useState('');

  const activeStep = vacancySteps[activeStepIndex];
  const isLastStep = activeStepIndex === vacancySteps.length - 1;

  useEffect(() => {
    void loadDictionaries();
    void loadMyVacancies();
    void loadHrInvites({ limit: 20, offset: 0 });
  }, [loadDictionaries, loadHrInvites, loadMyVacancies]);

  useEffect(() => {
    if (!currentVacancy) {
      return;
    }

    setFormData(mapVacancyToForm(currentVacancy));
  }, [currentVacancy]);

  const sortedVacancies = useMemo(() => {
    return [...vacancies].sort((a, b) => {
      const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bDate - aDate;
    });
  }, [vacancies]);

  useEffect(() => {
    if (!sortedVacancies.length) {
      return;
    }

    setSelectedVacancyId((current) => current || sortedVacancies[0].id);
  }, [sortedVacancies]);

  useEffect(() => {
    if (!sortedVacancies.length) {
      return;
    }

    void Promise.allSettled(
      sortedVacancies.map((vacancy) => loadFavoritesCount(vacancy.id)),
    );
  }, [loadFavoritesCount, sortedVacancies]);

  const cityLabelById = useMemo(() => {
    const map = new Map<string, string>();
    dictionaries.cities.forEach((city) => {
      map.set(city.value, city.label);
    });
    return map;
  }, [dictionaries.cities]);

  const updateField = (
    step: keyof VacancyWizardData,
    field: string,
    value: string | boolean | string[],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [step]: {
        ...prev[step],
        [field]: value,
      },
    }));
  };

  const handleCreate = () => {
    clearCurrent();
    setFormData(cloneEmptyWizardData());
    setShowWizard(true);
    setActiveStepIndex(0);
    setWizardError(null);
    setWizardSuccess('Fill step 1 and click Save to create draft');
    if (!isDictionariesLoading && dictionaries.specializations.length === 0) {
      void loadDictionaries();
    }
  };

  const handleEdit = async (vacancyId: string) => {
    setWizardError(null);
    setWizardSuccess(null);

    try {
      await loadVacancy(vacancyId);
      setShowWizard(true);
      setActiveStepIndex(0);
    } catch (loadingError) {
      setWizardError(
        loadingError instanceof Error ? loadingError.message : 'Failed to open vacancy',
      );
    }
  };

  const handleClose = () => {
    setShowWizard(false);
    setActiveStepIndex(0);
    setWizardError(null);
    setWizardSuccess(null);
    clearCurrent();
  };

  const saveCurrentStep = async (moveNext: boolean) => {
    if (!activeStep) {
      return;
    }

    setWizardError(null);
    setWizardSuccess(null);

    try {
      if (activeStep.id !== 'basic' && !currentVacancyId) {
        setActiveStepIndex(0);
        throw new Error('Complete and save Basic step first to create draft');
      }

      if (activeStep.id === 'basic' && !currentVacancyId) {
        if (dictionaries.specializations.length === 0 && !isDictionariesLoading) {
          await loadDictionaries();
        }

        const { dictionaries: latestDictionaries, error: dictionariesError } = useVacancyStore.getState();

        if (latestDictionaries.specializations.length === 0) {
          throw new Error(
            dictionariesError || 'Specializations are unavailable in vacancy dictionaries',
          );
        }

        if (formData.basic.title.trim().length < 2) {
          throw new Error('Title must be at least 2 characters');
        }

        if (formData.basic.specializationIds.length === 0) {
          throw new Error('Choose at least one specialization');
        }

        await createDraft({
          title: formData.basic.title.trim(),
          specializationIds: formData.basic.specializationIds,
          experienceLevel: formData.basic.experienceLevel || undefined,
          hiringPlan: toNumberOrUndefined(formData.basic.hiringPlan),
        });

        setWizardSuccess('Draft created and basic step saved');

        if (moveNext && !isLastStep) {
          setActiveStepIndex((prev) => prev + 1);
        }

        return;
      }

      const payload = getStepPayload(activeStep.id, formData);
      await saveStep(activeStep.id, payload);
      setWizardSuccess(`${activeStep.label} saved`);

      if (moveNext && !isLastStep) {
        setActiveStepIndex((prev) => prev + 1);
      }
    } catch (saveError) {
      setWizardError(
        saveError instanceof Error
          ? saveError.message
          : `Failed to save ${activeStep.label}`,
      );
    }
  };

  const handlePublish = async () => {
    setWizardError(null);
    setWizardSuccess(null);

    try {
      await publishCurrent();
      setWizardSuccess('Vacancy published successfully');
      await loadMyVacancies();
    } catch (publishError) {
      setWizardError(
        publishError instanceof Error
          ? publishError.message
          : 'Failed to publish vacancy',
      );
    }
  };

  const handleArchive = async (vacancyId: string) => {
    try {
      await archiveVacancy(vacancyId);
      await loadMyVacancies();
    } catch (archiveError) {
      setWizardError(
        archiveError instanceof Error
          ? archiveError.message
          : 'Failed to archive vacancy',
      );
    }
  };

  const handleRefreshMatching = async (vacancyId = selectedVacancyId) => {
    if (!vacancyId) {
      setWizardError('Choose a vacancy first');
      return;
    }

    setWizardError(null);
    setWizardSuccess(null);

    try {
      await Promise.all([
        loadSuggestedCandidates(vacancyId, 20, 0),
        loadHrInvites({ vacancyId, limit: 20, offset: 0 }),
      ]);
      setWizardSuccess('Candidate suggestions refreshed');
    } catch (loadingError) {
      setWizardError(
        loadingError instanceof Error
          ? loadingError.message
          : 'Failed to load candidate suggestions',
      );
    }
  };

  const handleSendInvite = async (candidateId: string) => {
    if (!selectedVacancyId) {
      setWizardError('Choose a vacancy first');
      return;
    }

    setWizardError(null);
    setWizardSuccess(null);

    try {
      await sendInvite({
        vacancyId: selectedVacancyId,
        candidateId,
        message: inviteMessage,
        interviewAt: interviewAt || undefined,
      });
      await loadHrInvites({ vacancyId: selectedVacancyId, limit: 20, offset: 0 });
      setWizardSuccess('Invite sent successfully');
    } catch (inviteError) {
      setWizardError(
        inviteError instanceof Error ? inviteError.message : 'Failed to send invite',
      );
    }
  };

  const isAllowed = isEmployerRole(currentUser?.role);

  if (!currentUser || !isAllowed) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#EBEDDF', paddingTop: '7rem' }}>
        <AppHeader />
        <main className="container mx-auto px-6 py-12" style={{ maxWidth: '1280px' }}>
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold mb-4" style={{ color: '#333A2F' }}>
              Access Denied
            </h1>
            <p style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
              This page is available only for HR and employer accounts.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EBEDDF', paddingTop: '7rem' }}>
      <AppHeader />
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8" style={{ maxWidth: '1280px' }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2" style={{ color: '#333A2F' }}>
              HR Dashboard
            </h1>
            <p className="text-sm sm:text-base" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
              Create vacancies with step-by-step workflow and publish when all sections are complete.
            </p>
          </div>
          <Button
            onClick={handleCreate}
            variant="hero"
            className="w-full sm:w-auto"
            disabled={isSaving}
            style={{ backgroundColor: '#333A2F', color: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Vacancy
          </Button>
        </div>

        {(wizardError || wizardSuccess || error) && (
          <div className="space-y-2 mb-4">
            {wizardError && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c' }}>
                {wizardError}
              </div>
            )}
            {wizardSuccess && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(22, 163, 74, 0.12)', color: '#166534' }}>
                {wizardSuccess}
              </div>
            )}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#92400e' }}>
                {error}
              </div>
            )}
          </div>
        )}

        {showWizard && (
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-6" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <div>
                <h2 className="font-heading text-2xl font-bold" style={{ color: '#333A2F' }}>
                  Vacancy Wizard
                </h2>
                <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                  Draft ID: {currentVacancy?.id || 'will be created on step 1'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg border-2 text-sm font-medium"
                style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
              >
                Close wizard
              </button>
            </div>

            <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-8 mb-6">
              {vacancySteps.map((step, index) => {
                const isActive = index === activeStepIndex;
                const isLocked = !currentVacancyId && index > 0;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        setWizardError('Create draft on Basic step first');
                        return;
                      }
                      setWizardError(null);
                      setActiveStepIndex(index);
                    }}
                    className="text-left rounded-xl border px-3 py-2 transition-all"
                    style={
                      isActive
                        ? {
                            borderColor: '#333A2F',
                            backgroundColor: '#333A2F',
                            color: '#ffffff',
                          }
                        : {
                            borderColor: 'rgba(51, 58, 47, 0.2)',
                            backgroundColor: '#ffffff',
                            color: '#333A2F',
                            opacity: isLocked ? 0.5 : 1,
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                          }
                    }
                  >
                    <div className="text-xs font-semibold">{step.label}</div>
                    <div className="text-[11px] opacity-80 mt-1">{step.hint}</div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">
              {activeStep.id === 'basic' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                      Vacancy title
                    </label>
                    <Input
                      value={formData.basic.title}
                      onChange={(event) => updateField('basic', 'title', event.target.value)}
                      placeholder="Frontend Developer Intern"
                      className="h-12"
                      style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                      Specializations
                    </label>
                    {dictionaries.specializations.length === 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                          {isDictionariesLoading
                            ? 'Loading specializations...'
                            : 'No specializations are available from backend dictionaries.'}
                        </p>
                        {!isDictionariesLoading && (
                          <p className="text-xs" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                            HR cannot create the first vacancy until an admin adds at least one specialization in backend.
                            {error ? ` Backend says: ${error}` : ''}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {dictionaries.specializations.map((option) => {
                          const selected = formData.basic.specializationIds.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              className="px-3 py-1 rounded-lg text-xs border"
                              style={{
                                borderColor: selected ? '#333A2F' : 'rgba(51, 58, 47, 0.2)',
                                backgroundColor: selected ? '#333A2F' : '#ffffff',
                                color: selected ? '#ffffff' : '#333A2F',
                              }}
                              onClick={() =>
                                updateField(
                                  'basic',
                                  'specializationIds',
                                  toggleArrayValue(formData.basic.specializationIds, option.value),
                                )
                              }
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                        Experience level
                      </label>
                      <select
                        value={formData.basic.experienceLevel}
                        onChange={(event) =>
                          updateField('basic', 'experienceLevel', event.target.value)
                        }
                        className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                      >
                        <option value="">Select level</option>
                        {dictionaries.experienceLevels.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                        Hiring plan
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.basic.hiringPlan}
                        onChange={(event) =>
                          updateField('basic', 'hiringPlan', event.target.value)
                        }
                        className="h-12"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                      />
                    </div>
                  </div>
                </>
              )}

              {activeStep.id === 'conditions' && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                        Worker kind
                      </label>
                      <select
                        value={formData.conditions.workerKind}
                        onChange={(event) =>
                          updateField('conditions', 'workerKind', event.target.value)
                        }
                        className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                      >
                        <option value="">Select worker kind</option>
                        {dictionaries.workerKinds.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                        Employment type
                      </label>
                      <select
                        value={formData.conditions.employmentType}
                        onChange={(event) =>
                          updateField('conditions', 'employmentType', event.target.value)
                        }
                        className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                      >
                        <option value="">Select type</option>
                        {dictionaries.employmentTypes.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                      Work formats
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {dictionaries.workFormats.map((option) => {
                        const selected = formData.conditions.workFormats.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className="px-3 py-1 rounded-lg text-xs border"
                            style={{
                              borderColor: selected ? '#333A2F' : 'rgba(51, 58, 47, 0.2)',
                              backgroundColor: selected ? '#333A2F' : '#ffffff',
                              color: selected ? '#ffffff' : '#333A2F',
                            }}
                            onClick={() =>
                              updateField(
                                'conditions',
                                'workFormats',
                                toggleArrayValue(formData.conditions.workFormats, option.value),
                              )
                            }
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeStep.id === 'schedule' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                      Schedules
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {dictionaries.schedules.map((option) => {
                        const selected = formData.schedule.schedules.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className="px-3 py-1 rounded-lg text-xs border"
                            style={{
                              borderColor: selected ? '#333A2F' : 'rgba(51, 58, 47, 0.2)',
                              backgroundColor: selected ? '#333A2F' : '#ffffff',
                              color: selected ? '#ffffff' : '#333A2F',
                            }}
                            onClick={() =>
                              updateField(
                                'schedule',
                                'schedules',
                                toggleArrayValue(formData.schedule.schedules, option.value),
                              )
                            }
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                      Work hours
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {dictionaries.workHours.map((option) => {
                        const selected = formData.schedule.workHours.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className="px-3 py-1 rounded-lg text-xs border"
                            style={{
                              borderColor: selected ? '#333A2F' : 'rgba(51, 58, 47, 0.2)',
                              backgroundColor: selected ? '#333A2F' : '#ffffff',
                              color: selected ? '#ffffff' : '#333A2F',
                            }}
                            onClick={() =>
                              updateField(
                                'schedule',
                                'workHours',
                                toggleArrayValue(formData.schedule.workHours, option.value),
                              )
                            }
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeStep.id === 'address' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                      Publication city
                    </label>
                    <select
                      value={formData.address.publicationCityId}
                      onChange={(event) =>
                        updateField('address', 'publicationCityId', event.target.value)
                      }
                      className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                    >
                      <option value="">Select city</option>
                      {dictionaries.cities.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                      Work address
                    </label>
                    <Input
                      value={formData.address.workAddress}
                      onChange={(event) =>
                        updateField('address', 'workAddress', event.target.value)
                      }
                      placeholder="Abylai Khan Ave 123"
                      className="h-12"
                      style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                    />
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm" style={{ color: '#333A2F' }}>
                    <input
                      type="checkbox"
                      checked={formData.address.hideWorkAddress}
                      onChange={(event) =>
                        updateField('address', 'hideWorkAddress', event.target.checked)
                      }
                    />
                    Hide exact address in public vacancy
                  </label>
                </div>
              )}

              {activeStep.id === 'compensation' && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                        Salary from
                      </label>
                      <Input
                        type="number"
                        value={formData.compensation.salaryFrom}
                        onChange={(event) =>
                          updateField('compensation', 'salaryFrom', event.target.value)
                        }
                        className="h-12"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                        Salary to
                      </label>
                      <Input
                        type="number"
                        value={formData.compensation.salaryTo}
                        onChange={(event) =>
                          updateField('compensation', 'salaryTo', event.target.value)
                        }
                        className="h-12"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                        Currency
                      </label>
                      <select
                        value={formData.compensation.currency}
                        onChange={(event) =>
                          updateField('compensation', 'currency', event.target.value)
                        }
                        className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                      >
                        {dictionaries.currencies.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                        Salary period
                      </label>
                      <select
                        value={formData.compensation.salaryPeriod}
                        onChange={(event) =>
                          updateField('compensation', 'salaryPeriod', event.target.value)
                        }
                        className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                      >
                        <option value="">Select period</option>
                        {dictionaries.salaryPeriods.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                        Tax mode
                      </label>
                      <select
                        value={formData.compensation.salaryTaxMode}
                        onChange={(event) =>
                          updateField('compensation', 'salaryTaxMode', event.target.value)
                        }
                        className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                      >
                        <option value="">Select tax mode</option>
                        {dictionaries.salaryTaxModes.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                        Payout frequency
                      </label>
                      <select
                        value={formData.compensation.payoutFrequency}
                        onChange={(event) =>
                          updateField('compensation', 'payoutFrequency', event.target.value)
                        }
                        className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                      >
                        <option value="">Select frequency</option>
                        {dictionaries.payoutFrequencies.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeStep.id === 'description' && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                    Vacancy description (max 200 chars)
                  </label>
                  <Textarea
                    rows={5}
                    maxLength={200}
                    value={formData.description.description}
                    onChange={(event) =>
                      updateField('description', 'description', event.target.value)
                    }
                    placeholder="Describe role in up to 200 chars"
                    style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                    {formData.description.description.length}/200
                  </p>
                </div>
              )}

              {activeStep.id === 'skills' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                      Key skills (comma or new line)
                    </label>
                    <Textarea
                      rows={4}
                      value={formData.skills.skillsText}
                      onChange={(event) =>
                        updateField('skills', 'skillsText', event.target.value)
                      }
                      placeholder="React, TypeScript, REST API"
                      style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dictionaries.skillHints.map((skill) => (
                      <button
                        key={skill.value}
                        type="button"
                        className="px-3 py-1 rounded-lg text-xs"
                        style={{ backgroundColor: '#EBEDDF', color: '#333A2F' }}
                        onClick={() => {
                          const current = formData.skills.skillsText;
                          const currentList = listFromText(current);
                          if (!currentList.includes(skill.label)) {
                            updateField(
                              'skills',
                              'skillsText',
                              [...currentList, skill.label].join(', '),
                            );
                          }
                        }}
                      >
                        {skill.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {activeStep.id === 'languages' && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                    Languages
                  </label>
                  {dictionaries.languages.length === 0 ? (
                    <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                      No languages in dictionary.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {dictionaries.languages.map((language) => {
                        const selected = formData.languages.languageIds.includes(language.value);
                        return (
                          <button
                            key={language.value}
                            type="button"
                            className="px-3 py-1 rounded-lg text-xs border"
                            style={{
                              borderColor: selected ? '#333A2F' : 'rgba(51, 58, 47, 0.2)',
                              backgroundColor: selected ? '#333A2F' : '#ffffff',
                              color: selected ? '#ffffff' : '#333A2F',
                            }}
                            onClick={() =>
                              updateField(
                                'languages',
                                'languageIds',
                                toggleArrayValue(formData.languages.languageIds, language.value),
                              )
                            }
                          >
                            {language.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border-2 text-sm font-medium"
                style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeStepIndex === 0 || isSaving}
              >
                Back
              </button>

              <Button
                type="button"
                variant="hero"
                onClick={() => void saveCurrentStep(false)}
                disabled={isSaving}
                style={{ backgroundColor: '#333A2F', color: 'white' }}
              >
                Save step
              </Button>

              {!isLastStep && (
                <Button
                  type="button"
                  variant="hero"
                  onClick={() => void saveCurrentStep(true)}
                  disabled={isSaving}
                  style={{ backgroundColor: '#1f2937', color: 'white' }}
                >
                  Save and next
                </Button>
              )}

              {isLastStep && (
                <Button
                  type="button"
                  variant="hero"
                  onClick={() => void handlePublish()}
                  disabled={isSaving}
                  style={{ backgroundColor: '#166534', color: 'white' }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Publish vacancy
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="font-heading text-2xl font-bold" style={{ color: '#333A2F' }}>
            Your Vacancies
          </h2>

          {isLoading ? (
            <div className="bg-white rounded-2xl shadow-lg p-8" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
              <p style={{ color: 'rgba(51, 58, 47, 0.7)' }}>Loading vacancies...</p>
            </div>
          ) : sortedVacancies.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
              <Briefcase className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgba(51, 58, 47, 0.7)' }} />
              <h3 className="font-heading text-xl font-bold mb-2" style={{ color: '#333A2F' }}>
                No vacancies yet
              </h3>
              <p className="mb-4" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                Start with a draft and go through all 8 steps before publishing.
              </p>
              <Button
                onClick={handleCreate}
                variant="hero"
                style={{ backgroundColor: '#333A2F', color: 'white', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              >
                Create first vacancy
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {sortedVacancies.map((vacancy) => (
                <div key={vacancy.id} className="bg-white rounded-2xl shadow-lg p-6" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-heading text-xl font-bold" style={{ color: '#333A2F' }}>
                          {vacancy.title}
                        </h3>
                        <span
                          className="px-3 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            backgroundColor:
                              statusTitle(vacancy.status) === 'Published'
                                ? 'rgba(22, 163, 74, 0.12)'
                                : statusTitle(vacancy.status) === 'Archived'
                                  ? 'rgba(107, 114, 128, 0.15)'
                                  : 'rgba(245, 158, 11, 0.2)',
                            color:
                              statusTitle(vacancy.status) === 'Published'
                                ? '#166534'
                                : statusTitle(vacancy.status) === 'Archived'
                                  ? '#374151'
                                  : '#92400e',
                          }}
                        >
                          {statusTitle(vacancy.status)}
                        </span>
                      </div>

                      <p className="text-sm mb-1" style={{ color: 'rgba(51, 58, 47, 0.8)' }}>
                        City: {cityLabelById.get(vacancy.publicationCityId || '') || '—'}
                      </p>
                      <p className="text-sm mb-1" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                        Experience: {vacancy.experienceLevel ? formatEnumLabel(vacancy.experienceLevel) : '—'}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                        <span>Updated: {formatDate(vacancy.updatedAt || vacancy.createdAt)}</span>
                        <span className="inline-flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5" />
                          {countsByVacancyId[vacancy.id] ?? vacancy.favoritesCount ?? 0} saved
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="px-3 py-2 rounded-lg border-2 transition-all duration-200 text-sm font-medium"
                        onClick={() => {
                          setSelectedVacancyId(vacancy.id);
                          void handleRefreshMatching(vacancy.id);
                        }}
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F', backgroundColor: 'transparent' }}
                      >
                        Find candidates
                      </button>
                      <button
                        className="p-2 rounded-lg border-2 transition-all duration-200"
                        onClick={() => void handleEdit(vacancy.id)}
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F', backgroundColor: 'transparent' }}
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        className="p-2 rounded-lg border-2 transition-all duration-200"
                        onClick={() => void handleArchive(vacancy.id)}
                        style={{ borderColor: 'rgba(220, 38, 38, 0.2)', color: '#dc2626', backgroundColor: 'transparent' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr] mt-8">
          <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="font-heading text-2xl font-bold" style={{ color: '#333A2F' }}>
                  Candidate Matching
                </h2>
                <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                  Suggestions from `/invites/suggest-candidates` with score and existing invite state.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => void handleRefreshMatching()}
                disabled={invitesLoading || !selectedVacancyId}
                style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
              >
                Refresh matches
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.9fr,1.1fr] mb-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                  Vacancy
                </label>
                <select
                  value={selectedVacancyId}
                  onChange={(event) => setSelectedVacancyId(event.target.value)}
                  className="w-full rounded-xl border px-4 py-3 text-sm"
                  style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                >
                  <option value="">Choose vacancy</option>
                  {sortedVacancies.map((vacancy) => (
                    <option key={vacancy.id} value={vacancy.id}>
                      {vacancy.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                  Interview date and time
                </label>
                <Input
                  type="datetime-local"
                  value={interviewAt}
                  onChange={(event) => setInterviewAt(event.target.value)}
                  className="h-12"
                  style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                Invite message
              </label>
              <Textarea
                value={inviteMessage}
                onChange={(event) => setInviteMessage(event.target.value)}
                rows={4}
                style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
              />
            </div>

            {suggestionVacancy?.title && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: '#EBEDDF', color: '#333A2F' }}>
                <Users className="w-3.5 h-3.5" />
                Matching against: {suggestionVacancy.title}
              </div>
            )}

            {invitesLoading && suggestedCandidates.length === 0 ? (
              <p style={{ color: 'rgba(51, 58, 47, 0.7)' }}>Loading suggested candidates...</p>
            ) : suggestedCandidates.length === 0 ? (
              <p style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                Choose a vacancy and click refresh to see candidate suggestions.
              </p>
            ) : (
              <div className="space-y-4">
                {suggestedCandidates.map((item) => (
                  <div key={item.candidate.id} className="rounded-2xl border border-black/5 p-4" style={{ backgroundColor: '#F7F8F1' }}>
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="font-semibold" style={{ color: '#333A2F' }}>
                            {getCandidateName(item.candidate)}
                          </h3>
                          <span className="rounded-lg px-2 py-1 text-xs font-semibold" style={{ backgroundColor: 'white', color: '#333A2F' }}>
                            Score {item.matching.score}
                          </span>
                          {item.existingInvite?.status && (
                            <span className="rounded-lg px-2 py-1 text-xs font-semibold" style={{ backgroundColor: '#333A2F', color: 'white' }}>
                              Existing invite: {item.existingInvite.status}
                            </span>
                          )}
                        </div>
                        <p className="text-sm mb-2" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                          {item.candidate.profile?.desiredRole || item.candidate.email || 'Candidate profile'}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {(item.candidate.profile?.skills || []).slice(0, 6).map((skill) => (
                            <span key={`${item.candidate.id}-${skill}`} className="rounded-lg px-3 py-1 text-xs font-medium" style={{ backgroundColor: 'white', color: '#333A2F' }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs mb-3" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                          <span>City: {item.candidate.profile?.city || '—'}</span>
                          <span>Experience: {item.candidate.profile?.totalExperienceMonths || 0} months</span>
                          <span>Skill matches: {item.matching.skillMatchCount}</span>
                        </div>
                        <ul className="space-y-1">
                          {item.matching.reasons.map((reason) => (
                            <li key={`${item.candidate.id}-${reason}`} className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.75)' }}>
                              • {reason}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="lg:w-[180px]">
                        <Button
                          variant="hero"
                          className="w-full"
                          onClick={() => void handleSendInvite(item.candidate.id)}
                          disabled={invitesMutating || !selectedVacancyId}
                          style={{ backgroundColor: '#333A2F', color: 'white' }}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Send invite
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-lg p-6 sm:p-8" style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="font-heading text-2xl font-bold" style={{ color: '#333A2F' }}>
                  Invite History
                </h2>
                <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                  Latest HR invites from `/invites/hr`.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void loadHrInvites({ vacancyId: selectedVacancyId || undefined, limit: 20, offset: 0 })}
                disabled={invitesLoading}
                style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
              >
                Refresh
              </Button>
            </div>

            {invitesLoading && hrInvites.length === 0 ? (
              <p style={{ color: 'rgba(51, 58, 47, 0.7)' }}>Loading invite history...</p>
            ) : hrInvites.length === 0 ? (
              <p style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                No invites sent yet for the selected scope.
              </p>
            ) : (
              <div className="space-y-4">
                {hrInvites.map((invite) => (
                  <div key={invite.id} className="rounded-2xl border border-black/5 p-4" style={{ backgroundColor: '#F7F8F1' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold" style={{ color: '#333A2F' }}>
                          {invite.vacancy?.title || 'Vacancy'}
                        </p>
                        <p className="mt-1 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                          {getCandidateName(invite.candidate)}
                        </p>
                      </div>
                      <span className="rounded-lg px-2 py-1 text-xs font-semibold" style={{ backgroundColor: 'white', color: '#333A2F' }}>
                        {invite.status}
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
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
