import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCheck, FileStack, Search, ShieldAlert } from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input } from '@shared/ui';
import { useUISettings } from '@shared/lib/ui-settings';
import { isEmployerRole, useUserStore } from '@entities/user';
import { useMiniInternshipStore } from '@entities/mini-internship';
import { cardStyle, formatDateTime, formatEnumLabel, getPersonName, normalizeDecisionStatus } from '@pages/mini-internships/ui/shared';

export const EmployerMiniInternshipSubmissionsPage = () => {
  const { t } = useUISettings();
  const { id } = useParams<{ id: string }>();
  const { currentUser, isAuthenticated } = useUserStore();
  const {
    selectedMiniInternship,
    miniInternshipSubmissions,
    loadMiniInternship,
    loadSubmissionsForMiniInternship,
    isLoading,
    error,
  } = useMiniInternshipStore();
  const [search, setSearch] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<'all' | string>('all');

  const isAllowed = isAuthenticated && isEmployerRole(currentUser?.role);
  const miniInternship = selectedMiniInternship?.id === id ? selectedMiniInternship : null;

  useEffect(() => {
    if (!isAllowed || !id) {
      return;
    }

    void loadMiniInternship(id);
    void loadSubmissionsForMiniInternship(id);
  }, [id, isAllowed, loadMiniInternship, loadSubmissionsForMiniInternship]);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return miniInternshipSubmissions.filter((submission) => {
      if (decisionFilter !== 'all' && normalizeDecisionStatus(submission.decisionStatus) !== decisionFilter) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return [
        submission.student?.email || '',
        getPersonName(submission.student, ''),
        submission.miniInternship?.title || '',
        submission.miniInternship?.company?.name || '',
      ].some((value) => value.toLowerCase().includes(needle));
    });
  }, [decisionFilter, miniInternshipSubmissions, search]);

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
                {t('employerMiniInternships.submissionsBadge')}
              </p>
              <h1 className="app-title text-3xl sm:text-4xl">
                {miniInternship?.title || t('miniInternships.untitledTask')}
              </h1>
              <p className="app-text-muted mt-3 max-w-2xl text-sm sm:text-base">
                {t('employerMiniInternships.submissionsDescription')}
              </p>
            </div>

            <div className="app-kpi-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                {t('employerMiniInternships.submissionsCount')}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-[var(--surface-text-primary)]">
                {miniInternshipSubmissions.length}
              </p>
            </div>
          </div>
        </section>

        {(error || isLoading) && (
          <div className="mt-4 space-y-2">
            {error && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--tone-danger-bg)', color: 'var(--tone-danger-text)' }}>
                {error}
              </div>
            )}
            {isLoading && (
              <div className="rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--surface-soft)', color: 'var(--surface-text-primary)' }}>
                {t('employerMiniInternships.loading')}
              </div>
            )}
          </div>
        )}

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="app-section-card p-5 sm:p-6">
            <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
              {t('employerMiniInternships.searchLabel')}
            </label>
            <div className="relative">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('employerMiniInternships.searchSubmissionsPlaceholder')}
                className="pl-11"
              />
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--surface-text-soft)]" />
            </div>
          </div>

          <div className="app-section-card p-5 sm:p-6">
            <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
              {t('employerMiniInternships.decisionFilterLabel')}
            </label>
            <select
              value={decisionFilter}
              onChange={(event) => setDecisionFilter(event.target.value)}
              className="flex h-11 w-full rounded-2xl border border-[#D6DED7] bg-white px-4 py-2 text-sm text-[#1D261F] dark:border-[#314036] dark:bg-[#111814] dark:text-[#E7EFE8]"
            >
              <option value="all">{t('miniInternships.status.all')}</option>
              <option value="reviewed">{t('miniInternships.decision.reviewed')}</option>
              <option value="accepted">{t('miniInternships.decision.accepted')}</option>
              <option value="rejected">{t('miniInternships.decision.rejected')}</option>
              <option value="shortlisted">{t('miniInternships.decision.shortlisted')}</option>
            </select>
          </div>
        </section>

        <section className="mt-6">
          {!filteredItems.length ? (
            <div className="app-section-card p-8 text-center">
              <FileStack className="mx-auto h-12 w-12 text-[var(--surface-text-soft)]" />
              <h2 className="app-title mt-4 text-2xl">{t('employerMiniInternships.submissionsEmptyTitle')}</h2>
              <p className="app-text-muted mt-2">{t('employerMiniInternships.submissionsEmptyDescription')}</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredItems.map((submission) => (
                <article key={submission.id} className="app-section-card p-5 sm:p-6" style={cardStyle}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                        {getPersonName(submission.student, t('common.candidate'))}
                      </p>
                      <h3 className="mt-2 text-xl font-extrabold text-[var(--surface-text-primary)]">
                        {submission.miniInternship?.title || t('miniInternships.untitledTask')}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--surface-text-muted)]">
                        {submission.student?.email || t('common.noPhone')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="inline-flex rounded-full bg-[var(--surface-chip)] px-3 py-1 text-xs font-semibold text-[var(--surface-text-primary)]">
                        {formatEnumLabel(submission.status)}
                      </span>
                      <span className="inline-flex rounded-full border border-[#D6DED7] px-3 py-1 text-xs font-semibold text-[var(--surface-text-muted)]">
                        {formatEnumLabel(normalizeDecisionStatus(submission.decisionStatus))}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                        {t('miniInternships.submittedAt')}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                        {formatDateTime(submission.submittedAt || undefined)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                        {t('miniInternships.score')}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                        {submission.weightedScore ?? submission.averageScore ?? submission.overallScore ?? 0}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--surface-text-muted)]">
                    <span className="rounded-full border border-[#D6DED7] px-3 py-1">
                      {t('miniInternships.attemptNumber', { number: submission.attemptNumber })}
                    </span>
                    {submission.isLate && (
                      <span className="rounded-full border border-[#D6DED7] px-3 py-1">
                        {t('miniInternships.lateSubmission')}
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link to={`/app/employer/submissions/${submission.id}/review`}>
                      <Button variant="hero">{t('employerMiniInternships.review')}</Button>
                    </Link>
                    <Link to={`/app/mini-internships/${submission.miniInternshipId}`}>
                      <Button variant="outline">{t('employerMiniInternships.openTask')}</Button>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
