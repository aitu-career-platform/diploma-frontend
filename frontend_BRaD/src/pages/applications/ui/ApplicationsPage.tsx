import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Filter,
  MessageSquare,
  MapPin,
  RefreshCcw,
  Search,
  Shield,
  UserRound,
  X,
} from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input, Textarea } from '@shared/ui';
import { useUISettings } from '@shared/lib/ui-settings';
import {
  useApplicationStore,
  type Application,
  type ApplicationFilters,
  type ApplicationStatus,
} from '@entities/application';
import { useVacancyStore, type Vacancy } from '@entities/vacancy';
import { isAdminRole, isCandidateRole, isHrRole, useUserStore } from '@entities/user';
import { useMediaStore } from '@entities/media';

const applicationStatuses: ApplicationStatus[] = [
  'SUBMITTED',
  'REVIEWED',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
];

const manageableStatuses: ApplicationStatus[] = [
  'SUBMITTED',
  'REVIEWED',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
];

const cardStyle = {
  backgroundColor: 'var(--surface-base)',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
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

const toDateTimeLocalValue = (value?: string): string => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const formatEnumLabel = (status?: string): string => {
  return String(status || 'UNKNOWN')
    .toLowerCase()
    .split('_')
    .map((chunk) => `${chunk.slice(0, 1).toUpperCase()}${chunk.slice(1)}`)
    .join(' ');
};

const formatVacancySummary = (vacancy: Vacancy): string => {
  const parts: string[] = [];

  if (vacancy.status) {
    parts.push(formatEnumLabel(vacancy.status));
  }

  if (vacancy.workAddress) {
    parts.push(vacancy.workAddress);
  }

  const salaryFrom = typeof vacancy.salaryFrom === 'number' ? vacancy.salaryFrom.toLocaleString() : '';
  const salaryTo = typeof vacancy.salaryTo === 'number' ? vacancy.salaryTo.toLocaleString() : '';
  const salaryRange = salaryFrom && salaryTo ? `${salaryFrom}–${salaryTo}` : salaryFrom || salaryTo;

  if (salaryRange) {
    parts.push(`${salaryRange}${vacancy.currency ? ` ${vacancy.currency}` : ''}`);
  }

  return parts.join(' · ');
};

const getVacancySearchableText = (vacancy: Vacancy): string => {
  return [
    vacancy.title,
    vacancy.status,
    vacancy.workAddress || '',
    vacancy.description || '',
    formatVacancySummary(vacancy),
  ]
    .join(' ')
    .toLowerCase();
};

const getApplicationCandidateName = (application: Application): string => {
  const firstName = application.candidate?.firstName || '';
  const lastName = application.candidate?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || application.candidate?.email || 'Unknown candidate';
};

const getApplicationCandidateSearchText = (application: Application): string => {
  return [
    getApplicationCandidateName(application),
    application.candidate?.email || '',
    application.candidate?.phone || '',
  ]
    .join(' ')
    .toLowerCase();
};

const getCandidateName = (application: Application, fallback: string): string => {
  const firstName = application.candidate?.firstName || '';
  const lastName = application.candidate?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || application.candidate?.email || fallback;
};

const getTimelineActor = (event: {
  actor?: { firstName?: string; lastName?: string; email?: string } | null;
}, fallback: string): string => {
  const firstName = event.actor?.firstName || '';
  const lastName = event.actor?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || event.actor?.email || fallback;
};

const getPrimaryResume = (application: Application) => {
  const resumes = application.candidate?.profile?.resumes || [];

  return resumes.find((resume) => resume.isPrimary) || resumes[0] || null;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);
};

const toSkillLevelPairs = (value: unknown): Array<{ skill: string; level: string }> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([skill, level]) => {
    if (!skill.trim() || typeof level !== 'string' || !level.trim()) {
      return [];
    }

    return [{ skill: skill.trim(), level: level.trim() }];
  });
};

