import { useMemo, useState } from 'react';
import { SearchX } from 'lucide-react';
import { useJobStore } from '@entities/job';
import { Button } from '@shared/ui';
import { JobCard } from '@widgets/job-card';
import { useUISettings } from '@shared/lib/ui-settings';

type SortOption = 'relevance' | 'newest' | 'leastApplied';

export const JobsList = () => {
  const { t } = useUISettings();
  const { filteredJobs, isLoading, filters, setFilters } = useJobStore();
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  const hasActiveFilters = Boolean(
    filters.search || filters.location || filters.type || (filters.tags && filters.tags.length > 0),
  );

  const sortedJobs = useMemo(() => {
    const list = [...filteredJobs];

    if (sortBy === 'newest') {
      return list.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    }

    if (sortBy === 'leastApplied') {
      return list.sort((a, b) => a.applicationsCount - b.applicationsCount);
    }

    return list;
  }, [filteredJobs, sortBy]);

  if (isLoading) {
    return (
      <div className="app-section-card flex items-center justify-center py-16">
        <p className="app-text-muted text-sm sm:text-base">{t('jobs.list.loading')}</p>
      </div>
    );
  }

  if (filteredJobs.length === 0) {
    return (
      <div className="app-section-card flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="rounded-2xl bg-[var(--surface-chip)] p-3 text-[var(--surface-text-primary)]">
          <SearchX className="h-7 w-7" />
        </div>
        <h3 className="app-title text-xl">{t('jobs.list.emptyTitle')}</h3>
        <p className="app-text-muted max-w-md text-sm sm:text-base">
          {t('jobs.list.emptyDescription')}
        </p>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={() => setFilters({})}>
            {t('jobs.list.resetFilters')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="app-section-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">{t('jobs.list.searchResults')}</p>
            <h3 className="app-title mt-1 text-xl">
              {t('jobs.list.resultsFound', { count: sortedJobs.length })}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sort-vacancies" className="text-sm font-semibold text-[var(--surface-text-muted)]">
              {t('jobs.list.sortLabel')}
            </label>
            <select
              id="sort-vacancies"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="h-10 rounded-xl border border-black/10 bg-[var(--surface-base)] px-3 text-sm font-medium text-[var(--surface-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--tone-info-bg)]"
            >
              <option value="relevance">{t('jobs.list.sort.relevance')}</option>
              <option value="newest">{t('jobs.list.sort.newest')}</option>
              <option value="leastApplied">{t('jobs.list.sort.leastApplied')}</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-black/10 bg-[var(--surface-soft)] px-3 py-2">
            <p className="text-sm text-[var(--surface-text-muted)]">{t('jobs.list.activeFiltersNotice')}</p>
            <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
              {t('jobs.list.clearAll')}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedJobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </section>
  );
};
