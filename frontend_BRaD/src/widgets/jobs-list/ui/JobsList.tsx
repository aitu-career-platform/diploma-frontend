import { useMemo, useState } from 'react';
import { SearchX } from 'lucide-react';
import { useJobStore } from '@entities/job';
import { Button } from '@shared/ui';
import { JobCard } from '@widgets/job-card';

type SortOption = 'relevance' | 'newest' | 'leastApplied';

export const JobsList = () => {
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
        <p className="app-text-muted text-sm sm:text-base">Loading vacancies...</p>
      </div>
    );
  }

  if (filteredJobs.length === 0) {
    return (
      <div className="app-section-card flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="rounded-2xl bg-[#E8F0D8] p-3 text-[#24442E]">
          <SearchX className="h-7 w-7" />
        </div>
        <h3 className="app-title text-xl">No vacancies match the filters</h3>
        <p className="app-text-muted max-w-md text-sm sm:text-base">
          Clear or adjust filters to see more options.
        </p>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={() => setFilters({})}>
            Reset filters
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#556849]">Search results</p>
            <h3 className="app-title mt-1 text-xl">
              {sortedJobs.length} {sortedJobs.length === 1 ? 'vacancy' : 'vacancies'} found
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sort-vacancies" className="text-sm font-semibold text-[#4D6141]">
              Sort:
            </label>
            <select
              id="sort-vacancies"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="h-10 rounded-xl border border-[#9FB08A]/35 bg-white px-3 text-sm font-medium text-[#2D3D25] focus:outline-none focus:ring-2 focus:ring-[#2B6A4D]/30"
            >
              <option value="relevance">Relevance</option>
              <option value="newest">Newest first</option>
              <option value="leastApplied">Lower competition</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-[#9FB08A]/30 bg-[#F5F9EB] px-3 py-2">
            <p className="text-sm text-[#495D3D]">Filters are active. You are seeing narrowed results.</p>
            <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
              Clear all
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
