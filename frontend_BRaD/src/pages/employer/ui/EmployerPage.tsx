import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Edit, Heart, Plus, Send, Trash2, Users } from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input, Textarea } from '@shared/ui';
import { isEmployerRole, useUserStore } from '@entities/user';
import {
  useVacancyStore,
  type Vacancy,
  type VacancyWorkflowStep,
} from '@entities/vacancy';
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
    requiredSkillsText: string;
    optionalSkillsText: string;
    niceToHaveSkillsText: string;
    requiredEducationLevel: string;
    requiredSkillLevelsText: string;
    minHoursPerWeek: string;
    maxHoursPerWeek: string;
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
    requiredSkillsText: '',
    optionalSkillsText: '',
    niceToHaveSkillsText: '',
    requiredEducationLevel: '',
    requiredSkillLevelsText: '',
    minHoursPerWeek: '',
    maxHoursPerWeek: '',
  },
  languages: {
    languageIds: [],
  },
};

const workflowStepOrder: VacancyWorkflowStep[] = [
  'basic',
  'conditions',
  'schedule',
  'address',
  'compensation',
  'description',
  'skills',
  'languages',
];

const educationLevelOptions = [
  'NONE',
  'SECONDARY',
  'VOCATIONAL',
  'BACHELOR',
  'MASTER',
  'PHD',
];

const skillLevelOptions = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

const skillBucketConfig = {
  requiredSkillsText: {
    label: 'Required skills',
    placeholder: 'Type or choose required skill',
    hint: 'Must-have skills for the role',
    accent: '#245338',
    surface: '#ECF5DE',
  },
  optionalSkillsText: {
    label: 'Optional skills',
    placeholder: 'Type or choose optional skill',
    hint: 'Good to have, but not mandatory',
    accent: '#6B4F10',
    surface: '#FFF8E4',
  },
  niceToHaveSkillsText: {
    label: 'Nice to have',
    placeholder: 'Type or choose bonus skill',
    hint: 'Extra advantage skills',
    accent: '#264A78',
    surface: '#EAF3FF',
  },
} as const;

type SkillBucketField = keyof typeof skillBucketConfig;

