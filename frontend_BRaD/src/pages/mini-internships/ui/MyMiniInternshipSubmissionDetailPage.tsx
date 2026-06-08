import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  ShieldAlert,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button } from '@shared/ui';
import { useUISettings } from '@shared/lib/ui-settings';
import { isCandidateRole, useUserStore } from '@entities/user';
import { useMiniInternshipStore } from '@entities/mini-internship';
import {
  cardStyle,
  formatDateTime,
  formatEnumLabel,
  getFileLabel,
  getPersonName,
  getSubmissionLinks,
  normalizeDecisionStatus,
} from './shared';

export const MyMiniInternshipSubmissionDetailPage = () => {
  const { t } = useUISettings();
  const { id } = useParams<{ id: string }>();
  const { currentUser, isAuthenticated } = useUserStore();
  const { selectedSubmission, loadSubmission, addSubmissionToPortfolio, isLoading, error } =
    useMiniInternshipStore();
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  const isAllowed = isAuthenticated && isCandidateRole(currentUser?.role);
  const submission = selectedSubmission?.id === id ? selectedSubmission : null;

  useEffect(() => {
    if (!isAllowed || !id) {
      return;
    }

    void loadSubmission(id);
  }, [id, isAllowed, loadSubmission]);

  const canContinue = Boolean(
    submission &&
      !['REVIEWED', 'REJECTED'].includes(String(submission.status || '').toUpperCase()) &&
      !submission.reviewedAt,
  );

  const handleAddToPortfolio = async () => {
    if (!submission) {
      return;
    }

    setPageError(null);

    try {
      await addSubmissionToPortfolio(submission.id);
      setPageSuccess(t('miniInternships.addedToPortfolio'));
    } catch (portfolioError) {
      setPageError(portfolioError instanceof Error ? portfolioError.message : t('miniInternships.portfolioFailed'));
    }
  };

  const aiLinks = useMemo(() => getSubmissionLinks(submission?.externalLinks), [submission?.externalLinks]);

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
            <h1 className="app-title mt-4 text-3xl">{t('miniInternships.accessDeniedTitle')}</h1>
            <p className="app-text-muted mt-2">{t('miniInternships.accessDeniedDescription')}</p>
          </section>
        </main>
      </div>
    );
  }

  if (!submission && !isLoading) {
    return (
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="app-page-main">
          <section className="app-section-card p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-[var(--surface-text-soft)]" />
            <h1 className="app-title mt-4 text-3xl">{t('miniInternships.notFoundTitle')}</h1>
            <p className="app-text-muted mt-2">{t('miniInternships.submissionNotFoundDescription')}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/app/my-submissions">
                <Button variant="hero">{t('miniInternships.mySubmissions')}</Button>
              </Link>
              <Link to="/app/mini-internships">
                <Button variant="outline">{t('miniInternships.openCatalog')}</Button>
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
          to="/app/my-submissions"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--surface-text-muted)] transition-colors hover:text-[var(--surface-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('miniInternships.mySubmissions')}
        </Link>

        <section className="app-section-card app-page-hero app-grid-backdrop relative overflow-hidden p-6 sm:p-8">
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="app-chip mb-4">
                <UserCheck className="h-3.5 w-3.5" />
                {t('miniInternships.submissionDetailBadge')}
              </p>
              <h1 className="app-title text-3xl sm:text-4xl">
                {submission?.miniInternship?.title || t('miniInternships.untitledTask')}
              </h1>
              <p className="app-text-muted mt-3 max-w-2xl text-sm sm:text-base">
                {submission?.miniInternship?.description || t('miniInternships.noDescription')}
              </p>
            </div>

            <div className="app-kpi-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                {t('miniInternships.decisionStatus')}
              </p>
              <p className="mt-2 text-xl font-extrabold text-[var(--surface-text-primary)]">
                {formatEnumLabel(normalizeDecisionStatus(submission?.decisionStatus))}
              </p>
            </div>
          </div>
        </section>

        {(error || pageError || pageSuccess || isLoading) && (
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
                {t('miniInternships.loading')}
              </div>
            )}
          </div>
        )}

        {submission && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-6">
              <div className="app-section-card p-5 sm:p-6" style={cardStyle}>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t('miniInternships.status')}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                      {formatEnumLabel(submission.status)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t('miniInternships.attemptNumber')}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                      {submission.attemptNumber}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t('miniInternships.submittedAt')}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                      {formatDateTime(submission.submittedAt || undefined)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="app-section-card p-5 sm:p-6">
                <h2 className="app-title text-xl">{t('miniInternships.answerTitle')}</h2>
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-[#D6DED7] p-4">
                    <p className="text-sm font-semibold text-[var(--surface-text-primary)]">
                      {submission.answerText || t('miniInternships.noAnswerText')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--surface-text-primary)]">
                      {t('miniInternships.externalLinksLabel')}
                    </p>
                    <div className="mt-2 flex flex-col gap-2">
                      {aiLinks.length ? (
                        aiLinks.map((link) => (
                          <a
                            key={link}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--tone-info-text)] hover:underline"
                          >
                            {link}
                            <ArrowRight className="h-4 w-4" />
                          </a>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--surface-text-muted)]">{t('miniInternships.noExternalLinks')}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {submission.files?.length ? (
                <div className="app-section-card p-5 sm:p-6">
                  <h2 className="app-title text-xl">{t('miniInternships.submissionFiles')}</h2>
                  <div className="mt-4 grid gap-3">
                    {submission.files.map((file) => (
                      <div key={file.id} className="rounded-2xl border border-[#D6DED7] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-[var(--surface-text-primary)]">{getFileLabel(file)}</p>
                            <p className="text-sm text-[var(--surface-text-muted)]">{file.mimeType || t('miniInternships.fileAttached')}</p>
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
              ) : null}

              {submission.overallComment && (
                <div className="app-section-card p-5 sm:p-6">
                  <h2 className="app-title text-xl">{t('miniInternships.reviewComment')}</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--surface-text-muted)]">
                    {submission.overallComment}
                  </p>
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <div className="app-section-card p-5 sm:p-6 sticky top-28">
                <h2 className="app-title text-xl">{t('miniInternships.reviewSnapshot')}</h2>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t('miniInternships.score')}
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-[var(--surface-text-primary)]">
                      {submission.weightedScore ?? submission.averageScore ?? submission.overallScore ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t('miniInternships.portfolioEligibility')}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                      {submission.allowCandidateToAddToPortfolio ? t('common.yes') : t('common.no')}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                      {t('miniInternships.reviewerState')}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                      {formatEnumLabel(normalizeDecisionStatus(submission.decisionStatus))}
                    </p>
                  </div>
                </div>

                {submission.decisionStatus === 'reviewed' &&
                  submission.allowCandidateToAddToPortfolio &&
                  !submission.portfolioAchievement && (
                    <Button variant="hero" className="mt-5 w-full" onClick={() => void handleAddToPortfolio()}>
                      {t('miniInternships.addToPortfolio')}
                    </Button>
                  )}

                {submission.portfolioAchievement && (
                  <div className="mt-5 rounded-2xl bg-[var(--tone-success-bg)] p-4 text-[var(--tone-success-text)]">
                    {t('miniInternships.alreadyInPortfolio')}
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-3">
                  {canContinue && (
                    <Link to={`/app/mini-internships/${submission.miniInternshipId}/submit`}>
                      <Button variant="outline" className="w-full">
                        {t('miniInternships.continueAttempt')}
                      </Button>
                    </Link>
                  )}
                  <Link to={`/app/mini-internships/${submission.miniInternshipId}`}>
                    <Button variant="outline" className="w-full">
                      {t('miniInternships.openTask')}
                    </Button>
                  </Link>
                </div>
              </div>

              {submission.aiEvaluation && (
                <div className="app-section-card p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[var(--tone-info-text)]" />
                    <h2 className="app-title text-xl">{t('miniInternships.aiEvaluation')}</h2>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--surface-text-muted)]">
                    {submission.aiEvaluation.summary || t('miniInternships.aiSummaryFallback')}
                  </p>
                  {submission.aiEvaluationError && (
                    <div className="mt-4 rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tone-warning-bg)', color: 'var(--tone-warning-text)' }}>
                      {submission.aiEvaluationError}
                    </div>
                  )}
                </div>
              )}

              {submission.integrityIndicators?.length ? (
                <div className="app-section-card p-5 sm:p-6">
                  <h2 className="app-title text-xl">{t('miniInternships.integrityTitle')}</h2>
                  <div className="mt-4 space-y-3">
                    {submission.integrityIndicators.map((indicator, index) => (
                      <div key={indicator.id || `${indicator.code || 'indicator'}-${index}`} className="rounded-2xl border border-[#D6DED7] p-4">
                        <p className="text-sm font-semibold text-[var(--surface-text-primary)]">
                          {indicator.reason}
                        </p>
                        <p className="mt-1 text-xs text-[var(--surface-text-muted)]">
                          {indicator.severity} {indicator.code ? `• ${indicator.code}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {submission.reviewedBy && (
                <div className="app-section-card p-5 sm:p-6">
                  <h2 className="app-title text-xl">{t('miniInternships.reviewedBy')}</h2>
                  <p className="mt-2 text-sm text-[var(--surface-text-muted)]">
                    {getPersonName(submission.reviewedBy, t('common.system'))}
                  </p>
                </div>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
};
