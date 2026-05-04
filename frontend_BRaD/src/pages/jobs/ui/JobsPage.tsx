import { Link } from 'react-router-dom';
import { ArrowLeft, Briefcase, Sparkles } from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { JobFilters } from '@features/job-filters';
import { JobsList } from '@widgets/jobs-list';
import { useEffect } from 'react';
import { useJobStore } from '@entities/job';
import { useFavoritesStore } from '@entities/favorite';
import { isCandidateRole, useUserStore } from '@entities/user';

export const JobsPage = () => {
  const { loadJobs, jobs } = useJobStore();
  const { isAuthenticated, currentUser } = useUserStore();
  const { loadMyFavorites } = useFavoritesStore();

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!isAuthenticated || !isCandidateRole(currentUser?.role)) {
      return;
    }

    void loadMyFavorites({ limit: 100 });
  }, [currentUser?.role, isAuthenticated, loadMyFavorites]);

  return (
    <div className="min-h-screen app-shell app-page">
      <AppHeader />
      <main className="app-page-main">
        <Link to="/app" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#4B5F3E] transition-colors hover:text-[#2A3A22]">
          <ArrowLeft className="h-4 w-4" />
          Back to workspace
        </Link>

        <section className="app-section-card app-grid-backdrop relative overflow-hidden p-6 sm:p-8">
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="app-chip mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                Talent Marketplace
              </span>
              <h1 className="app-title text-3xl sm:text-4xl">Find roles that match your profile</h1>
              <p className="app-text-muted mt-3 max-w-2xl text-sm sm:text-base">
                Use smart filters, open details, save favorites, and apply with one clean flow.
              </p>
            </div>

            <div className="app-kpi-card flex items-center gap-3 p-4">
              <div className="rounded-xl bg-[#E8F0D8] p-2.5 text-[#24442E]">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#526347]">Available now</p>
                <p className="text-2xl font-extrabold text-[#1F2B18]">{jobs.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-4 lg:gap-6">
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-[104px]">
              <JobFilters />
            </div>
          </aside>
          <div className="lg:col-span-3">
            <JobsList />
          </div>
        </section>
      </main>
    </div>
  );
};
