import { useJobStore, JobType } from '@entities/job';
import { Search, MapPin, Filter, RotateCcw } from 'lucide-react';
import { Button, Input } from '@shared/ui';

const jobTypes: (JobType | 'All')[] = ['All', 'Internship', 'Full-time', 'Part-time', 'Contract'];

export const JobFilters = () => {
  const { filters, setFilters } = useJobStore();

  const resetFilters = () => {
    setFilters({});
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
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#526347]">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#65785A]" />
            <Input
              placeholder="Job title, company, skill"
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="h-11 rounded-xl border-[#9FB08A]/35 bg-white pl-10"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#526347]">Location</label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#65785A]" />
            <Input
              placeholder="Remote, Berlin, Almaty"
              value={filters.location || ''}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              className="h-11 rounded-xl border-[#9FB08A]/35 bg-white pl-10"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#526347]">Employment</label>
          <div className="flex flex-wrap gap-2">
            {jobTypes.map((type) => {
              const isActive = filters.type === type || (!filters.type && type === 'All');

              return (
                <button
                  key={type}
                  onClick={() => setFilters({ ...filters, type: type === 'All' ? undefined : type })}
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
      </div>
    </section>
  );
};
