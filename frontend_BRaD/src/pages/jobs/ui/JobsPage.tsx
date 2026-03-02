import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { JobFilters } from '@features/job-filters';
import { JobsList } from '@widgets/jobs-list';
import { useEffect } from 'react';
import { useJobStore } from '@entities/job';

export const JobsPage = () => {
  const { loadJobs } = useJobStore();

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EBEDDF', paddingTop: '4rem' }}>
      <AppHeader />
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8" style={{ maxWidth: '1280px' }}>
        <Link to="/app" className="inline-flex items-center gap-2 mb-6 transition-colors" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>

        <div className="mb-6 sm:mb-8">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-2" style={{ color: '#333A2F' }}>Find Your Dream Job</h1>
          <p className="text-base sm:text-lg" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
            Discover remote opportunities from top companies worldwide
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="lg:col-span-1">
            <JobFilters />
          </div>
          <div className="lg:col-span-3">
            <JobsList />
          </div>
        </div>
      </main>
    </div>
  );
};
