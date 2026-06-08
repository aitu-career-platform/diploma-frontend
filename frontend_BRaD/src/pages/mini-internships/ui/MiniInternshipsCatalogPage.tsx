import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, BookOpenText, Building2, Search, Sparkles } from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input } from '@shared/ui';
import { isCandidateRole, useUserStore } from '@entities/user';
import { useMiniInternshipStore } from '@entities/mini-internship';
import { useUISettings } from '@shared/lib/ui-settings';
import { cardStyle, formatDateTime, formatEnumLabel } from './shared';

export const MiniInternshipsCatalogPage = () => {
  const { t } = useUISettings();
  const { currentUser, isAuthenticated } = useUserStore();
  const { publishedMiniInternships, loadPublishedMiniInternships, isLoading, error } =
    useMiniInternshipStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'DRAFT' | 'PUBLISHED' | 'CLOSED'>(
    'PUBLISHED',
  );

  const isAllowed = isAuthenticated && isCandidateRole(currentUser?.role);

  useEffect(() => {
    if (!isAllowed) {
      return;
    }

    void loadPublishedMiniInternships();
  }, [isAllowed, loadPublishedMiniInternships]);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return publishedMiniInternships.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return [
        item.title,
        item.roleCategory,
        item.description || '',
        item.company?.name || '',
        item.vacancy?.title || '',
      ].some((value) => value.toLowerCase().includes(needle));
    });
  }, [publishedMiniInternships, search, statusFilter]);

  if (!isAuthenticated) {
    return <Navigate to="/app/login" replace />;
  }

  if (!isAllowed) {
    return (
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="app-page-main">
          <section className="app-section-card p-8 text-center">
            <BookOpenText className="mx-auto h-12 w-12 text-[var(--surface-text-soft)]" />
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
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="app-chip mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                {t('miniInternships.badge')}
              </span>
              <h1 className="app-title text-3xl sm:text-4xl">{t('miniInternships.catalogTitle')}</h1>
              <p className="app-text-muted mt-3 max-w-2xl text-sm sm:text-base">
                {t('miniInternships.catalogDescription')}
              </p>
            </div>

            <div className="app-kpi-card flex items-center gap-3 p-4">
              <div className="rounded-xl bg-[var(--surface-chip)] p-2.5 text-[var(--surface-text-primary)]">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                  {t('miniInternships.publishedCount')}
                </p>
                <p className="text-2xl font-extrabold text-[var(--surface-text-primary)]">
                  {publishedMiniInternships.length}
                </p>
              </div>
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
                placeholder={t('miniInternships.searchPlaceholder')}
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
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | 'DRAFT' | 'PUBLISHED' | 'CLOSED')
              }
              className="flex h-11 w-full rounded-2xl border border-[#D6DED7] bg-white px-4 py-2 text-sm text-[#1D261F] dark:border-[#314036] dark:bg-[#111814] dark:text-[#E7EFE8]"
            >
              <option value="PUBLISHED">{t('miniInternships.status.published')}</option>
              <option value="all">{t('miniInternships.status.all')}</option>
              <option value="DRAFT">{t('miniInternships.status.draft')}</option>
              <option value="CLOSED">{t('miniInternships.status.closed')}</option>
            </select>
          </div>
        </section>

        <section className="mt-6">
          {!filteredItems.length ? (
            <div className="app-section-card p-8 text-center">
              <BookOpenText className="mx-auto h-12 w-12 text-[var(--surface-text-soft)]" />
              <h2 className="app-title mt-4 text-2xl">{t('miniInternships.emptyTitle')}</h2>
              <p className="app-text-muted mt-2">{t('miniInternships.emptyDescription')}</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredItems.map((item) => (
                <article key={item.id} className="app-section-card p-5 sm:p-6" style={cardStyle}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                        {item.company?.name || t('miniInternships.companyFallback')}
                      </p>
                      <h3 className="mt-2 text-xl font-extrabold text-[var(--surface-text-primary)]">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--surface-text-muted)]">
                        {item.description || item.taskInstructions || t('miniInternships.noDescription')}
                      </p>
                    </div>

                    <span className="inline-flex rounded-full bg-[var(--surface-chip)] px-3 py-1 text-xs font-semibold text-[var(--surface-text-primary)]">
                      {formatEnumLabel(item.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[var(--surface-soft)] p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--surface-text-soft)]">
                        {t('miniInternships.deadline')}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--surface-text-primary)]">
                        {formatDateTime(item.deadline)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--surface-soft)] p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--surface-text-soft)]">
                        {t('miniInternships.allowedAttempts')}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--surface-text-primary)]">
                        {item.allowedAttempts}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--surface-text-muted)]">
                    <span className="rounded-full border border-[#D6DED7] px-3 py-1">
                      {item.roleCategory || t('miniInternships.roleFallback')}
                    </span>
                    {item.vacancy?.title && (
                      <span className="rounded-full border border-[#D6DED7] px-3 py-1">
                        {item.vacancy.title}
                      </span>
                    )}
                    <span className="rounded-full border border-[#D6DED7] px-3 py-1">
                      {t('miniInternships.criteriaCount', { count: item.skillCriteria.length })}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link to={`/app/mini-internships/${item.id}`}>
                      <Button variant="outline">
                        {t('miniInternships.openDetails')}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to={`/app/mini-internships/${item.id}/submit`}>
                      <Button variant="hero">{t('miniInternships.startOrContinue')}</Button>
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