const hhInspiredPopularSkills = [
  'JavaScript',
  'TypeScript',
  'React',
  'Vue.js',
  'Angular',
  'Next.js',
  'Node.js',
  'Express',
  'NestJS',
  'Python',
  'Django',
  'FastAPI',
  'Java',
  'Spring Boot',
  'Kotlin',
  'C#',
  '.NET',
  'Go',
  'PHP',
  'Laravel',
  'Ruby on Rails',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'Kafka',
  'RabbitMQ',
  'GraphQL',
  'REST API',
  'Microservices',
  'Docker',
  'Kubernetes',
  'CI/CD',
  'Git',
  'Linux',
  'AWS',
  'Azure',
  'Google Cloud',
  'Terraform',
  'Ansible',
  'Figma',
  'UI/UX',
  'Product Analytics',
  'SQL',
  'Power BI',
  'Tableau',
  'Data Analysis',
  'Machine Learning',
  'PyTorch',
  'TensorFlow',
  'Communication',
  'English',
  'Scrum',
  'Agile',
  'Team Leadership',
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

const normalizeSkill = (value: string): string => {
  return value.replace(/\s+/g, ' ').trim();
};

const uniqueSkillList = (skills: string[]): string[] => {
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

const addArrayValue = (current: string[], value: string): string[] => {
  if (!value || current.includes(value)) {
    return current;
  }

  return [...current, value];
};

const formatWorkHourLabel = (value: string, fallbackLabel?: string): string => {
  const label = fallbackLabel || value;
  const hMatch = /^H(\d{1,2})$/i.exec(label.trim());
  if (!hMatch) {
    return label;
  }

  const hours = Number(hMatch[1]);
  if (!Number.isFinite(hours) || hours <= 0) {
    return label;
  }

  return `${hours} hours/day`;
};

const mapFromSkillLevelsText = (value: string): Record<string, string> => {
  const result: Record<string, string> = {};

  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [rawSkill, rawLevel] = line.split(':');
      const skill = rawSkill?.trim().toLowerCase();
      const level = rawLevel?.trim().toUpperCase();

      if (!skill || !level) {
        return;
      }

      if (!['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(level)) {
        return;
      }

      result[skill] = level;
    });

  return result;
};

const mapToSkillLevelsText = (value?: Record<string, string>): string => {
  if (!value || typeof value !== 'object') {
    return '';
  }

  return Object.entries(value)
    .map(([skill, level]) => `${skill}:${String(level).toUpperCase()}`)
    .join('\n');
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
  next.skills.requiredSkillsText = Array.isArray(vacancy.requiredSkills)
    ? vacancy.requiredSkills.join(', ')
    : '';
  next.skills.optionalSkillsText = Array.isArray(vacancy.optionalSkills)
    ? vacancy.optionalSkills.join(', ')
    : '';
  next.skills.niceToHaveSkillsText = Array.isArray(vacancy.niceToHaveSkills)
    ? vacancy.niceToHaveSkills.join(', ')
    : '';
  next.skills.requiredEducationLevel = String(vacancy.requiredEducationLevel || '');
  next.skills.requiredSkillLevelsText = mapToSkillLevelsText(vacancy.requiredSkillLevels);
  next.skills.minHoursPerWeek = String(vacancy.minHoursPerWeek ?? '');
  next.skills.maxHoursPerWeek = String(vacancy.maxHoursPerWeek ?? '');

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
        requiredSkills: listFromText(String(formData.skills.requiredSkillsText || '')),
        optionalSkills: listFromText(String(formData.skills.optionalSkillsText || '')),
        niceToHaveSkills: listFromText(String(formData.skills.niceToHaveSkillsText || '')),
        requiredEducationLevel: formData.skills.requiredEducationLevel || undefined,
        requiredSkillLevels: mapFromSkillLevelsText(formData.skills.requiredSkillLevelsText),
        minHoursPerWeek: toNumberOrUndefined(formData.skills.minHoursPerWeek),
        maxHoursPerWeek: toNumberOrUndefined(formData.skills.maxHoursPerWeek),
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

const formatPercent = (value?: number): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }

  return `${Math.round(value)}%`;
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
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [wizardSuccess, setWizardSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<VacancyWizardData>(() => cloneEmptyWizardData());
  const [skillDrafts, setSkillDrafts] = useState<Record<SkillBucketField, string>>({
    requiredSkillsText: '',
    optionalSkillsText: '',
    niceToHaveSkillsText: '',
  });
  const [selectedVacancyId, setSelectedVacancyId] = useState('');
  const [inviteMessage, setInviteMessage] = useState(
    'Ваш опыт подходит под вакансию. Будем рады обсудить детали на интервью.',
  );
  const [interviewAt, setInterviewAt] = useState('');

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

  const allSkillOptions = useMemo(() => {
    const merged = [
      ...dictionaries.skillHints.map((skill) => skill.label),
      ...hhInspiredPopularSkills,
    ];

    return uniqueSkillList(merged)
      .map((item) => normalizeSkill(item))
      .sort((a, b) => a.localeCompare(b));
  }, [dictionaries.skillHints]);

  const languageOptions = dictionaries.languages;

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

  const readSkillBucket = (field: SkillBucketField): string[] => {
    return uniqueSkillList(listFromText(formData.skills[field]).map((item) => normalizeSkill(item)));
  };

  const writeSkillBucket = (field: SkillBucketField, next: string[]) => {
    updateField('skills', field, uniqueSkillList(next).join(', '));
  };

  const addSkillToBucket = (field: SkillBucketField, rawSkill: string) => {
    const skill = normalizeSkill(rawSkill);
    if (!skill) {
      return;
    }

    const current = readSkillBucket(field);
    if (current.some((entry) => entry.toLowerCase() === skill.toLowerCase())) {
      return;
    }

    writeSkillBucket(field, [...current, skill]);
  };

  const removeSkillFromBucket = (field: SkillBucketField, skillToRemove: string) => {
    const next = readSkillBucket(field).filter(
      (skill) => skill.toLowerCase() !== skillToRemove.toLowerCase(),
    );
    writeSkillBucket(field, next);
  };

  const commitSkillDraft = (field: SkillBucketField) => {
    const draft = skillDrafts[field];
    if (!draft.trim()) {
      return;
    }

    addSkillToBucket(field, draft);
    setSkillDrafts((prev) => ({ ...prev, [field]: '' }));
  };

  const setRequiredSkillLevel = (skill: string, level: string) => {
    const key = skill.toLowerCase();
    const current = mapFromSkillLevelsText(formData.skills.requiredSkillLevelsText);

    if (!level) {
      delete current[key];
    } else {
      current[key] = level;
    }

    updateField('skills', 'requiredSkillLevelsText', mapToSkillLevelsText(current));
  };

  const handleCreate = () => {
    clearCurrent();
    setFormData(cloneEmptyWizardData());
    setSkillDrafts({
      requiredSkillsText: '',
      optionalSkillsText: '',
      niceToHaveSkillsText: '',
    });
    setShowWizard(true);
    setWizardError(null);
    setWizardSuccess('Fill any fields you need and save when ready');
    if (!isDictionariesLoading && dictionaries.cities.length === 0) {
      void loadDictionaries();
    }
  };

  const handleEdit = async (vacancyId: string) => {
    setWizardError(null);
    setWizardSuccess(null);

    try {
      await loadVacancy(vacancyId);
      setShowWizard(true);
    } catch (loadingError) {
      setWizardError(
        loadingError instanceof Error ? loadingError.message : 'Failed to open vacancy',
      );
    }
  };

  const handleClose = () => {
    setShowWizard(false);
    setWizardError(null);
    setWizardSuccess(null);
    setSkillDrafts({
      requiredSkillsText: '',
      optionalSkillsText: '',
      niceToHaveSkillsText: '',
    });
    clearCurrent();
  };

  const handleSaveVacancy = async () => {
    setWizardError(null);
    setWizardSuccess(null);

    try {
      if (!currentVacancyId) {
        await createDraft({
          title: formData.basic.title.trim() || 'Untitled vacancy',
          specializationIds: formData.basic.specializationIds,
          experienceLevel: formData.basic.experienceLevel || undefined,
          hiringPlan: toNumberOrUndefined(formData.basic.hiringPlan),
        });
      }

      let savedSections = 0;
      for (const step of workflowStepOrder) {
        const payload = getStepPayload(step, formData);
        if (Object.keys(payload).length === 0) {
          continue;
        }

        await saveStep(step, payload);
        savedSections += 1;
      }

      await loadMyVacancies();
      setWizardSuccess(
        savedSections > 0
          ? `Vacancy saved. Updated sections: ${savedSections}`
          : 'Draft saved. You can leave optional fields empty.',
      );
    } catch (saveError) {
      setWizardError(
        saveError instanceof Error
          ? saveError.message
          : 'Failed to save vacancy',
      );
    }
  };

  const handlePublish = async () => {
    setWizardError(null);
    setWizardSuccess(null);

    try {
      if (!currentVacancyId) {
        await createDraft({
          title: formData.basic.title.trim() || 'Untitled vacancy',
          specializationIds: formData.basic.specializationIds,
          experienceLevel: formData.basic.experienceLevel || undefined,
          hiringPlan: toNumberOrUndefined(formData.basic.hiringPlan),
        });
      }
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
      <div className="min-h-screen app-shell app-page">
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
    <div className="min-h-screen app-shell app-page">
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
          <div className="rounded-3xl p-6 sm:p-8 mb-6 border" style={{ borderColor: 'rgba(51, 58, 47, 0.12)', background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FBF5 100%)' }}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <h2 className="font-heading text-2xl sm:text-3xl font-bold" style={{ color: '#1F2A1A' }}>
                  Vacancy Builder
                </h2>
                <p className="text-sm mt-1" style={{ color: 'rgba(31, 42, 26, 0.65)' }}>
                  One page form. Fill fields in any order. Salary and other blocks are optional.
                </p>
                <p className="text-xs mt-2" style={{ color: 'rgba(31, 42, 26, 0.55)' }}>
                  Draft ID: {currentVacancy?.id || 'will be created after first save'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="hero"
                  onClick={() => void handleSaveVacancy()}
                  disabled={isSaving}
                  style={{ backgroundColor: '#204B35', color: 'white' }}
                >
                  Save vacancy
                </Button>
                <Button
                  type="button"
                  variant="hero"
                  onClick={() => void handlePublish()}
                  disabled={isSaving}
                  style={{ backgroundColor: '#166534', color: 'white' }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Publish
                </Button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg border-2 text-sm font-medium"
                  style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <section className="rounded-2xl border bg-white p-5" style={{ borderColor: 'rgba(51, 58, 47, 0.12)' }}>
                <h3 className="font-heading text-lg font-semibold mb-4" style={{ color: '#243227' }}>Basic</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Vacancy title</label>
                    <Input
                      value={formData.basic.title}
                      onChange={(event) => updateField('basic', 'title', event.target.value)}
                      placeholder="Frontend Developer Intern"
                      className="h-12"
                      style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Experience level</label>
                      <select
                        value={formData.basic.experienceLevel}
                        onChange={(event) => updateField('basic', 'experienceLevel', event.target.value)}
                        className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                      >
                        <option value="">Not specified</option>
                        {dictionaries.experienceLevels.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Hiring plan</label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.basic.hiringPlan}
                        onChange={(event) => updateField('basic', 'hiringPlan', event.target.value)}
                        className="h-12"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Specializations</label>
                    {dictionaries.specializations.length === 0 ? (
                      <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                        {isDictionariesLoading ? 'Loading specializations...' : 'Optional field. You can skip it.'}
                      </p>
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
                                borderColor: selected ? '#204B35' : 'rgba(51, 58, 47, 0.2)',
                                backgroundColor: selected ? '#204B35' : '#ffffff',
                                color: selected ? '#ffffff' : '#333A2F',
                              }}
                              onClick={() =>
                                updateField('basic', 'specializationIds', toggleArrayValue(formData.basic.specializationIds, option.value))
                              }
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border bg-white p-5" style={{ borderColor: 'rgba(51, 58, 47, 0.12)' }}>
                <h3 className="font-heading text-lg font-semibold mb-4" style={{ color: '#243227' }}>Conditions</h3>
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Worker kind</label>
                      <select
                        value={formData.conditions.workerKind}
                        onChange={(event) => updateField('conditions', 'workerKind', event.target.value)}
                        className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                      >
                        <option value="">Not specified</option>
                        {dictionaries.workerKinds.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Employment type</label>
                      <select
                        value={formData.conditions.employmentType}
                        onChange={(event) => updateField('conditions', 'employmentType', event.target.value)}
                        className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                      >
                        <option value="">Not specified</option>
                        {dictionaries.employmentTypes.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Work formats</label>
                    <div className="flex flex-wrap gap-2">
                      {dictionaries.workFormats.map((option) => {
                        const selected = formData.conditions.workFormats.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className="px-3 py-1 rounded-lg text-xs border"
                            style={{
                              borderColor: selected ? '#204B35' : 'rgba(51, 58, 47, 0.2)',
                              backgroundColor: selected ? '#204B35' : '#ffffff',
                              color: selected ? '#ffffff' : '#333A2F',
                            }}
                            onClick={() =>
                              updateField('conditions', 'workFormats', toggleArrayValue(formData.conditions.workFormats, option.value))
                            }
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border bg-white p-5 xl:col-span-2" style={{ borderColor: 'rgba(51, 58, 47, 0.12)' }}>
                <h3 className="font-heading text-lg font-semibold mb-4" style={{ color: '#243227' }}>Schedule</h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <section className="rounded-2xl border p-4" style={{ borderColor: 'rgba(51, 58, 47, 0.15)', backgroundColor: '#F6F8F1' }}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <label className="block text-sm font-semibold" style={{ color: '#2D4A37' }}>Schedules</label>
                      {formData.schedule.schedules.length > 0 && (
                        <button type="button" className="text-xs" style={{ color: '#4B5563' }} onClick={() => updateField('schedule', 'schedules', [])}>Clear</button>
                      )}
                    </div>
                    <select
                      value=""
                      onChange={(event) => {
                        const value = event.target.value;
                        if (!value) return;
                        updateField('schedule', 'schedules', addArrayValue(formData.schedule.schedules, value));
                      }}
                      className="flex h-11 w-full rounded-xl border px-3 py-2 text-sm mb-3"
                      style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F', backgroundColor: '#ffffff' }}
                    >
                      <option value="">Choose schedule type</option>
                      {dictionaries.schedules.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-2">
                      {formData.schedule.schedules.length === 0 && <span className="text-xs" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>No schedules selected.</span>}
                      {formData.schedule.schedules.map((value) => {
                        const label = dictionaries.schedules.find((item) => item.value === value)?.label || value;
                        return (
                          <button
                            key={`schedule-${value}`}
                            type="button"
                            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                            style={{ backgroundColor: '#ffffff', color: '#2D4A37', border: '1px solid rgba(45, 74, 55, 0.2)' }}
                            onClick={() => updateField('schedule', 'schedules', formData.schedule.schedules.filter((item) => item !== value))}
                          >
                            {label}
                            <span aria-hidden>×</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="rounded-2xl border p-4" style={{ borderColor: 'rgba(51, 58, 47, 0.15)', backgroundColor: '#F6F8F1' }}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <label className="block text-sm font-semibold" style={{ color: '#2D4A37' }}>Work hours</label>
                      {formData.schedule.workHours.length > 0 && (
                        <button type="button" className="text-xs" style={{ color: '#4B5563' }} onClick={() => updateField('schedule', 'workHours', [])}>Clear</button>
                      )}
                    </div>
                    <select
                      value=""
                      onChange={(event) => {
                        const value = event.target.value;
                        if (!value) return;
                        updateField('schedule', 'workHours', addArrayValue(formData.schedule.workHours, value));
                      }}
                      className="flex h-11 w-full rounded-xl border px-3 py-2 text-sm mb-3"
                      style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F', backgroundColor: '#ffffff' }}
                    >
                      <option value="">Choose work hours</option>
                      {dictionaries.workHours.map((option) => (
                        <option key={option.value} value={option.value}>
                          {formatWorkHourLabel(option.value, option.label)}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-2">
                      {formData.schedule.workHours.length === 0 && <span className="text-xs" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>No work hours selected.</span>}
                      {formData.schedule.workHours.map((value) => {
                        const option = dictionaries.workHours.find((item) => item.value === value);
                        const label = formatWorkHourLabel(value, option?.label || value);
                        return (
                          <button
                            key={`work-hours-${value}`}
                            type="button"
                            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                            style={{ backgroundColor: '#ffffff', color: '#2D4A37', border: '1px solid rgba(45, 74, 55, 0.2)' }}
                            onClick={() => updateField('schedule', 'workHours', formData.schedule.workHours.filter((item) => item !== value))}
                          >
                            {label}
                            <span aria-hidden>×</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </section>

              <section className="rounded-2xl border bg-white p-5" style={{ borderColor: 'rgba(51, 58, 47, 0.12)' }}>
                <h3 className="font-heading text-lg font-semibold mb-4" style={{ color: '#243227' }}>Address</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Publication city</label>
                    <select
                      value={formData.address.publicationCityId}
                      onChange={(event) => updateField('address', 'publicationCityId', event.target.value)}
                      className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                    >
                      <option value="">Not specified</option>
                      {dictionaries.cities.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Work address</label>
                    <Input
                      value={formData.address.workAddress}
                      onChange={(event) => updateField('address', 'workAddress', event.target.value)}
                      placeholder="Abylai Khan Ave 123"
                      className="h-12"
                      style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm" style={{ color: '#333A2F' }}>
                    <input
                      type="checkbox"
                      checked={formData.address.hideWorkAddress}
                      onChange={(event) => updateField('address', 'hideWorkAddress', event.target.checked)}
                    />
                    Hide exact address in public vacancy
                  </label>
                </div>
              </section>

              <section className="rounded-2xl border bg-white p-5" style={{ borderColor: 'rgba(51, 58, 47, 0.12)' }}>
                <h3 className="font-heading text-lg font-semibold mb-4" style={{ color: '#243227' }}>Compensation (optional)</h3>
                <p className="text-xs mb-3" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                  You can leave salary fields empty.
                </p>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Salary from</label>
                      <Input
                        type="number"
                        value={formData.compensation.salaryFrom}
                        onChange={(event) => updateField('compensation', 'salaryFrom', event.target.value)}
                        className="h-12"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Salary to</label>
                      <Input
                        type="number"
                        value={formData.compensation.salaryTo}
                        onChange={(event) => updateField('compensation', 'salaryTo', event.target.value)}
                        className="h-12"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Currency</label>
                      <select
                        value={formData.compensation.currency}
                        onChange={(event) => updateField('compensation', 'currency', event.target.value)}
                        className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                      >
                        {dictionaries.currencies.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Salary period</label>
                      <select
                        value={formData.compensation.salaryPeriod}
                        onChange={(event) => updateField('compensation', 'salaryPeriod', event.target.value)}
                        className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                      >
                        <option value="">Not specified</option>
                        {dictionaries.salaryPeriods.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Tax mode</label>
                      <select
                        value={formData.compensation.salaryTaxMode}
                        onChange={(event) => updateField('compensation', 'salaryTaxMode', event.target.value)}
                        className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                      >
                        <option value="">Not specified</option>
                        {dictionaries.salaryTaxModes.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Payout frequency</label>
                      <select
                        value={formData.compensation.payoutFrequency}
                        onChange={(event) => updateField('compensation', 'payoutFrequency', event.target.value)}
                        className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                      >
                        <option value="">Not specified</option>
                        {dictionaries.payoutFrequencies.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-2xl border bg-white p-5 mt-4" style={{ borderColor: 'rgba(51, 58, 47, 0.12)' }}>
              <h3 className="font-heading text-lg font-semibold mb-4" style={{ color: '#243227' }}>Description</h3>
              <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Vacancy description (max 200 chars)</label>
              <Textarea
                rows={5}
                maxLength={200}
                value={formData.description.description}
                onChange={(event) => updateField('description', 'description', event.target.value)}
                placeholder="Describe role in up to 200 chars"
                style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
              />
              <p className="text-xs mt-1" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                {formData.description.description.length}/200
              </p>
            </section>

            <section className="rounded-2xl border bg-white p-5 mt-4" style={{ borderColor: 'rgba(51, 58, 47, 0.12)' }}>
              <h3 className="font-heading text-lg font-semibold mb-4" style={{ color: '#243227' }}>Skills</h3>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Legacy skills (compatibility)</label>
                <Textarea
                  rows={4}
                  value={formData.skills.skillsText}
                  onChange={(event) => updateField('skills', 'skillsText', event.target.value)}
                  placeholder="React, TypeScript, REST API"
                  style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3 mt-4">
                {(Object.keys(skillBucketConfig) as SkillBucketField[]).map((field) => {
                  const config = skillBucketConfig[field];
                  const selectedSkills = readSkillBucket(field);
                  const selectedSet = new Set(selectedSkills.map((skill) => skill.toLowerCase()));
                  const availableOptions = allSkillOptions.filter((skill) => !selectedSet.has(skill.toLowerCase()));
                  const searchValue = skillDrafts[field].trim().toLowerCase();
                  const filteredOptions = searchValue
                    ? availableOptions.filter((skill) => skill.toLowerCase().includes(searchValue)).slice(0, 14)
                    : availableOptions.slice(0, 14);

                  return (
                    <div key={field} className="rounded-2xl border p-4" style={{ borderColor: 'rgba(51, 58, 47, 0.15)', backgroundColor: config.surface }}>
                      <label className="block text-sm font-semibold mb-1" style={{ color: config.accent }}>{config.label}</label>
                      <p className="text-xs mb-3" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>{config.hint}</p>

                      <div className="flex gap-2 mb-3">
                        <Input
                          value={skillDrafts[field]}
                          onChange={(event) => setSkillDrafts((prev) => ({ ...prev, [field]: event.target.value }))}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              commitSkillDraft(field);
                            }
                          }}
                          placeholder={config.placeholder}
                          className="h-11"
                          style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                        />
                        <Button type="button" variant="outline" onClick={() => commitSkillDraft(field)} style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}>
                          Add
                        </Button>
                      </div>

                      <div className="mb-3">
                        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                          Skill list
                        </div>
                        <div className="max-h-36 overflow-y-auto rounded-xl border p-2" style={{ borderColor: 'rgba(51, 58, 47, 0.15)', backgroundColor: '#ffffff' }}>
                          {filteredOptions.length === 0 ? (
                            <div className="px-2 py-1 text-xs" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                              Nothing found. Type custom skill and click Add.
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {filteredOptions.map((skill) => (
                                <button
                                  key={`${field}-search-${skill}`}
                                  type="button"
                                  className="rounded-full border px-2.5 py-1 text-xs"
                                  style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#2D4A37', backgroundColor: '#F9FBF7' }}
                                  onClick={() => addSkillToBucket(field, skill)}
                                >
                                  {skill}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedSkills.length === 0 ? (
                        <p className="text-xs" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>No skills selected yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selectedSkills.map((skill) => (
                            <button
                              key={`${field}-chip-${skill}`}
                              type="button"
                              onClick={() => removeSkillFromBucket(field, skill)}
                              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                              style={{ backgroundColor: '#ffffff', color: config.accent, border: '1px solid rgba(51, 58, 47, 0.15)' }}
                              title="Remove skill"
                            >
                              {skill}
                              <span aria-hidden>×</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 md:grid-cols-3 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Required education level</label>
                  <select
                    value={formData.skills.requiredEducationLevel}
                    onChange={(event) => updateField('skills', 'requiredEducationLevel', event.target.value)}
                    className="flex h-12 w-full rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F' }}
                  >
                    <option value="">No restriction</option>
                    {educationLevelOptions.map((option) => (
                      <option key={option} value={option}>{formatEnumLabel(option)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Min hours/week</label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.skills.minHoursPerWeek}
                    onChange={(event) => updateField('skills', 'minHoursPerWeek', event.target.value)}
                    className="h-12"
                    style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>Max hours/week</label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.skills.maxHoursPerWeek}
                    onChange={(event) => updateField('skills', 'maxHoursPerWeek', event.target.value)}
                    className="h-12"
                    style={{ borderColor: 'rgba(51, 58, 47, 0.2)', borderRadius: '0.75rem' }}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-2" style={{ color: '#333A2F' }}>
                  Required skill levels
                </label>
                <p className="text-xs mb-3" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                  Choose level for each required skill.
                </p>

                {readSkillBucket('requiredSkillsText').length === 0 ? (
                  <div className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(51, 58, 47, 0.15)', color: 'rgba(51, 58, 47, 0.7)' }}>
                    Add required skills first, then set levels here.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {readSkillBucket('requiredSkillsText').map((skill) => {
                      const skillKey = skill.toLowerCase();
                      const currentLevel = mapFromSkillLevelsText(formData.skills.requiredSkillLevelsText)[skillKey] || '';

                      return (
                        <div
                          key={`required-level-${skillKey}`}
                          className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr,220px]"
                          style={{ borderColor: 'rgba(51, 58, 47, 0.15)', backgroundColor: '#FAFCF8' }}
                        >
                          <div className="text-sm font-medium self-center" style={{ color: '#2B3A30' }}>
                            {skill}
                          </div>
                          <select
                            value={currentLevel}
                            onChange={(event) => setRequiredSkillLevel(skill, event.target.value)}
                            className="flex h-11 w-full rounded-lg border px-3 py-2 text-sm"
                            style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F', backgroundColor: '#ffffff' }}
                          >
                            <option value="">Not specified</option>
                            {skillLevelOptions.map((levelOption) => (
                              <option key={`${skillKey}-${levelOption.value}`} value={levelOption.value}>
                                {levelOption.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-5 mt-4" style={{ borderColor: 'rgba(51, 58, 47, 0.12)' }}>
              <h3 className="font-heading text-lg font-semibold mb-4" style={{ color: '#243227' }}>Languages</h3>
              {languageOptions.length === 0 ? (
                <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>No languages in dictionary.</p>
              ) : (
                <div className="space-y-3">
                  <select
                    value=""
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!value) return;
                      updateField('languages', 'languageIds', toggleArrayValue(formData.languages.languageIds, value));
                    }}
                    className="w-full rounded-xl border px-4 py-3 text-sm"
                    style={{ borderColor: 'rgba(51, 58, 47, 0.2)', color: '#333A2F', backgroundColor: '#ffffff' }}
                  >
                    <option value="">Choose language</option>
                    {languageOptions.map((language) => (
                      <option key={language.value} value={language.value}>{language.label}</option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    {formData.languages.languageIds.map((languageId) => {
                      const option = languageOptions.find((entry) => entry.value === languageId);
                      const label = option?.label || languageId;
                      return (
                        <button
                          key={languageId}
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                          style={{ backgroundColor: '#EBEDDF', color: '#333A2F' }}
                          onClick={() => updateField('languages', 'languageIds', formData.languages.languageIds.filter((id) => id !== languageId))}
                        >
                          {label}
                          <span aria-hidden>×</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
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
                Create a vacancy in one form and publish when ready.
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
                            Score {item.matching.normalizedScore ?? item.matching.score}
                          </span>
                          <span className="rounded-lg px-2 py-1 text-xs font-semibold" style={{ backgroundColor: '#ECF5DE', color: '#245338' }}>
                            Coverage {formatPercent(item.matching.skillCoveragePercent)}
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
                          <span>Profile completeness: {formatPercent(item.matching.profileCompletenessPercent || item.candidate.profile?.profileCompletenessPercent)}</span>
                          {typeof item.matching.skillMatchCount === 'number' && (
                            <span>Legacy skill matches: {item.matching.skillMatchCount}</span>
                          )}
                        </div>

                        {Boolean(item.matching.matchedRequiredSkills?.length || item.matching.missingRequiredSkills?.length) && (
                          <div className="mb-3 space-y-2">
                            {Boolean(item.matching.matchedRequiredSkills?.length) && (
                              <div className="text-xs" style={{ color: '#2B5A41' }}>
                                Matched required: {(item.matching.matchedRequiredSkills || []).join(', ')}
                              </div>
                            )}
                            {Boolean(item.matching.missingRequiredSkills?.length) && (
                              <div className="text-xs" style={{ color: '#9A3412' }}>
                                Missing required: {(item.matching.missingRequiredSkills || []).join(', ')}
                              </div>
                            )}
                          </div>
                        )}

                        {item.matching.breakdown && (
                          <div className="mb-3 grid gap-2 sm:grid-cols-3 text-xs">
                            <span>Skills: {formatPercent(item.matching.breakdown.skills)}</span>
                            <span>Experience: {formatPercent(item.matching.breakdown.experienceRelevance)}</span>
                            <span>Compatibility: {formatPercent(item.matching.breakdown.compatibility)}</span>
                            <span>Completeness: {formatPercent(item.matching.breakdown.profileCompleteness)}</span>
                            <span>Activity: {formatPercent(item.matching.breakdown.activityRecency)}</span>
                            <span>Penalties: {item.matching.breakdown.penalties ?? 0}</span>
                          </div>
                        )}

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
