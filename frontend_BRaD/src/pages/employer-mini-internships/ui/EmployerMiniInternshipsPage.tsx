import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CheckCheck, FileStack, Plus, Search, ShieldAlert } from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input } from '@shared/ui';
import { useUISettings } from '@shared/lib/ui-settings';
import { isEmployerRole, useUserStore } from '@entities/user';
import { useMiniInternshipStore } from '@entities/mini-internship';
import { cardStyle, formatDateTime, formatEnumLabel } from '@pages/mini-internships/ui/shared';

export const EmployerMiniInternshipsPage = () => {
  const { t } = useUISettings();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated } = useUserStore();
  const { myMiniInternships, loadMyMiniInternships, publishMiniInternship, closeMiniInternship, isLoading, error } =
    useMiniInternshipStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [actionError, setActionError] = useState<string | null>(null);

  const isAllowed = isAuthenticated && isEmployerRole(currentUser?.role);

  useEffect(() => {
    if (!isAllowed) {
      return;
    }

    void loadMyMiniInternships();
  }, [isAllowed, loadMyMiniInternships]);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return myMiniInternships.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return [item.title, item.roleCategory, item.description || '', item.vacancy?.title || ''].some(
        (value) => value.toLowerCase().includes(needle),
      );
    });
  }, [myMiniInternships, search, statusFilter]);

  const handlePublish = async (id: string) => {
    setActionError(null);

    try {
      await publishMiniInternship(id);
      await loadMyMiniInternships();
    } catch (publishError) {
      setActionError(publishError instanceof Error ? publishError.message : t('employerMiniInternships.publishFailed'));
    }
  };

  const handleClose = async (id: string) => {
    setActionError(null);

    try {
      await closeMiniInternship(id);
      await loadMyMiniInternships();
    } catch (closeError) {
      setActionError(closeError instanceof Error ? closeError.message : t('employerMiniInternships.closeFailed'));
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
        <section className="app-section-card app-page-hero app-grid-backdrop relative overflow-hidden p-6 sm:p-8">
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="app-chip mb-4">
                <CheckCheck className="h-3.5 w-3.5" />
                {t('employerMiniInternships.badge')}
              </p>
              <h1 className="app-title text-3xl sm:text-4xl">{t('employerMiniInternships.title')}</h1>
              <p className="app-text-muted mt-3 max-w-2xl text-sm sm:text-base">
                {t('employerMiniInternships.description')}
              </p>
            </div>

            <Button variant="hero" size="lg" onClick={() => navigate('/app/employer/mini-internships/create')}>
              <Plus className="h-4 w-4" />
              {t('employerMiniInternships.create')}
            </Button>
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
                placeholder={t('employerMiniInternships.searchPlaceholder')}
                className="pl-11"
              />
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--surface-text-soft)]" />
            </div>
          </div>

          <div className="app-section-card p-5 sm:p-6">
            <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">
              {t('employerMiniInternships.statusFilterLabel')}
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="flex h-11 w-full rounded-2xl border border-[#D6DED7] bg-white px-4 py-2 text-sm text-[#1D261F] dark:border-[#314036] dark:bg-[#111814] dark:text-[#E7EFE8]"
            >
              <option value="all">{t('miniInternships.status.all')}</option>
              <option value="DRAFT">{t('miniInternships.status.draft')}</option>
              <option value="PUBLISHED">{t('miniInternships.status.published')}</option>
              <option value="CLOSED">{t('miniInternships.status.closed')}</option>
            </select>
          </div>
        </section>

        <section className="mt-6">
          {!filteredItems.length ? (
            <div className="app-section-card p-8 text-center">
              <FileStack className="mx-auto h-12 w-12 text-[var(--surface-text-soft)]" />
              <h2 className="app-title mt-4 text-2xl">{t('employerMiniInternships.emptyTitle')}</h2>
              <p className="app-text-muted mt-2">{t('employerMiniInternships.emptyDescription')}</p>
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
                    <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                        {t('miniInternships.deadline')}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                        {formatDateTime(item.deadline)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--surface-soft)] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                        {t('employerMiniInternships.submissionsCount')}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--surface-text-primary)]">
                        {item.submissionCount || 0}
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
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link to={`/app/employer/mini-internships/${item.id}/edit`}>
                      <Button variant="outline">{t('employerMiniInternships.edit')}</Button>
                    </Link>
                    <Link to={`/app/employer/mini-internships/${item.id}/submissions`}>
                      <Button variant="outline">{t('employerMiniInternships.submissions')}</Button>
                    </Link>
                    {item.status === 'DRAFT' ? (
                      <Button variant="hero" onClick={() => void handlePublish(item.id)}>
                        {t('employerMiniInternships.publish')}
                      </Button>
                    ) : item.status === 'PUBLISHED' ? (
                      <Button variant="outline" onClick={() => void handleClose(item.id)}>
                        {t('employerMiniInternships.close')}
                      </Button>
                    ) : null}
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
