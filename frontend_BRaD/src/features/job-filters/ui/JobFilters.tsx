import { useMemo } from 'react';
import { useJobStore, JobFilters as FiltersType, JobType } from '@entities/job';
import { Search, MapPin, Filter, RotateCcw, X, Tags } from 'lucide-react';
import { Button, Input } from '@shared/ui';
import { useUISettings } from '@shared/lib/ui-settings';

const jobTypes: (JobType | 'All')[] = ['All', 'Internship', 'Full-time', 'Part-time', 'Contract'];

export const JobFilters = () => {
  const { t } = useUISettings();
  const { filters, setFilters, jobs } = useJobStore();

  const topTags = useMemo(() => {
    const counts = jobs.reduce<Record<string, number>>((acc, job) => {
      job.tags.forEach((tag) => {
        const normalized = tag.trim();
        if (!normalized) {
          return;
        }

        acc[normalized] = (acc[normalized] || 0) + 1;
      });
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([tag]) => tag);
  }, [jobs]);

  const updateFilters = (next: Partial<FiltersType>) => {
    setFilters({
      ...filters,
      ...next,
    });
  };

  const resetFilters = () => {
    setFilters({});
  };

  const selectedTags = filters.tags || [];
  const hasActiveFilters = Boolean(filters.search || filters.location || filters.type || selectedTags.length);

  const toggleTag = (tag: string) => {
    const exists = selectedTags.includes(tag);
    const nextTags = exists ? selectedTags.filter((entry) => entry !== tag) : [...selectedTags, tag];

    updateFilters({ tags: nextTags.length ? nextTags : undefined });
  };

  const getJobTypeLabel = (type: JobType | 'All'): string => {
    if (type === 'All') {
      return t('jobs.filters.type.all');
    }
    if (type === 'Internship') {
      return t('jobs.filters.type.internship');
    }
    if (type === 'Full-time') {
      return t('jobs.filters.type.fullTime');
    }
    if (type === 'Part-time') {
      return t('jobs.filters.type.partTime');
    }
    return t('jobs.filters.type.contract');
  };

  return (
    <section className="app-section-card overflow-hidden p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-[var(--surface-chip)] p-2 text-[var(--surface-text-primary)]">
            <Filter className="h-4 w-4" />
          </div>
          <h3 className="app-title text-lg">{t('jobs.filters.title')}</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={resetFilters} disabled={!hasActiveFilters}>
          <RotateCcw className="h-4 w-4" />
          {t('jobs.filters.reset')}
        </Button>
      </div>

      {hasActiveFilters && (
        <div className="mb-4 rounded-xl border border-black/10 bg-[var(--surface-soft)] p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--surface-text-soft)]">
            {t('jobs.filters.active')}
          </p>
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <button
                onClick={() => updateFilters({ search: undefined })}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-base)] px-2.5 py-1 text-xs font-semibold text-[var(--surface-text-primary)]"
              >
                {t('jobs.filters.chip.search')}: {filters.search}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {filters.location && (
              <button
                onClick={() => updateFilters({ location: undefined })}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-base)] px-2.5 py-1 text-xs font-semibold text-[var(--surface-text-primary)]"
              >
                {t('jobs.filters.chip.location')}: {filters.location}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {filters.type && (
              <button
                onClick={() => updateFilters({ type: undefined })}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-base)] px-2.5 py-1 text-xs font-semibold text-[var(--surface-text-primary)]"
              >
                {t('jobs.filters.chip.type')}: {getJobTypeLabel(filters.type)}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {selectedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-base)] px-2.5 py-1 text-xs font-semibold text-[var(--surface-text-primary)]"
              >
                {tag}
                <X className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[var(--surface-text-soft)]">
            {t('jobs.filters.searchLabel')}
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--surface-text-soft)]" />
            <Input
              placeholder={t('jobs.filters.searchPlaceholder')}
              value={filters.search || ''}
              onChange={(e) => updateFilters({ search: e.target.value || undefined })}
              className="h-11 rounded-xl border-black/10 bg-[var(--surface-base)] pl-10"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[var(--surface-text-soft)]">
            {t('jobs.filters.locationLabel')}
          </label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--surface-text-soft)]" />
            <Input
              placeholder={t('jobs.filters.locationPlaceholder')}
              value={filters.location || ''}
              onChange={(e) => updateFilters({ location: e.target.value || undefined })}
              className="h-11 rounded-xl border-black/10 bg-[var(--surface-base)] pl-10"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[var(--surface-text-soft)]">
            {t('jobs.filters.employmentLabel')}
          </label>
          <div className="flex flex-wrap gap-2">
            {jobTypes.map((type) => {
              const isActive = filters.type === type || (!filters.type && type === 'All');

              return (
                <button
                  key={type}
                  onClick={() => updateFilters({ type: type === 'All' ? undefined : type })}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold tracking-wide transition-colors ${
                    isActive
                      ? 'bg-[var(--tone-info-bg)] text-[var(--tone-info-text)]'
                      : 'border border-black/10 bg-[var(--surface-soft)] text-[var(--surface-text-primary)] hover:bg-[var(--surface-chip)]'
                  }`}
                >
                  {getJobTypeLabel(type)}
                </button>
              );
            })}
          </div>
        </div>

        {topTags.length > 0 && (
          <div>
            <label className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--surface-text-soft)]">
              <Tags className="h-3.5 w-3.5" />
              {t('jobs.filters.popularSkills')}
            </label>
            <div className="flex flex-wrap gap-2">
              {topTags.map((tag) => {
                const isActive = selectedTags.includes(tag);

                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-[var(--tone-info-bg)] text-[var(--tone-info-text)]'
                        : 'border border-black/10 bg-[var(--surface-base)] text-[var(--surface-text-primary)] hover:bg-[var(--surface-subtle)]'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