const formatToken = (value?: string): string => {
  if (!value) {
    return '—';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
};

const getCandidateSkills = (application: Application): string[] => {
  const profile = application.candidate?.profile;
  if (!profile) {
    return [];
  }

  const sourceSkills = [
    ...toStringArray(profile.skills),
    ...toStringArray(profile.skillTexts),
    ...toStringArray(profile.skill_tags),
  ];

  return Array.from(new Set(sourceSkills));
};

const getCandidateSkillLevels = (application: Application): Array<{ skill: string; level: string }> => {
  const profile = application.candidate?.profile;
  if (!profile) {
    return [];
  }

  const fromSkillLevels = toSkillLevelPairs(profile.skillLevels);
  if (fromSkillLevels.length > 0) {
    return fromSkillLevels;
  }

  return toSkillLevelPairs(profile.requiredSkillLevels);
};

export const ApplicationsPage = () => {
  const { t } = useUISettings();
  const navigate = useNavigate();
  const { applicationId } = useParams<{ applicationId?: string }>();
  const { currentUser, isAuthenticated } = useUserStore();
  const { vacancies, loadMyVacancies, isLoading: isVacanciesLoading } = useVacancyStore();
  const {
    items,
    meta,
    timelines,
    selectedApplication,
    isLoading,
    isMutating,
    error,
    listApplications,
    loadApplication,
    loadTimeline,
    withdrawApplication,
    updateStatus,
    clearSelection,
  } = useApplicationStore();
  const { getDownloadUrl } = useMediaStore();
  const vacancyDropdownRef = useRef<HTMLDivElement | null>(null);

  const [statusNote, setStatusNote] = useState('');
  const [nextStatus, setNextStatus] = useState<ApplicationStatus>('REVIEWED');
  const [filters, setFilters] = useState<ApplicationFilters>({
    status: '',
    limit: 20,
    offset: 0,
  });
  const [vacancySearch, setVacancySearch] = useState('');
  const [vacancyMenuOpen, setVacancyMenuOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [candidatePreviewApplication, setCandidatePreviewApplication] = useState<Application | null>(
    null,
  );

  const isCandidate = isCandidateRole(currentUser?.role);
  const isHr = isHrRole(currentUser?.role);
  const isAdmin = isAdminRole(currentUser?.role);
  const canViewPage = isAuthenticated && (isCandidate || isHr || isAdmin);
  const isDetailPage = Boolean(applicationId);

  const currentTimeline = selectedApplication ? timelines[selectedApplication.id] : null;
  const getStatusLabel = (status?: string): string => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'SUBMITTED') {
      return t('applications.status.submitted');
    }
    if (normalized === 'REVIEWED') {
      return t('applications.status.reviewed');
    }
    if (normalized === 'INTERVIEW') {
      return t('applications.status.interview');
    }
    if (normalized === 'OFFER') {
      return t('applications.status.offer');
    }
    if (normalized === 'REJECTED') {
      return t('applications.status.rejected');
    }
    if (normalized === 'WITHDRAWN') {
      return t('applications.status.withdrawn');
    }
    if (normalized) {
      return formatEnumLabel(normalized);
    }
    return t('applications.status.unknown');
  };

  const visibleApplications = useMemo(() => {
    const needle = candidateSearch.trim().toLowerCase();
    if (!needle) {
      return items;
    }

    return items.filter((application) => getApplicationCandidateSearchText(application).includes(needle));
  }, [candidateSearch, items]);

  const formatFlagLabel = (value: unknown): string => {
    if (value === true) {
      return t('common.yes');
    }
    if (value === false) {
      return t('common.no');
    }
    return '—';
  };

  const scopeLabel = useMemo(() => {
    if (isAdmin) {
      return t('applications.scopeAdmin');
    }

    if (isHr) {
      return t('applications.scopeHr');
    }

    return t('applications.scopeCandidate');
  }, [isAdmin, isHr, t]);

  const selectedVacancy = useMemo(() => {
    if (!filters.vacancyId) {
      return null;
    }

    return vacancies.find((vacancy) => vacancy.id === filters.vacancyId) || null;
  }, [filters.vacancyId, vacancies]);

  const filteredVacancies = useMemo(() => {
    const sortedVacancies = [...vacancies].sort((left, right) => {
      const leftUpdatedAt = new Date(left.updatedAt || left.createdAt || 0).getTime();
      const rightUpdatedAt = new Date(right.updatedAt || right.createdAt || 0).getTime();

      if (rightUpdatedAt !== leftUpdatedAt) {
        return rightUpdatedAt - leftUpdatedAt;
      }

      return left.title.localeCompare(right.title);
    });

    const needle = vacancySearch.trim().toLowerCase();
    if (!needle) {
      return sortedVacancies;
    }

    return sortedVacancies.filter((vacancy) => getVacancySearchableText(vacancy).includes(needle));
  }, [vacancies, vacancySearch]);

  const activeFilters = useMemo(() => {
    const entries: Array<{ key: keyof ApplicationFilters; label: string; value: string }> = [];

    if (filters.status) {
      entries.push({ key: 'status', label: t('applications.filter.status'), value: getStatusLabel(filters.status) });
    }
    if (filters.vacancyId) {
      entries.push({
        key: 'vacancyId',
        label: t('applications.filter.vacancy'),
        value: selectedVacancy?.title || filters.vacancyId,
      });
    }
    if (filters.candidateId) {
      entries.push({ key: 'candidateId', label: t('applications.filter.candidateId'), value: filters.candidateId });
    }
    if (filters.hrUserId) {
      entries.push({ key: 'hrUserId', label: t('applications.filter.hrUserId'), value: filters.hrUserId });
    }
    if (filters.dateFrom) {
      entries.push({ key: 'dateFrom', label: t('applications.filter.dateFromShort'), value: formatDateTime(filters.dateFrom) });
    }
    if (filters.dateTo) {
      entries.push({ key: 'dateTo', label: t('applications.filter.dateToShort'), value: formatDateTime(filters.dateTo) });
    }

    return entries;
  }, [filters, selectedVacancy, t]);

  const removeFilter = (key: keyof ApplicationFilters) => {
    setFilters((prev) => ({
      ...prev,
      [key]: key === 'status' ? '' : undefined,
    }));

    if (key === 'vacancyId') {
      setVacancySearch('');
    }
  };

  const closeCandidatePreview = () => {
    setCandidatePreviewApplication(null);
  };

  const openCandidatePreview = (application: Application) => {
    setCandidatePreviewApplication(application);
  };

  const refreshList = async (nextFilters: ApplicationFilters = filters) => {
    if (!currentUser) {
      return;
    }

    setPageError(null);

    try {
      await listApplications(currentUser.role, nextFilters);
    } catch (loadError) {
      setPageError(loadError instanceof Error ? loadError.message : t('applications.error.loadList'));
    }
  };

  useEffect(() => {
    if (!canViewPage || !currentUser) {
      return;
    }

    void refreshList();
  }, [canViewPage, currentUser]);

  useEffect(() => {
    if (!canViewPage || isCandidate) {
      return;
    }

    void loadMyVacancies();
  }, [canViewPage, isCandidate, loadMyVacancies]);

  useEffect(() => {
    if (!filters.vacancyId) {
      setVacancySearch('');
      return;
    }

    setVacancySearch(selectedVacancy?.title || '');
  }, [filters.vacancyId, selectedVacancy]);

  useEffect(() => {
    if (!canViewPage || !applicationId) {
      return;
    }

    setPageError(null);

    const loadFullApplication = async () => {
      try {
        await Promise.all([loadApplication(applicationId), loadTimeline(applicationId)]);
        setStatusNote('');
        setNextStatus('REVIEWED');
      } catch (loadError) {
        setPageError(loadError instanceof Error ? loadError.message : t('applications.error.loadSingle'));
      }
    };

    void loadFullApplication();
  }, [applicationId, canViewPage]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!vacancyDropdownRef.current) {
        return;
      }

      if (!vacancyDropdownRef.current.contains(event.target as Node)) {
        setVacancyMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setVacancyMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!candidatePreviewApplication) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCandidatePreview();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [candidatePreviewApplication]);

  const handleFilterChange = (field: keyof ApplicationFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectApplication = (applicationId: string) => {
    navigate(`/app/applications/${applicationId}`);
  };

  const handleBackToList = () => {
    clearSelection();
    navigate('/app/applications');
  };

  const handleWithdraw = async (applicationId: string) => {
    setPageError(null);

    try {
      await withdrawApplication(applicationId);
      await refreshList();
      await loadTimeline(applicationId);
    } catch (mutationError) {
      setPageError(
        mutationError instanceof Error ? mutationError.message : t('applications.error.withdraw'),
      );
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedApplication) {
      return;
    }

    setPageError(null);

    try {
      await updateStatus(selectedApplication.id, nextStatus, statusNote);
      await Promise.all([
        refreshList(),
        loadApplication(selectedApplication.id),
        loadTimeline(selectedApplication.id),
      ]);
      setStatusNote('');
    } catch (mutationError) {
      setPageError(
        mutationError instanceof Error
          ? mutationError.message
          : t('applications.error.updateStatus'),
      );
    }
  };

  const handleOpenResume = async (fileId: string) => {
    setPageError(null);
    setDownloadingFileId(fileId);

    try {
      const downloadUrl = await getDownloadUrl(fileId);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (downloadError) {
      setPageError(downloadError instanceof Error ? downloadError.message : t('applications.error.openResume'));
    } finally {
      setDownloadingFileId(null);
    }
  };

  const previewCandidate = candidatePreviewApplication?.candidate || null;
  const previewProfile = previewCandidate?.profile || null;
  const previewSkills = candidatePreviewApplication ? getCandidateSkills(candidatePreviewApplication) : [];
  const previewSkillLevels = candidatePreviewApplication
    ? getCandidateSkillLevels(candidatePreviewApplication)
    : [];
  const previewPreferredEmploymentTypes = toStringArray(previewProfile?.preferredEmploymentTypes);
  const previewPreferredWorkFormats = toStringArray(previewProfile?.preferredWorkFormats);
  const isSelectedDetailLoaded = !applicationId || selectedApplication?.id === applicationId;

  if (!canViewPage) {
    return (
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="app-page-main">
          <div className="mx-auto max-w-2xl rounded-[28px] border border-black/5 p-8 text-center" style={cardStyle}>
            <h1 className="font-heading mb-3 text-3xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
              {t('applications.accessTitle')}
            </h1>
            <p className="mb-6 text-sm sm:text-base" style={{ color: 'var(--surface-text-muted)' }}>
              {t('applications.accessDescription')}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/app/login">
                <Button variant="hero">{t('applications.signIn')}</Button>
              </Link>
              <Link to="/app/jobs">
                <Button variant="outline">{t('applications.browseJobs')}</Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell app-page">
      <AppHeader />
      <main className="app-page-main" style={{ maxWidth: '1360px' }}>
        <section
          className="app-page-hero mb-6 overflow-hidden rounded-[30px] border border-black/5 p-6 sm:p-8"
          style={{
            ...cardStyle,
            background: 'var(--surface-base)',
          }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--surface-text-primary)' }}>
                <Shield className="h-3.5 w-3.5" />
                {scopeLabel}
              </div>
              <h1 className="font-heading mb-3 text-3xl font-bold sm:text-4xl" style={{ color: 'var(--surface-text-primary)' }}>
                {isCandidate ? t('applications.titleCandidate') : t('applications.titleTeam')}
              </h1>
              <p className="max-w-2xl text-sm sm:text-base" style={{ color: 'var(--surface-text-muted)' }}>
                {isCandidate
                  ? t('applications.descriptionCandidate')
                  : t('applications.descriptionTeam')}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--surface-text-soft)' }}>
                  {t('applications.loaded')}
                </div>
                <div className="mt-2 text-2xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                  {items.length}
                </div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--surface-text-soft)' }}>
                  {t('applications.total')}
                </div>
                <div className="mt-2 text-2xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                  {meta.total}
                </div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--surface-text-soft)' }}>
                  {t('applications.pageSize')}
                </div>
                <div className="mt-2 text-2xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                  {meta.limit}
                </div>
              </div>
            </div>
          </div>
        </section>

        {activeFilters.length > 0 && (
          <section className="mb-6 rounded-[22px] border border-black/5 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--surface-text-soft)' }}>
                <Filter className="h-3.5 w-3.5" />
                {t('applications.activeFilters')}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({ status: '', limit: 20, offset: 0 });
                  setVacancySearch('');
                  setCandidateSearch('');
                  setVacancyMenuOpen(false);
                  clearSelection();
                }}
              >
                {t('applications.resetLocalFilters')}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeFilters.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => removeFilter(entry.key)}
                  className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-semibold"
                  style={{ color: 'var(--surface-text-primary)' }}
                >
                  {entry.label}: {entry.value}
                  <X className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mb-6 rounded-[28px] border border-black/5 p-5 sm:p-6" style={cardStyle}>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                style={{ color: 'var(--surface-text-soft)' }}
              >
                <Building2 className="h-3.5 w-3.5" />
                {t('applications.filter.vacancyPickerBadge')}
              </div>
              <h2 className="mt-3 text-xl font-semibold sm:text-2xl" style={{ color: 'var(--surface-text-primary)' }}>
                {t('applications.filter.vacancyPickerTitle')}
              </h2>
              <p className="mt-1 text-sm sm:text-base" style={{ color: 'var(--surface-text-muted)' }}>
                {t('applications.filter.vacancyPickerDescription')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--surface-text-soft)' }}>
              <span className="app-chip">
                {filteredVacancies.length} {t('applications.filter.myVacanciesCount')}
              </span>
              {selectedVacancy ? (
                <span className="app-chip">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('applications.filter.vacancySelected')}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-6">
            <div className="xl:col-span-1">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--surface-text-soft)' }}>
                {t('applications.filter.status')}
              </label>
              <select
                value={filters.status || ''}
                onChange={(event) => handleFilterChange('status', event.target.value)}
                className="h-11 w-full rounded-xl border border-black/10 bg-[var(--surface-soft)] px-3 text-sm"
              >
                <option value="">{t('applications.allStatuses')}</option>
                {applicationStatuses.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            {!isCandidate && (
              <div ref={vacancyDropdownRef} className="relative xl:col-span-2">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--surface-text-soft)' }}>
                  {t('applications.filter.vacancy')}
                </label>
                <button
                  type="button"
                  onClick={() => setVacancyMenuOpen((prev) => !prev)}
                  className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-black/10 bg-[var(--surface-soft)] px-4 text-left transition-colors hover:border-[rgba(46,117,82,0.35)]"
                >
                  <span className="min-w-0 flex items-center gap-2">
                    <Search className="h-4 w-4 flex-none text-[var(--surface-text-soft)]" />
                    <span className="truncate text-sm" style={{ color: selectedVacancy ? 'var(--surface-text-primary)' : 'var(--surface-text-soft)' }}>
                      {selectedVacancy?.title || t('applications.filter.vacancySearchPlaceholder')}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {selectedVacancy ? (
                      <span className="hidden rounded-full bg-[var(--surface-chip)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] sm:inline-flex">
                        {selectedVacancy.status}
                      </span>
                    ) : null}
                    {vacancyMenuOpen ? <ChevronUp className="h-4 w-4 text-[var(--surface-text-soft)]" /> : <ChevronDown className="h-4 w-4 text-[var(--surface-text-soft)]" />}
                  </span>
                </button>
                <p className="mt-2 text-xs" style={{ color: 'var(--surface-text-soft)' }}>
                  {t('applications.filter.vacancyPickerHint')}
                </p>

                {vacancyMenuOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
                    <div className="border-b border-black/5 p-3">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--surface-text-soft)]" />
                        <Input
                          value={vacancySearch}
                          onChange={(event) => setVacancySearch(event.target.value)}
                          placeholder={t('applications.filter.vacancySearchPlaceholder')}
                          className="h-11 rounded-xl border-black/10 bg-[var(--surface-soft)] pl-10"
                        />
                      </div>
                    </div>

                    <div className="max-h-72 overflow-auto p-2">
                      {isVacanciesLoading ? (
                        <div className="rounded-2xl border border-dashed border-[#D6DED7] bg-[var(--surface-soft)] p-4 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                          {t('applications.filter.vacancyLoading')}
                        </div>
                      ) : filteredVacancies.length ? (
                        filteredVacancies.map((vacancy) => {
                          const isSelected = vacancy.id === filters.vacancyId;

                          return (
                            <button
                              key={vacancy.id}
                              type="button"
                              onClick={() => {
                                setFilters((prev) => ({
                                  ...prev,
                                  vacancyId: vacancy.id,
                                  offset: 0,
                                }));
                                setVacancySearch(vacancy.title);
                                setVacancyMenuOpen(false);
                              }}
                              className={`w-full rounded-2xl border p-4 text-left transition-all ${
                                isSelected
                                  ? 'border-[rgba(46,117,82,0.35)] bg-[rgba(46,117,82,0.08)]'
                                  : 'border-[#D6DED7] bg-white hover:border-[rgba(46,117,82,0.24)] hover:shadow-[0_10px_26px_rgba(17,24,39,0.06)]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate text-base font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                                      {vacancy.title}
                                    </h3>
                                    {isSelected ? (
                                      <span className="app-chip">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        {t('applications.filter.vacancySelected')}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                                    {formatVacancySummary(vacancy) || t('applications.filter.vacancyPreviewFallback')}
                                  </p>
                                  {vacancy.workAddress ? (
                                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--surface-text-soft)' }}>
                                      <MapPin className="h-3.5 w-3.5" />
                                      {vacancy.workAddress}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="rounded-2xl border border-dashed border-[#D6DED7] bg-[var(--surface-soft)] p-4">
                          <div className="flex items-start gap-3">
                            <Building2 className="mt-0.5 h-5 w-5 text-[var(--surface-text-soft)]" />
                            <div>
                              <h3 className="font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                                {t('applications.filter.vacancyNoMatchesTitle')}
                              </h3>
                              <p className="mt-1 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                                {t('applications.filter.vacancyNoMatchesDescription')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isCandidate && (
              <div className="xl:col-span-1">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--surface-text-soft)' }}>
                  {t('applications.filter.candidate')}
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--surface-text-soft)]" />
                  <Input
                    value={candidateSearch}
                    onChange={(event) => setCandidateSearch(event.target.value)}
                    placeholder={t('applications.filter.candidateSearchPlaceholder')}
                    className="h-11 rounded-xl border-black/10 bg-[var(--surface-soft)] pl-10"
                  />
                </div>
                <p className="mt-2 text-xs" style={{ color: 'var(--surface-text-soft)' }}>
                  {t('applications.filter.candidateSearchHint')}
                </p>
              </div>
            )}

            {isAdmin && (
              <div className="xl:col-span-1">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--surface-text-soft)' }}>
                  {t('applications.filter.hrUserId')}
                </label>
                <Input
                  value={filters.hrUserId || ''}
                  onChange={(event) => handleFilterChange('hrUserId', event.target.value)}
                  placeholder={t('applications.filter.uuidPlaceholder')}
                  className="h-11 rounded-xl border-black/10 bg-[var(--surface-soft)]"
                />
              </div>
            )}

            {!isCandidate && (
              <div className="xl:col-span-1">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--surface-text-soft)' }}>
                  {t('applications.filter.dateFrom')}
                </label>
                <Input
                  type="datetime-local"
                  value={toDateTimeLocalValue(filters.dateFrom)}
                  onChange={(event) => {
                    const value = event.target.value;
                    handleFilterChange('dateFrom', value ? new Date(value).toISOString() : '');
                  }}
                  className="h-11 rounded-xl border-black/10 bg-[var(--surface-soft)]"
                />
              </div>
            )}

            {!isCandidate && (
              <div className="xl:col-span-1">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--surface-text-soft)' }}>
                  {t('applications.filter.dateTo')}
                </label>
                <Input
                  type="datetime-local"
                  value={toDateTimeLocalValue(filters.dateTo)}
                  onChange={(event) => {
                    const value = event.target.value;
                    handleFilterChange('dateTo', value ? new Date(value).toISOString() : '');
                  }}
                  className="h-11 rounded-xl border-black/10 bg-[var(--surface-soft)]"
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => void refreshList()}
              variant="hero"
              className="h-11 rounded-xl px-6"
              disabled={isLoading}
            >
              <RefreshCcw className="h-4 w-4" />
              {t('applications.refresh')}
            </Button>
            <Button
              onClick={() => {
                setFilters({ status: '', limit: 20, offset: 0 });
                setVacancySearch('');
                setCandidateSearch('');
                setVacancyMenuOpen(false);
                void refreshList({ status: '', limit: 20, offset: 0 });
                clearSelection();
              }}
              variant="outline"
              className="h-11 rounded-xl px-6"
            >
              {t('applications.reset')}
            </Button>
            {filters.vacancyId ? (
              <Button
                onClick={() => {
                  setFilters((prev) => ({
                    ...prev,
                    vacancyId: undefined,
                    offset: 0,
                  }));
                  setVacancySearch('');
                  setVacancyMenuOpen(false);
                }}
                variant="ghost"
                className="h-11 rounded-xl px-6"
              >
                {t('applications.filter.vacancyClear')}
              </Button>
            ) : null}
          </div>
        </section>

        {(pageError || error) && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError || error}
          </div>
        )}

        {!isDetailPage && (
          <section className="rounded-[28px] border border-black/5 p-5 sm:p-6" style={cardStyle}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-heading text-2xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                  {t('applications.listTitle')}
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                  {isCandidate ? t('applications.listDescriptionCandidate') : t('applications.listDescriptionTeam')}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-black/10 bg-[var(--surface-soft)] p-8 text-center text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                  {t('applications.loading')}
                </div>
            ) : visibleApplications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 bg-[var(--surface-soft)] p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
                  <FileText className="h-6 w-6" style={{ color: 'var(--surface-text-primary)' }} />
                </div>
                <h3 className="mb-2 text-lg font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                  {candidateSearch.trim() ? t('applications.filter.candidateSearchEmptyTitle') : t('applications.emptyTitle')}
                </h3>
                <p className="mx-auto mb-5 max-w-md text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                  {candidateSearch.trim()
                    ? t('applications.filter.candidateSearchEmptyDescription')
                    : isCandidate
                      ? t('applications.emptyDescriptionCandidate')
                      : t('applications.emptyDescriptionTeam')}
                </p>
                {isCandidate && (
                  <Link to="/app/jobs">
                    <Button variant="hero">{t('applications.browseJobs')}</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {visibleApplications.map((application) => {
                  const isSelected = selectedApplication?.id === application.id;

                  return (
                    <button
                      key={application.id}
                      type="button"
                      onClick={() => handleSelectApplication(application.id)}
                      className="w-full rounded-[24px] border p-5 text-left transition-all"
                      style={{
                        borderColor: isSelected ? 'var(--surface-text-primary)' : 'var(--surface-border-soft)',
                        backgroundColor: isSelected ? 'var(--surface-soft)' : 'var(--surface-base)',
                      }}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span
                              className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                              style={{ backgroundColor: 'var(--tone-info-bg)', color: 'var(--tone-info-text)' }}
                            >
                              {getStatusLabel(application.status)}
                            </span>
                            <span className="rounded-full bg-[var(--surface-chip)] px-3 py-1 text-xs font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                              {application.vacancy?.company?.name || t('common.company')}
                            </span>
                          </div>
                          <h3 className="font-heading text-xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                            {application.vacancy?.title || t('common.untitledVacancy')}
                          </h3>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays className="h-4 w-4" />
                              {formatDateTime(application.createdAt)}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <Clock3 className="h-4 w-4" />
                              {t('common.updated')} {formatDateTime(application.updatedAt)}
                            </span>
                            {!isCandidate && (
                              <span className="inline-flex items-center gap-2">
                                <UserRound className="h-4 w-4" />
                                {getCandidateName(application, t('common.candidate'))}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-xs" style={{ color: 'var(--surface-text-soft)' }}>
                          <div>{t('common.id')}</div>
                          <div className="mt-1 break-all font-mono text-[11px]" style={{ color: 'var(--surface-text-primary)' }}>
                            {application.id}
                          </div>
                        </div>
                      </div>

                      {application.coverLetter && (
                        <p className="mt-4 line-clamp-3 text-sm leading-6" style={{ color: 'var(--surface-text-muted)' }}>
                          {application.coverLetter}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-3">
                        {!isCandidate && application.candidate && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              openCandidatePreview(application);
                            }}
                          >
                            <UserRound className="h-4 w-4" />
                            {t('applications.viewCandidate')}
                          </Button>
                        )}
                        {application.chatId && (
                          <Link to={`/app/chat?chatId=${application.chatId}`}>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MessageSquare className="h-4 w-4" />
                              {t('applications.openChat')}
                            </Button>
                          </Link>
                        )}
                        {isCandidate && application.status !== 'WITHDRAWN' && (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isMutating}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleWithdraw(application.id);
                            }}
                          >
                            {t('applications.withdraw')}
                          </Button>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {isDetailPage && (
          <section className="rounded-[28px] border border-black/5 p-5 sm:p-6" style={cardStyle}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <Button variant="outline" onClick={handleBackToList}>
                {t('common.backToList')}
              </Button>
              <p className="text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                {t('applications.fullView')}
              </p>
            </div>

            {!isSelectedDetailLoaded || (isLoading && !selectedApplication) ? (
              <div className="rounded-[24px] border border-dashed border-black/10 bg-[var(--surface-soft)] p-8 text-center text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                {t('applications.loadingDetails')}
              </div>
            ) : !selectedApplication ? (
              <div className="rounded-[24px] border border-dashed border-black/10 bg-[var(--surface-soft)] p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
                  <CheckCircle2 className="h-6 w-6" style={{ color: 'var(--surface-text-primary)' }} />
                </div>
                <h2 className="font-heading mb-2 text-2xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                  {t('applications.notFoundTitle')}
                </h2>
                <p className="text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                  {t('applications.notFoundDescription')}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                      style={{ backgroundColor: 'var(--tone-info-bg)', color: 'var(--tone-info-text)' }}
                    >
                      {getStatusLabel(selectedApplication.status)}
                    </span>
                    <span className="rounded-full bg-[var(--surface-chip)] px-3 py-1 text-xs font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                      {selectedApplication.vacancy?.publicationCity?.name || t('common.noCity')}
                    </span>
                  </div>
                  <h2 className="font-heading text-2xl font-bold" style={{ color: 'var(--surface-text-primary)' }}>
                    {selectedApplication.vacancy?.title || t('common.untitledVacancy')}
                  </h2>
                  <p className="mt-2 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                    {selectedApplication.vacancy?.company?.name || t('common.company')}
                  </p>
                </div>

                {!isCandidate && (
                  <div className="rounded-[24px] border border-black/5 bg-[var(--surface-soft)] p-4">
                    <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--surface-text-soft)' }}>
                      {t('common.candidate')}
                    </div>
                    <div className="mt-2 text-base font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                      {getCandidateName(selectedApplication, t('common.candidate'))}
                    </div>
                    <div className="mt-2 space-y-1 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                      <div>{selectedApplication.candidate?.email || '—'}</div>
                      <div>{selectedApplication.candidate?.phone || t('common.noPhone')}</div>
                      <div>
                        {selectedApplication.candidate?.profile?.city || '—'}
                        {selectedApplication.candidate?.profile?.country
                          ? `, ${selectedApplication.candidate.profile.country}`
                          : ''}
                      </div>
                    </div>
                    {getPrimaryResume(selectedApplication)?.fileId && (
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={downloadingFileId === getPrimaryResume(selectedApplication)?.fileId}
                          onClick={() =>
                            void handleOpenResume(getPrimaryResume(selectedApplication)?.fileId || '')
                          }
                        >
                          <Download className="h-4 w-4" />
                          {downloadingFileId === getPrimaryResume(selectedApplication)?.fileId
                            ? t('common.openingResume')
                            : `${t('common.open')} ${getPrimaryResume(selectedApplication)?.isPrimary ? `${t('common.primary')} ` : ''}${t('common.resumeLower')}`}
                        </Button>
                      </div>
                    )}
                    <div className="mt-4">
                      <Button
                        variant="hero"
                        size="sm"
                        onClick={() => openCandidatePreview(selectedApplication)}
                      >
                        <UserRound className="h-4 w-4" />
                        {t('applications.openCandidateProfile')}
                      </Button>
                    </div>
                  </div>
                )}

                {selectedApplication.coverLetter && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--surface-text-soft)' }}>
                      {t('common.coverLetter')}
                    </div>
                    <div className="rounded-[24px] border border-black/5 bg-[var(--surface-soft)] p-4 text-sm leading-6" style={{ color: 'var(--surface-text-muted)' }}>
                      {selectedApplication.coverLetter}
                    </div>
                  </div>
                )}

                {selectedApplication.chatId && (
                  <div className="rounded-[24px] border border-black/5 bg-[var(--surface-soft)] p-4">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--surface-text-soft)' }}>
                      {t('common.chat')}
                    </div>
                    <p className="mb-3 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                      {t('applications.chatDescription')}
                    </p>
                    <Link to={`/app/chat?chatId=${selectedApplication.chatId}`}>
                      <Button variant="hero" className="w-full">
                        <MessageSquare className="h-4 w-4" />
                        {t('applications.openChat')}
                      </Button>
                    </Link>
                  </div>
                )}

                {(isHr || isAdmin) && selectedApplication.status !== 'WITHDRAWN' && (
                  <div className="rounded-[24px] border border-black/5 bg-[var(--surface-soft)] p-4">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--surface-text-soft)' }}>
                      {t('applications.updateStatus')}
                    </div>
                    <div className="space-y-3">
                      <select
                        value={nextStatus}
                        onChange={(event) => setNextStatus(event.target.value as ApplicationStatus)}
                        className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm"
                      >
                        {manageableStatuses.map((status) => (
                          <option key={status} value={status}>
                            {getStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                      <Textarea
                        value={statusNote}
                        onChange={(event) => setStatusNote(event.target.value)}
                        placeholder={t('applications.timelineNotePlaceholder')}
                        className="min-h-[110px] rounded-2xl border-black/10 bg-white"
                      />
                      <Button
                        variant="hero"
                        className="w-full"
                        disabled={isMutating}
                        onClick={() => void handleStatusUpdate()}
                      >
                        {t('applications.saveStatusUpdate')}
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--surface-text-soft)' }}>
                      {t('common.timeline')}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void loadTimeline(selectedApplication.id)}
                    >
                      {t('common.reload')}
                    </Button>
                  </div>

                  {currentTimeline?.events?.length ? (
                    <div className="space-y-3">
                      {currentTimeline.events.map((event) => (
                        <div key={event.id} className="rounded-[22px] border border-black/5 bg-[var(--surface-soft)] p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-semibold" style={{ color: 'var(--surface-text-primary)' }}>
                                {event.fromStatus ? `${getStatusLabel(event.fromStatus)} -> ` : ''}
                                {getStatusLabel(event.toStatus)}
                              </div>
                              <div className="mt-1 text-xs" style={{ color: 'var(--surface-text-soft)' }}>
                                {getTimelineActor(event, t('common.system'))}
                              </div>
                            </div>
                            <div className="text-right text-xs" style={{ color: 'var(--surface-text-soft)' }}>
                              {formatDateTime(event.createdAt)}
                            </div>
                          </div>
                          {event.note && (
                            <p className="mt-3 text-sm leading-6" style={{ color: 'var(--surface-text-muted)' }}>
                              {event.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-black/10 bg-[var(--surface-soft)] p-5 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                      {t('applications.timelineEmpty')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {candidatePreviewApplication && previewCandidate && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-[#1F251D]/45 p-0 sm:items-center sm:p-6"
          onClick={closeCandidatePreview}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('applications.candidateProfileAria')}
            className="max-h-[92vh] w-full overflow-hidden rounded-t-[28px] border border-black/5 bg-white sm:max-w-4xl sm:rounded-[28px]"
            style={cardStyle}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-black/5 px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--surface-text-soft)' }}>
                  {t('applications.candidateProfile')}
                </p>
                <h3 className="mt-1 text-xl font-bold sm:text-2xl" style={{ color: 'var(--surface-text-primary)' }}>
                  {getCandidateName(candidatePreviewApplication, t('common.candidate'))}
                </h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                  {previewCandidate.email || '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCandidatePreview}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-[var(--surface-text-primary)] transition hover:bg-[#F3F5EA]"
                aria-label={t('applications.closeCandidateProfile')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-92px)] overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[22px] border border-black/5 bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--surface-text-soft)' }}>
                    {t('common.contacts')}
                  </p>
                  <div className="mt-2 space-y-1 text-sm" style={{ color: 'var(--surface-text-primary)' }}>
                    <div>{previewCandidate.phone || t('common.noPhone')}</div>
                    <div>
                      {previewProfile?.city || '—'}
                      {previewProfile?.country ? `, ${previewProfile.country}` : ''}
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-black/5 bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--surface-text-soft)' }}>
                    {t('common.career')}
                  </p>
                  <div className="mt-2 space-y-1 text-sm" style={{ color: 'var(--surface-text-primary)' }}>
                    <div>{t('common.desiredRole')}: {previewProfile?.desiredRole || '—'}</div>
                    <div>{t('common.experience')}: {previewProfile?.experience || '—'}</div>
                    <div>{t('common.education')}: {previewProfile?.educationLevel || '—'}</div>
                    <div>{t('common.desiredSalary')}: {previewProfile?.desiredSalary || '—'}</div>
                    <div>{t('common.availability')}: {previewProfile?.availability || '—'}</div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-black/5 bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--surface-text-soft)' }}>
                    {t('common.preferences')}
                  </p>
                  <div className="mt-2 space-y-1 text-sm" style={{ color: 'var(--surface-text-primary)' }}>
                    <div>{t('common.openToWork')}: {formatFlagLabel(previewProfile?.openToWork)}</div>
                    <div>{t('common.remoteReady')}: {formatFlagLabel(previewProfile?.remoteReady)}</div>
                    <div>{t('common.relocationReady')}: {formatFlagLabel(previewProfile?.relocationReady)}</div>
                  </div>
                  {previewPreferredEmploymentTypes.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {previewPreferredEmploymentTypes.map((entry) => (
                        <span
                          key={entry}
                          className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold"
                          style={{ color: 'var(--surface-text-primary)' }}
                        >
                          {formatToken(entry)}
                        </span>
                      ))}
                    </div>
                  )}
                  {previewPreferredWorkFormats.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {previewPreferredWorkFormats.map((entry) => (
                        <span
                          key={entry}
                          className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold"
                          style={{ color: 'var(--surface-text-primary)' }}
                        >
                          {formatToken(entry)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[22px] border border-black/5 bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--surface-text-soft)' }}>
                    {t('common.skillsAndLevels')}
                  </p>
                  {previewSkills.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {previewSkills.map((skill) => {
                        const levelMatch = previewSkillLevels.find(
                          (entry) => entry.skill.toLowerCase() === skill.toLowerCase(),
                        );

                        return (
                          <span
                            key={skill}
                            className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold"
                            style={{ color: 'var(--surface-text-primary)' }}
                          >
                            {skill}
                            {levelMatch ? ` · ${formatToken(levelMatch.level)}` : ''}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm" style={{ color: 'var(--surface-text-muted)' }}>
                      {t('common.skillsNotSpecified')}
                    </p>
                  )}
                </div>
              </div>

              {previewProfile?.about && (
                <div className="mt-4 rounded-[22px] border border-black/5 bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--surface-text-soft)' }}>
                    {t('common.aboutCandidate')}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6" style={{ color: 'var(--surface-text-primary)' }}>
                    {previewProfile.about}
                  </p>
                </div>
              )}

              {previewProfile?.resumes?.length ? (
                <div className="mt-4 rounded-[22px] border border-black/5 bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--surface-text-soft)' }}>
                    {t('common.resumeFiles')}
                  </p>
                  <div className="mt-3 space-y-2">
                    {previewProfile.resumes.map((resume) => (
                      <div
                        key={resume.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-3 py-2"
                      >
                        <div className="text-sm" style={{ color: 'var(--surface-text-primary)' }}>
                          {resume.title || t('common.resume')}
                          {resume.isPrimary ? ` · ${t('common.primary')}` : ''}
                        </div>
                        {resume.fileId ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={downloadingFileId === resume.fileId}
                            onClick={() => void handleOpenResume(resume.fileId || '')}
                          >
                            <Download className="h-4 w-4" />
                            {downloadingFileId === resume.fileId ? t('common.opening') : t('common.open')}
                          </Button>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--surface-text-soft)' }}>
                            {t('common.noFileAttached')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
