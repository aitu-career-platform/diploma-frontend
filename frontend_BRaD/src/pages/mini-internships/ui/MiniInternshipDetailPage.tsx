import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileText,
  PlayCircle,
  Users,
} from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button } from '@shared/ui';
import { useUISettings } from '@shared/lib/ui-settings';
import { isCandidateRole, useUserStore } from '@entities/user';
import { useApplicationStore } from '@entities/application';
import { useMiniInternshipStore } from '@entities/mini-internship';
import { cardStyle, formatDateTime, formatEnumLabel, getPersonName } from './shared';

export const MiniInternshipDetailPage = () => {
  const { t } = useUISettings();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentUser, isAuthenticated } = useUserStore();
  const { items: applications, listApplications } = useApplicationStore();
  const { selectedMiniInternship, loadMiniInternship, startMiniInternship, isLoading, error } =
    useMiniInternshipStore();
  const [actionError, setActionError] = useState<string | null>(null);

  const isAllowed = isAuthenticated && isCandidateRole(currentUser?.role);
  const miniInternship = selectedMiniInternship?.id === id ? selectedMiniInternship : null;

  useEffect(() => {
    if (!isAllowed || !id) {
      return;
    }

    void loadMiniInternship(id);
  }, [id, isAllowed, loadMiniInternship]);

  useEffect(() => {
    if (!isAllowed || !id || !miniInternship?.vacancyId) {
      return;
    }

    void listApplications(currentUser?.role, {
      vacancyId: miniInternship.vacancyId,
      limit: 100,
      offset: 0,
    });
  }, [currentUser?.role, id, isAllowed, listApplications, miniInternship?.vacancyId]);

  const matchedApplication = useMemo(() => {
    if (!miniInternship?.vacancyId) {
      return null;
    }

    return (
      applications.find(
        (application) =>
          application.vacancyId === miniInternship.vacancyId &&
          application.status !== 'WITHDRAWN',
      ) || null
    );
  }, [applications, miniInternship?.vacancyId]);

  const handleStart = async () => {
    if (!id || !miniInternship) {
      return;
    }

    setActionError(null);

    try {
      await startMiniInternship(
        id,
        matchedApplication ? { applicationId: matchedApplication.id } : undefined,
      );
      navigate(`/app/mini-internships/${id}/submit`);
    } catch (startError) {
      setActionError(startError instanceof Error ? startError.message : t('miniInternships.startFailed'));
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
            <Users className="mx-auto h-12 w-12 text-[var(--surface-text-soft)]" />
            <h1 className="app-title mt-4 text-3xl">{t('miniInternships.accessDeniedTitle')}</h1>
            <p className="app-text-muted mt-2">{t('miniInternships.accessDeniedDescription')}</p>
          </section>
        </main>
      </div>
    );
  }

  if (!miniInternship && !isLoading) {
    return (
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="app-page-main">
          <section className="app-section-card p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-[var(--surface-text-soft)]" />
            <h1 className="app-title mt-4 text-3xl">{t('miniInternships.notFoundTitle')}</h1>
            <p className="app-text-muted mt-2">{t('miniInternships.notFoundDescription')}</p>
            <div className="mt-6">
              <Link to="/app/mini-internships">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4" />
                  {t('miniInternships.backToCatalog')}
                </Button>
              </Link>
            </div>
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
          to="/app/mini-internships"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--surface-text-muted)] transition-colors hover:text-[var(--surface-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('miniInternships.backToCatalog')}
        </Link>

        <section className="app-section-card app-page-hero app-grid-backdrop relative overflow-hidden p-6 sm:p-8">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="app-chip mb-4">
                <PlayCircle className="h-3.5 w-3.5" />
                {formatEnumLabel(miniInternship?.status)}
              </p>
              <h1 className="app-title text-3xl sm:text-4xl">{miniInternship?.title}</h1>
              <p className="app-text-muted mt-3 max-w-2xl text-sm sm:text-base">
                {miniInternship?.description || miniInternship?.taskInstructions || t('miniInternships.noDescription')}
              </p>
            </div>

            <div className="app-kpi-card flex items-center gap-3 p-4">
              <div className="rounded-xl bg-[var(--surface-chip)] p-2.5 text-[var(--surface-text-primary)]">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                  {miniInternship?.company?.name || t('miniInternships.companyFallback')}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--surface-text-primary)]">
                  {miniInternship?.roleCategory || t('miniInternships.roleFallback')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {(error || actionError || isLoading) && (
          <div className="mt-4 space-y-2">
            {error && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tone-danger-bg)', color: 'var(--tone-danger-text)' }}>
                {error}
              </div>
            )}
            {actionError && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tone-warning-bg)', color: 'var(--tone-warning-text)' }}>
                {actionError}
              </div>
            )}
            {isLoading && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}>
                {t('miniInternships.loading')}
              </div>
            )}
          </div>
        )}

        {miniInternship && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-6">
              <div className="app-section-card p-5 sm:p-6" style={cardStyle}>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t('miniInternships.deadline')}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                      {formatDateTime(miniInternship.deadline)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t('miniInternships.allowedAttempts')}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                      {miniInternship.allowedAttempts}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t('miniInternships.timeLimit')}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                      {miniInternship.timeLimitMinutes ? `${miniInternship.timeLimitMinutes} ${t('miniInternships.minutes')}` : t('miniInternships.unlimited')}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--surface-text-muted)]">
                  <span className="rounded-full border border-[#D6DED7] px-3 py-1">
                    {t('miniInternships.criteriaCount', { count: miniInternship.skillCriteria.length })}
                  </span>
                  {miniInternship.accessMode && (
                    <span className="rounded-full border border-[#D6DED7] px-3 py-1">
                      {formatEnumLabel(miniInternship.accessMode)}
                    </span>
                  )}
                  <span className="rounded-full border border-[#D6DED7] px-3 py-1">
                    {t('miniInternships.questionCount', {
                      count:
                        miniInternship.taskQuestions?.length ||
                        miniInternship.questions?.filter((question) => question.scope === 'TASK').length ||
                        0,
                    })}
                  </span>
                  {miniInternship.vacancy?.title && (
                    <span className="rounded-full border border-[#D6DED7] px-3 py-1">
                      {miniInternship.vacancy.title}
                    </span>
                  )}
                  {miniInternship.submissionRequirements && (
                    <span className="rounded-full border border-[#D6DED7] px-3 py-1">
                      {t('miniInternships.requiresReview')}
                    </span>
                  )}
                </div>
              </div>

              {miniInternship.vacancyId && (
                <div className="app-section-card p-5 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                        {t('miniInternships.linkedVacancy')}
                      </p>
                      <h2 className="app-title mt-2 text-xl">
                        {miniInternship.vacancy?.title || t('miniInternships.linkedVacancy')}
                      </h2>
                      <p className="app-text-muted mt-2 text-sm">
                        {matchedApplication
                          ? t('miniInternships.linkedApplicationStatus', {
                              status: matchedApplication.status,
                            })
                          : t('miniInternships.noMatchingApplication')}
                      </p>
                    </div>
                    <Link to={`/app/jobs/${miniInternship.vacancyId}`}>
                      <Button variant="outline">
                        {t('miniInternships.openVacancy')}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              <div className="app-section-card p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[var(--tone-success-text)]" />
                  <h2 className="app-title text-xl">{t('miniInternships.criteriaTitle')}</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {miniInternship.skillCriteria.length ? (
                    miniInternship.skillCriteria.map((criterion, index) => (
                      <div key={criterion.id || `${criterion.name}-${index}`} className="rounded-2xl border border-[#D6DED7] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-[var(--surface-text-primary)]">
                              {criterion.name}
                            </h3>
                            <p className="mt-1 text-sm text-[var(--surface-text-muted)]">
                              {criterion.description || t('miniInternships.noCriterionDescription')}
                            </p>
                          </div>
                          <div className="text-right text-sm text-[var(--surface-text-muted)]">
                            <p>{t('miniInternships.maxScore')}: {criterion.maxScore}</p>
                            <p>{t('miniInternships.weight')}: {criterion.weight ?? 1}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--surface-text-muted)]">{t('miniInternships.noCriteria')}</p>
                  )}
                </div>
              </div>

              {miniInternship.questions?.length ? (
                <div className="app-section-card p-5 sm:p-6">
                  <h2 className="app-title text-xl">{t('miniInternships.questionsTitle')}</h2>
                  <div className="mt-4 space-y-3">
                    {miniInternship.questions.map((question, index) => (
                      <div key={question.id} className="rounded-2xl border border-[#D6DED7] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="app-chip">{t('miniInternships.questionNumber', { number: index + 1 })}</span>
                          <span className="app-chip">{formatEnumLabel(question.scope)}</span>
                          <span className="app-chip">{formatEnumLabel(question.type)}</span>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-[var(--surface-text-primary)]">
                          {question.prompt}
                        </p>
                        {question.description && (
                          <p className="mt-2 text-sm text-[var(--surface-text-muted)]">{question.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {miniInternship.files.length > 0 && (
                <div className="app-section-card p-5 sm:p-6">
                  <h2 className="app-title text-xl">{t('miniInternships.taskFiles')}</h2>
                  <div className="mt-4 grid gap-3">
                    {miniInternship.files.map((file) => (
                      <div key={file.id} className="rounded-2xl border border-[#D6DED7] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-[var(--surface-text-primary)]">{file.filename}</p>
                            <p className="text-sm text-[var(--surface-text-muted)]">
                              {file.mimeType || t('miniInternships.fileAttached')}
                            </p>
                          </div>
                          {file.downloadUrl ? (
                            <a
                              href={file.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--tone-info-text)] hover:underline"
                            >
                              {t('common.open')}
                              <ArrowRight className="h-4 w-4" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className="app-section-card p-5 sm:p-6 sticky top-28">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-[var(--tone-info-text)]" />
                  <h2 className="app-title text-xl">{t('miniInternships.startTitle')}</h2>
                </div>
                <p className="app-text-muted mt-3 text-sm">
                  {miniInternship.currentSubmission
                    ? t('miniInternships.continueHint')
                    : t('miniInternships.startHint')}
                </p>

                <div className="mt-5 flex flex-col gap-3">
                  {miniInternship.currentSubmission ? (
                    <Link to={`/app/mini-internships/${miniInternship.id}/submit`}>
                      <Button variant="hero" className="w-full">
                        {t('miniInternships.continueAttempt')}
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="hero" className="w-full" onClick={() => void handleStart()}>
                      {t('miniInternships.startAttempt')}
                    </Button>
                  )}

                  <Link to={`/app/my-submissions`}>
                    <Button variant="outline" className="w-full">
                      {t('miniInternships.mySubmissions')}
                    </Button>
                  </Link>
                </div>

                {miniInternship.currentSubmission && (
                  <div className="mt-5 rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t('miniInternships.currentSubmission')}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                      {formatEnumLabel(miniInternship.currentSubmission.status)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--surface-text-muted)]">
                      {getPersonName(miniInternship.currentSubmission.student, t('common.candidate'))}
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};
