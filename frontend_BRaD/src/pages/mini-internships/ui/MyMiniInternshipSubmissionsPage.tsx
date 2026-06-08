import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, FileCheck2, LayoutList, Search } from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input } from '@shared/ui';
import { useUISettings } from '@shared/lib/ui-settings';
import { isCandidateRole, useUserStore } from '@entities/user';
import { useMiniInternshipStore } from '@entities/mini-internship';
import { cardStyle, formatDateTime, formatEnumLabel, getPersonName, normalizeDecisionStatus } from './shared';

export const MyMiniInternshipSubmissionsPage = () => {
  const { t } = useUISettings();
  const { currentUser, isAuthenticated } = useUserStore();
  const { mySubmissions, loadMySubmissions, isLoading, error } = useMiniInternshipStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');

  const isAllowed = isAuthenticated && isCandidateRole(currentUser?.role);

  useEffect(() => {
    if (!isAllowed) {
      return;
    }

    void loadMySubmissions();
  }, [isAllowed, loadMySubmissions]);

  const filteredSubmissions = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return mySubmissions.filter((submission) => {
      if (statusFilter !== 'all' && submission.status !== statusFilter) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return [
        submission.miniInternship?.title || '',
        submission.miniInternship?.company?.name || '',
        submission.student?.email || '',
        getPersonName(submission.student, ''),
      ].some((value) => value.toLowerCase().includes(needle));
    });
  }, [mySubmissions, search, statusFilter]);

  if (!isAuthenticated) {
    return <Navigate to="/app/login" replace />;
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="app-page-main">
          <section className="app-section-card p-8 text-center">
            <LayoutList className="mx-auto h-12 w-12 text-[var(--surface-text-soft)]" />
            <h1 className="app-title mt-4 text-3xl">{t('miniInternships.accessDeniedTitle')}</h1>
            <p className="app-text-muted mt-2">{t('miniInternships.accessDeniedDescription')}</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell app-page">
      <AppHeader />

      <main className="app-page-main">
        <section className="app-section-card app-page-hero app-grid-backdrop relative overflow-hidden p-6 sm:p-8">
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="app-chip mb-4">
                <FileCheck2 className="h-3.5 w-3.5" />
                {t('miniInternships.mySubmissionsBadge')}
              </p>
              <h1 className="app-title text-3xl sm:text-4xl">{t('miniInternships.mySubmissionsTitle')}</h1>
              <p className="app-text-muted mt-3 max-w-2xl text-sm sm:text-base">
                {t('miniInternships.mySubmissionsDescription')}
              </p>
            </div>

            <div className="app-kpi-card p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                {t('miniInternships.totalSubmissions')}
              </p>
              <p className="mt-2 text-2xl font-extrabold text-[var(--surface-text-primary)]">
                {mySubmissions.length}
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
                {t('miniInternships.loading')}
              </div>
            )}
          </div>
        )}

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="app-section-card p-5 sm:p-6">
            <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
              {t('miniInternships.searchLabel')}
            </label>
            <div className="relative">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('miniInternships.searchSubmissionsPlaceholder')}
                className="pl-11"
              />
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--surface-text-soft)]" />
            </div>
          </div>

          <div className="app-section-card p-5 sm:p-6">
            <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
              {t('miniInternships.statusFilterLabel')}
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="flex h-11 w-full rounded-2xl border border-[#D6DED7] bg-white px-4 py-2 text-sm text-[#1D261F] dark:border-[#314036] dark:bg-[#111814] dark:text-[#E7EFE8]"
            >
              <option value="all">{t('miniInternships.status.all')}</option>
              <option value="DRAFT">{t('miniInternships.status.draft')}</option>
              <option value="IN_PROGRESS">{t('miniInternships.status.inProgress')}</option>
              <option value="SUBMITTED">{t('miniInternships.status.submitted')}</option>
              <option value="REVIEWED">{t('miniInternships.status.reviewed')}</option>
              <option value="REJECTED">{t('miniInternships.status.rejected')}</option>
            </select>
          </div>
        </section>

        <section className="mt-6">
          {!filteredSubmissions.length ? (
            <div className="app-section-card p-8 text-center">
              <LayoutList className="mx-auto h-12 w-12 text-[var(--surface-text-soft)]" />
              <h2 className="app-title mt-4 text-2xl">{t('miniInternships.mySubmissionsEmptyTitle')}</h2>
              <p className="app-text-muted mt-2">{t('miniInternships.mySubmissionsEmptyDescription')}</p>
              <div className="mt-6">
                <Link to="/app/mini-internships">
                  <Button variant="hero">{t('miniInternships.openCatalog')}</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredSubmissions.map((submission) => (
                <article key={submission.id} className="app-section-card p-5 sm:p-6" style={cardStyle}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                        {submission.miniInternship?.company?.name || t('miniInternships.companyFallback')}
                      </p>
                      <h3 className="mt-2 text-xl font-extrabold text-[var(--surface-text-primary)]">
                        {submission.miniInternship?.title || t('miniInternships.untitledTask')}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--surface-text-muted)]">
                        {getPersonName(submission.student, t('common.candidate'))}
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
                    <Link to={`/app/my-submissions/${submission.id}`}>
                      <Button variant="outline">
                        {t('miniInternships.openSubmission')}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    {submission.miniInternship?.id && (
                      <Link to={`/app/mini-internships/${submission.miniInternship.id}/submit`}>
                        <Button variant="hero">{t('miniInternships.continueAttempt')}</Button>
                      </Link>
                    )}
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
