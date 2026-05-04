import { SearchX } from 'lucide-react';
import { useJobStore } from '@entities/job';
import { JobCard } from '@widgets/job-card';

export const JobsList = () => {
  const { filteredJobs, isLoading } = useJobStore();

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
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filteredJobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
};
