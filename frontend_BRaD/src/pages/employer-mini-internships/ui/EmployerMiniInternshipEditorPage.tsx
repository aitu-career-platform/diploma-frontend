import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CheckCheck,
  MapPin,
  Plus,
  Search,
  Save,
  ShieldAlert,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input, Textarea } from '@shared/ui';
import { useUISettings } from '@shared/lib/ui-settings';
import { isEmployerRole, useUserStore } from '@entities/user';
import { useMediaStore } from '@entities/media';
import { useVacancyStore, type Vacancy } from '@entities/vacancy';
import { useMiniInternshipStore, type MiniInternshipSkillCriterion } from '@entities/mini-internship';
import { cardStyle, formatDateTime, formatEnumLabel } from '@pages/mini-internships/ui/shared';

type CriterionDraft = {
  name: string;
  description: string;
  maxScore: string;
  weight: string;
  sortOrder: string;
};

const createEmptyCriterion = (): CriterionDraft => ({
  name: '',
  description: '',
  maxScore: '10',
  weight: '1',
  sortOrder: '',
});

const toDateTimeLocalValue = (value?: string | null): string => {
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

const toCriterionDraft = (criterion: MiniInternshipSkillCriterion): CriterionDraft => ({
  name: criterion.name || '',
  description: criterion.description || '',
  maxScore: String(criterion.maxScore ?? 10),
  weight: String(criterion.weight ?? 1),
  sortOrder: criterion.sortOrder === undefined || criterion.sortOrder === null ? '' : String(criterion.sortOrder),
});

const formatVacancyPreview = (
  vacancy: Pick<Vacancy, 'status' | 'workAddress' | 'salaryFrom' | 'salaryTo' | 'currency'> | { status?: string; workAddress?: string; salaryFrom?: number; salaryTo?: number; currency?: string },
) => {
  const parts: string[] = [];

  if (vacancy.status) {
    parts.push(formatEnumLabel(vacancy.status));
  }

  if (vacancy.workAddress) {
    parts.push(vacancy.workAddress);
  }

  const hasSalaryRange = vacancy.salaryFrom !== undefined || vacancy.salaryTo !== undefined;
  if (hasSalaryRange) {
    const from = vacancy.salaryFrom !== undefined ? vacancy.salaryFrom.toLocaleString() : '';
    const to = vacancy.salaryTo !== undefined ? vacancy.salaryTo.toLocaleString() : '';
    const salaryRange = from && to ? `${from}–${to}` : from || to;
    if (salaryRange) {
      parts.push(`${salaryRange}${vacancy.currency ? ` ${vacancy.currency}` : ''}`);
    }
  }

  return parts.join(' · ');
};

export const EmployerMiniInternshipEditorPage = () => {
  const { t } = useUISettings();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { currentUser, isAuthenticated } = useUserStore();
  const { uploadAndAttach, deleteFile, isUploading } = useMediaStore();
  const { vacancies, loadMyVacancies, isLoading: isVacanciesLoading } = useVacancyStore();
  const {
    selectedMiniInternship,
    loadMiniInternship,
    createMiniInternship,
    updateMiniInternship,
    publishMiniInternship,
    closeMiniInternship,
    isLoading,
    isMutating,
    error,
  } = useMiniInternshipStore();
  const [currentId, setCurrentId] = useState<string | null>(id || null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskInstructions, setTaskInstructions] = useState('');
  const [roleCategory, setRoleCategory] = useState('');
  const [deadline, setDeadline] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState('');
  const [allowedAttempts, setAllowedAttempts] = useState('1');
  const [submissionRequirements, setSubmissionRequirements] = useState('');
  const [selectedVacancyId, setSelectedVacancyId] = useState<string | null>(null);
  const [vacancySearch, setVacancySearch] = useState('');
  const [criteria, setCriteria] = useState<CriterionDraft[]>([createEmptyCriterion()]);
  const [taskFile, setTaskFile] = useState<File | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  const isAllowed = isAuthenticated && isEmployerRole(currentUser?.role);
  const detail = selectedMiniInternship?.id === currentId ? selectedMiniInternship : null;
  const effectiveMiniInternshipId = detail?.id || currentId || id || null;

  useEffect(() => {
    if (!isAllowed || !id) {
      return;
    }

    void loadMiniInternship(id);
  }, [id, isAllowed, loadMiniInternship]);

  useEffect(() => {
    if (!isAllowed) {
      return;
    }

    void loadMyVacancies();
  }, [isAllowed, loadMyVacancies]);

  useEffect(() => {
    if (!detail) {
      return;
    }

    setTitle(detail.title || '');
    setDescription(detail.description || '');
    setTaskInstructions(detail.taskInstructions || '');
    setRoleCategory(detail.roleCategory || '');
    setDeadline(toDateTimeLocalValue(detail.deadline));
    setTimeLimitMinutes(detail.timeLimitMinutes ? String(detail.timeLimitMinutes) : '');
    setAllowedAttempts(String(detail.allowedAttempts || 1));
    setSubmissionRequirements(detail.submissionRequirements || '');
    setSelectedVacancyId(detail.vacancyId || null);
    setVacancySearch(detail.vacancy?.title || '');
    setCriteria(
      detail.skillCriteria.length ? detail.skillCriteria.map(toCriterionDraft) : [createEmptyCriterion()],
    );
  }, [detail]);

  useEffect(() => {
    if (detail?.id && detail.id !== currentId) {
      setCurrentId(detail.id);
    }
  }, [currentId, detail?.id]);

  const selectedVacancy = useMemo(() => {
    if (!selectedVacancyId) {
      return null;
    }

    return vacancies.find((vacancy) => vacancy.id === selectedVacancyId) || detail?.vacancy || null;
  }, [detail?.vacancy, selectedVacancyId, vacancies]);

  const filteredVacancies = useMemo(() => {
    const needle = vacancySearch.trim().toLowerCase();
    const sortedVacancies = [...vacancies].sort((left, right) => {
      const leftUpdatedAt = new Date(left.updatedAt || left.createdAt || 0).getTime();
      const rightUpdatedAt = new Date(right.updatedAt || right.createdAt || 0).getTime();

      if (rightUpdatedAt !== leftUpdatedAt) {
        return rightUpdatedAt - leftUpdatedAt;
      }

      return left.title.localeCompare(right.title);
    });

    if (!needle) {
      return sortedVacancies;
    }

    return sortedVacancies.filter((vacancy) => {
      return (
        vacancy.title.toLowerCase().includes(needle) ||
        vacancy.status.toLowerCase().includes(needle) ||
        (vacancy.workAddress || '').toLowerCase().includes(needle) ||
        (vacancy.description || '').toLowerCase().includes(needle)
      );
    });
  }, [vacancies, vacancySearch]);

  const canPublish = useMemo(() => Boolean(detail && detail.status === 'DRAFT'), [detail]);

  const handleAddCriterion = () => {
    setCriteria((prev) => [...prev, createEmptyCriterion()]);
  };

  const handleRemoveCriterion = (index: number) => {
    setCriteria((prev) => {
      if (prev.length === 1) {
        return [createEmptyCriterion()];
      }

      return prev.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const updateCriterion = (index: number, field: keyof CriterionDraft, value: string) => {
    setCriteria((prev) =>
      prev.map((entry, itemIndex) => (itemIndex === index ? { ...entry, [field]: value } : entry)),
    );
  };

  const buildPayload = () => ({
    title: title.trim(),
    description: description.trim(),
    taskInstructions: taskInstructions.trim(),
    roleCategory: roleCategory.trim(),
    deadline: new Date(deadline).toISOString(),
    timeLimitMinutes: timeLimitMinutes.trim() ? Number(timeLimitMinutes) : undefined,
    allowedAttempts: allowedAttempts.trim() ? Number(allowedAttempts) : undefined,
    submissionRequirements: submissionRequirements.trim(),
    vacancyId: selectedVacancyId || undefined,
    skillCriteria: criteria
      .map((criterion, index) => ({
        name: criterion.name.trim(),
        description: criterion.description.trim() || undefined,
        maxScore: Number(criterion.maxScore || 0),
        weight: criterion.weight.trim() ? Number(criterion.weight) : undefined,
        sortOrder: criterion.sortOrder.trim() ? Number(criterion.sortOrder) : index,
      }))
      .filter((criterion) => criterion.name.length > 0),
  });

  const handleSave = async () => {
    setPageError(null);
    setPageSuccess(null);

    try {
      const payload = buildPayload();
      const saved = currentId
        ? await updateMiniInternship(currentId, payload)
        : await createMiniInternship(payload);

      setCurrentId(saved.id);
      setPageSuccess(currentId ? t('employerMiniInternships.saved') : t('employerMiniInternships.created'));

      if (!currentId) {
        navigate(`/app/employer/mini-internships/${saved.id}/edit`, { replace: true });
      }
    } catch (saveError) {
      setPageError(saveError instanceof Error ? saveError.message : t('employerMiniInternships.saveFailed'));
    }
  };

  const handlePublish = async () => {
    if (!currentId) {
      return;
    }

    setPageError(null);
    setPageSuccess(null);

    try {
      await publishMiniInternship(currentId);
      setPageSuccess(t('employerMiniInternships.published'));
    } catch (publishError) {
      setPageError(publishError instanceof Error ? publishError.message : t('employerMiniInternships.publishFailed'));
    }
  };

  const handleClose = async () => {
    if (!currentId) {
      return;
    }

    setPageError(null);
    setPageSuccess(null);

    try {
      await closeMiniInternship(currentId);
      setPageSuccess(t('employerMiniInternships.closed'));
    } catch (closeError) {
      setPageError(closeError instanceof Error ? closeError.message : t('employerMiniInternships.closeFailed'));
    }
  };

  const handleUploadTaskFile = async () => {
    if (!taskFile || !effectiveMiniInternshipId) {
      setPageError(t('employerMiniInternships.missingMiniInternshipId'));
      return;
    }

    setPageError(null);
    setPageSuccess(null);

    try {
      await uploadAndAttach({
        file: taskFile,
        target: 'MINI_INTERNSHIP_TASK',
        miniInternshipId: effectiveMiniInternshipId,
      });
      await loadMiniInternship(effectiveMiniInternshipId);
      setTaskFile(null);
      setPageSuccess(t('employerMiniInternships.fileUploaded'));
    } catch (uploadError) {
      setPageError(uploadError instanceof Error ? uploadError.message : t('employerMiniInternships.uploadFailed'));
    }
  };

  const handleDeleteTaskFile = async (fileId: string) => {
    if (!currentId) {
      return;
    }

    setPageError(null);

    try {
      await deleteFile(fileId);
      await loadMiniInternship(currentId);
      setPageSuccess(t('employerMiniInternships.fileDeleted'));
    } catch (deleteError) {
      setPageError(deleteError instanceof Error ? deleteError.message : t('employerMiniInternships.deleteFailed'));
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/app/login" replace />;
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="app-page-main">
          <section className="app-section-card p-8 text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-[var(--surface-text-soft)]" />
            <h1 className="app-title mt-4 text-3xl">{t('employerMiniInternships.accessDeniedTitle')}</h1>
            <p className="app-text-muted mt-2">{t('employerMiniInternships.accessDeniedDescription')}</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell app-page">
      <AppHeader />
      <main className="app-page-main">
        <Link
          to="/app/employer/mini-internships"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--surface-text-muted)] transition-colors hover:text-[var(--surface-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('employerMiniInternships.backToList')}
        </Link>

        <section className="app-section-card app-page-hero app-grid-backdrop relative overflow-hidden p-6 sm:p-8">
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="app-chip mb-4">
                <CheckCheck className="h-3.5 w-3.5" />
                {currentId ? t('employerMiniInternships.editBadge') : t('employerMiniInternships.createBadge')}
              </p>
              <h1 className="app-title text-3xl sm:text-4xl">
                {currentId ? t('employerMiniInternships.editTitle') : t('employerMiniInternships.createTitle')}
              </h1>
              <p className="app-text-muted mt-3 max-w-2xl text-sm sm:text-base">
                {t('employerMiniInternships.formDescription')}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="app-chip">
                  {detail ? formatEnumLabel(detail.status) : t('employerMiniInternships.draftState')}
                </span>
                <span className="app-chip">
                  {t('employerMiniInternships.attemptsLabel')}: {allowedAttempts || 1}
                </span>
                <span className="app-chip">
                  {timeLimitMinutes.trim() ? `${timeLimitMinutes} min` : t('miniInternships.unlimited')}
                </span>
                <span className="app-chip">
                  {selectedVacancy?.title || t('employerMiniInternships.noVacancySelected')}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => void handleSave()} disabled={isMutating}>
                <Save className="h-4 w-4" />
                {t('employerMiniInternships.save')}
              </Button>
              {currentId && canPublish ? (
                <Button variant="hero" onClick={() => void handlePublish()} disabled={isMutating}>
                  {t('employerMiniInternships.publish')}
                </Button>
              ) : null}
              {currentId && detail?.status === 'PUBLISHED' ? (
                <Button variant="outline" onClick={() => void handleClose()} disabled={isMutating}>
                  {t('employerMiniInternships.close')}
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        {(error || pageError || pageSuccess || isLoading || isUploading) && (
          <div className="mt-4 space-y-2">
            {error && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tone-danger-bg)', color: 'var(--tone-danger-text)' }}>
                {error}
              </div>
            )}
            {pageError && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tone-warning-bg)', color: 'var(--tone-warning-text)' }}>
                {pageError}
              </div>
            )}
            {pageSuccess && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tone-success-bg)', color: 'var(--tone-success-text)' }}>
                {pageSuccess}
              </div>
            )}
            {isLoading && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}>
                {t('employerMiniInternships.loading')}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-6">
            <div className="app-section-card p-5 sm:p-6" style={cardStyle}>
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                    {t('employerMiniInternships.sectionBasics')}
                  </p>
                  <h2 className="app-title text-xl">{t('employerMiniInternships.sectionBasicsTitle')}</h2>
                  <p className="app-text-muted mt-1 text-sm">
                    {t('employerMiniInternships.sectionBasicsDescription')}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#D6DED7] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--surface-text-muted)]">
                  <span className="font-semibold text-[var(--surface-text-primary)]">
                    {selectedVacancy?.title || t('employerMiniInternships.noVacancySelected')}
                  </span>
                  <div className="mt-1">{selectedVacancy ? formatVacancyPreview(selectedVacancy) : t('employerMiniInternships.standaloneTask')}</div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
                    {t('employerMiniInternships.titleField')}
                  </label>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('employerMiniInternships.titlePlaceholder')} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
                    {t('employerMiniInternships.roleCategory')}
                  </label>
                  <Input value={roleCategory} onChange={(event) => setRoleCategory(event.target.value)} placeholder={t('employerMiniInternships.roleCategoryPlaceholder')} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
                    {t('miniInternships.deadline')}
                  </label>
                  <Input type="datetime-local" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
                    {t('employerMiniInternships.vacancyLink')}
                  </label>
                  <Input
                    value={selectedVacancy?.title || ''}
                    readOnly
                    placeholder={t('employerMiniInternships.noVacancySelected')}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
                    {t('employerMiniInternships.allowedAttempts')}
                  </label>
                  <Input type="number" min={1} value={allowedAttempts} onChange={(event) => setAllowedAttempts(event.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
                    {t('employerMiniInternships.timeLimit')}
                  </label>
                  <Input type="number" min={0} value={timeLimitMinutes} onChange={(event) => setTimeLimitMinutes(event.target.value)} placeholder={t('miniInternships.unlimited')} />
                </div>
              </div>
            </div>

            <div className="app-section-card p-5 sm:p-6">
              <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
                {t('employerMiniInternships.description')}
              </label>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t('employerMiniInternships.descriptionPlaceholder')} />
              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
                  {t('employerMiniInternships.taskInstructions')}
                </label>
                <Textarea value={taskInstructions} onChange={(event) => setTaskInstructions(event.target.value)} placeholder={t('employerMiniInternships.taskInstructionsPlaceholder')} />
              </div>
              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
                  {t('employerMiniInternships.submissionRequirements')}
                </label>
                <Textarea value={submissionRequirements} onChange={(event) => setSubmissionRequirements(event.target.value)} placeholder={t('employerMiniInternships.submissionRequirementsPlaceholder')} />
              </div>
            </div>

            <div className="app-section-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="app-title text-xl">{t('employerMiniInternships.criteriaTitle')}</h2>
                <Button variant="outline" onClick={handleAddCriterion}>
                  <Plus className="h-4 w-4" />
                  {t('employerMiniInternships.addCriterion')}
                </Button>
              </div>
              <div className="mt-4 space-y-4">
                {criteria.map((criterion, index) => (
                  <div key={`${index}-${criterion.name}`} className="rounded-2xl border border-[#D6DED7] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid flex-1 gap-3 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--surface-text-soft)]">
                            {t('employerMiniInternships.criterionName')}
                          </label>
                          <Input value={criterion.name} onChange={(event) => updateCriterion(index, 'name', event.target.value)} />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--surface-text-soft)]">
                            {t('employerMiniInternships.criterionDescription')}
                          </label>
                          <Input value={criterion.description} onChange={(event) => updateCriterion(index, 'description', event.target.value)} />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--surface-text-soft)]">
                            {t('employerMiniInternships.maxScore')}
                          </label>
                          <Input type="number" min={0} value={criterion.maxScore} onChange={(event) => updateCriterion(index, 'maxScore', event.target.value)} />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--surface-text-soft)]">
                            {t('employerMiniInternships.weight')}
                          </label>
                          <Input type="number" min={0} step="0.1" value={criterion.weight} onChange={(event) => updateCriterion(index, 'weight', event.target.value)} />
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--surface-text-soft)]">
                            {t('employerMiniInternships.sortOrder')}
                          </label>
                          <Input type="number" min={0} value={criterion.sortOrder} onChange={(event) => updateCriterion(index, 'sortOrder', event.target.value)} />
                        </div>
                      </div>
                      <Button variant="outline" size="icon" onClick={() => handleRemoveCriterion(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="app-section-card p-5 sm:p-6 sticky top-28">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                    {t('employerMiniInternships.vacancyPickerBadge')}
                  </p>
                  <h2 className="app-title text-xl">{t('employerMiniInternships.vacancyPickerTitle')}</h2>
                  <p className="app-text-muted mt-2 text-sm">
                    {t('employerMiniInternships.vacancyPickerDescription')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedVacancyId(null);
                    setVacancySearch('');
                  }}
                >
                  {t('employerMiniInternships.clearVacancy')}
                </Button>
              </div>

              <div className="mt-4 relative">
                <Input
                  value={vacancySearch}
                  onChange={(event) => setVacancySearch(event.target.value)}
                  placeholder={t('employerMiniInternships.vacancySearchPlaceholder')}
                  className="h-12 rounded-2xl border-black/10 bg-[var(--surface-soft)] pl-11"
                />
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--surface-text-soft)]" />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="app-chip">
                  <Building2 className="h-3.5 w-3.5" />
                  {selectedVacancy ? t('employerMiniInternships.vacancySelected') : t('employerMiniInternships.standaloneTask')}
                </span>
                <span className="app-chip">
                  {filteredVacancies.length} {t('employerMiniInternships.myVacanciesCount')}
                </span>
              </div>

              {selectedVacancy ? (
                <div className="mt-4 rounded-2xl border border-[rgba(46,117,82,0.16)] bg-[rgba(46,117,82,0.06)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tone-success-text)]">
                    {t('employerMiniInternships.selectedVacancyTitle')}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--surface-text-primary)]">{selectedVacancy.title}</h3>
                  <p className="mt-1 text-sm text-[var(--surface-text-muted)]">
                    {formatVacancyPreview(selectedVacancy) || t('employerMiniInternships.selectedVacancyDescription')}
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[#D6DED7] bg-[var(--surface-soft)] p-4 text-sm text-[var(--surface-text-muted)]">
                  {t('employerMiniInternships.noVacancySelected')}
                </div>
              )}

              <div className="mt-4 space-y-3">
                {isVacanciesLoading ? (
                  <div className="rounded-2xl border border-[#D6DED7] bg-[var(--surface-soft)] p-4 text-sm text-[var(--surface-text-muted)]">
                    {t('employerMiniInternships.vacancyPickerLoading')}
                  </div>
                ) : filteredVacancies.length ? (
                  filteredVacancies.map((vacancy) => {
                    const isSelected = vacancy.id === selectedVacancyId;

                    return (
                      <button
                        type="button"
                        key={vacancy.id}
                        onClick={() => {
                          setSelectedVacancyId(vacancy.id);
                          setVacancySearch(vacancy.title);
                        }}
                        className={`w-full rounded-2xl border p-4 text-left transition-all ${
                          isSelected
                            ? 'border-[rgba(46,117,82,0.35)] bg-[rgba(46,117,82,0.08)] shadow-[0_8px_24px_rgba(46,117,82,0.08)]'
                            : 'border-[#D6DED7] bg-white hover:border-[rgba(46,117,82,0.24)] hover:shadow-[0_10px_26px_rgba(17,24,39,0.06)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-base font-semibold text-[var(--surface-text-primary)]">{vacancy.title}</h3>
                              {isSelected ? (
                                <span className="app-chip">{t('employerMiniInternships.vacancySelected')}</span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-[var(--surface-text-muted)]">
                              {formatVacancyPreview(vacancy) || t('employerMiniInternships.vacancyPreviewFallback')}
                            </p>
                            {vacancy.workAddress ? (
                              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--surface-text-soft)]">
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
                        <h3 className="font-semibold text-[var(--surface-text-primary)]">
                          {t('employerMiniInternships.noVacanciesTitle')}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--surface-text-muted)]">
                          {t('employerMiniInternships.noVacanciesDescription')}
                        </p>
                        <Link
                          to="/app/employer"
                          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--tone-info-text)] hover:underline"
                        >
                          {t('employerMiniInternships.openEmployerDashboard')}
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="app-section-card p-5 sm:p-6 sticky top-28">
              <h2 className="app-title text-xl">{t('employerMiniInternships.taskFiles')}</h2>
              <p className="app-text-muted mt-2 text-sm">
                {currentId ? t('employerMiniInternships.fileUploadHint') : t('employerMiniInternships.saveBeforeUpload')}
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <Input type="file" onChange={(event) => setTaskFile(event.target.files?.[0] || null)} disabled={!currentId} />
                <Button variant="outline" onClick={() => void handleUploadTaskFile()} disabled={!currentId || !taskFile || isUploading}>
                  <UploadCloud className="h-4 w-4" />
                  {t('employerMiniInternships.uploadFile')}
                </Button>
              </div>

              {taskFile && (
                <p className="mt-3 text-sm text-[var(--surface-text-muted)]">
                  {t('employerMiniInternships.selectedFile')}: {taskFile.name}
                </p>
              )}

              <div className="mt-5 space-y-3">
                {detail?.files?.length ? (
                  detail.files.map((file) => (
                    <div key={file.id} className="rounded-2xl border border-[#D6DED7] p-4">
                      <div className="flex flex-col gap-3">
                        <div>
                          <p className="font-semibold text-[var(--surface-text-primary)]">{file.filename}</p>
                          <p className="text-sm text-[var(--surface-text-muted)]">{file.mimeType || t('miniInternships.fileAttached')}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {file.downloadUrl ? (
                            <a
                              href={file.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--tone-info-text)] hover:underline"
                            >
                              {t('common.open')}
                            </a>
                          ) : null}
                          <Button variant="outline" size="sm" onClick={() => void handleDeleteTaskFile(file.id)}>
                            {t('common.delete')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--surface-text-muted)]">{t('employerMiniInternships.noFiles')}</p>
                )}
              </div>

              {detail && (
                <div className="mt-5 rounded-2xl bg-[var(--surface-soft)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                    {t('miniInternships.status')}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                    {formatEnumLabel(detail.status)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--surface-text-muted)]">
                    {formatDateTime(detail.updatedAt)}
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
