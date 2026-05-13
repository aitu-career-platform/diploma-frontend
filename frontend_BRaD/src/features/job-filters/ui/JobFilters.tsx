import { useMemo } from 'react';
import { useJobStore, JobFilters as FiltersType, JobType } from '@entities/job';
import { Search, MapPin, Filter, RotateCcw, X, Tags } from 'lucide-react';
import { Button, Input } from '@shared/ui';

const jobTypes: (JobType | 'All')[] = ['All', 'Internship', 'Full-time', 'Part-time', 'Contract'];

export const JobFilters = () => {
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

  return (
    <section className="app-section-card overflow-hidden p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-[#E8F0D8] p-2 text-[#24442E]">
            <Filter className="h-4 w-4" />
          </div>
          <h3 className="app-title text-lg">Filters</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={resetFilters} disabled={!hasActiveFilters}>
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      {hasActiveFilters && (
        <div className="mb-4 rounded-xl border border-[#9FB08A]/35 bg-[#F4F8EA] p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#4E6342]">
            Active Filters
          </p>
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <button
                onClick={() => updateFilters({ search: undefined })}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#2E3E26]"
              >
                Search: {filters.search}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {filters.location && (
              <button
                onClick={() => updateFilters({ location: undefined })}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#2E3E26]"
              >
                Location: {filters.location}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {filters.type && (
              <button
                onClick={() => updateFilters({ type: undefined })}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#2E3E26]"
              >
                Type: {filters.type}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {selectedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#2E3E26]"
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
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#526347]">
            Search by role or company
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#65785A]" />
            <Input
              placeholder="Job title, company, skill"
              value={filters.search || ''}
              onChange={(e) => updateFilters({ search: e.target.value || undefined })}
              className="h-11 rounded-xl border-[#9FB08A]/35 bg-white pl-10"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#526347]">
            City or format
          </label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#65785A]" />
            <Input
              placeholder="Remote, Berlin, Almaty"
              value={filters.location || ''}
              onChange={(e) => updateFilters({ location: e.target.value || undefined })}
              className="h-11 rounded-xl border-[#9FB08A]/35 bg-white pl-10"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#526347]">
            Employment
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
                      ? 'bg-[#1F2B18] text-white'
                      : 'border border-[#9FB08A]/35 bg-[#F4F8EA] text-[#2D3D25] hover:bg-[#E8F0D8]'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {topTags.length > 0 && (
          <div>
            <label className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#526347]">
              <Tags className="h-3.5 w-3.5" />
              Popular skills
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
                        ? 'bg-[#2B6A4D] text-white'
                        : 'border border-[#9FB08A]/35 bg-white text-[#2D3D25] hover:bg-[#EEF5E0]'
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
