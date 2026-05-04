import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, DollarSign, Heart, Sparkles } from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Textarea } from '@shared/ui';
import { useJobStore } from '@entities/job';
import { isCandidateRole, useUserStore } from '@entities/user';
import { useEffect, useState } from 'react';
import { useApplicationStore } from '@entities/application';
import { useFavoritesStore } from '@entities/favorite';

export const JobDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { jobs, isLoading, loadJobs } = useJobStore();
  const { currentUser, isAuthenticated } = useUserStore();
  const { applyToVacancy, isMutating } = useApplicationStore();
  const {
    favoriteIds,
    countsByVacancyId,
    loadMyFavorites,
    toggleFavorite,
    isMutating: isFavoriteMutating,
  } = useFavoritesStore();

  const [coverLetter, setCoverLetter] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [latestApplicationId, setLatestApplicationId] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  useEffect(() => {
    if (jobs.length === 0) {
      void loadJobs();
    }
  }, [jobs.length, loadJobs]);

  useEffect(() => {
    if (!isAuthenticated || !isCandidateRole(currentUser?.role)) {
      return;
    }

    void loadMyFavorites({ limit: 100 });
  }, [currentUser?.role, isAuthenticated, loadMyFavorites]);

  const job = jobs.find((j) => j.id === id);
  const isCandidate = isAuthenticated && isCandidateRole(currentUser?.role);
  const isFavorite = job ? favoriteIds.has(job.id) : false;
  const favoritesCount = job ? countsByVacancyId[job.id] ?? job.favoritesCount ?? 0 : 0;

  const handleApply = async () => {
    if (!job) {
      return;
    }

    setApplyError(null);
    setApplySuccess(null);

    try {
      const application = await applyToVacancy(job.id, coverLetter);
      setLatestApplicationId(application.id);
      setApplySuccess('Application submitted. You can track it on the Applications page.');
      setCoverLetter('');
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : 'Failed to submit application');
    }
  };

  const handleToggleFavorite = async () => {
    if (!job || !isCandidate) {
      return;
    }

    setFavoriteError(null);

    try {
      await toggleFavorite(job.id);
    } catch (error) {
      setFavoriteError(error instanceof Error ? error.message : 'Failed to update favorites');
    }
  };

  if (!job && isLoading) {
    return (
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="app-page-main">
          <div className="app-section-card p-8 text-center">
            <h1 className="app-title text-3xl">Loading vacancy...</h1>
          </div>
        </main>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="app-page-main">
          <div className="app-section-card p-8 text-center">
            <h1 className="app-title mb-4 text-3xl">Vacancy not found</h1>
            <Link to="/app/jobs">
              <Button variant="hero">Back to jobs</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell app-page">
      <AppHeader />
      <main className="app-page-main">
        <Link
          to="/app/jobs"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#4B5F3E] transition-colors hover:text-[#2A3A22]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to jobs
        </Link>

        <section className="app-section-card app-grid-backdrop relative overflow-hidden p-6 sm:p-8">
          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-4 sm:gap-5">
              <img
                src={job.companyLogo || '/images/companies/default_company.jpg'}
                alt={job.company}
                className="h-16 w-16 rounded-2xl border border-[#2B3B23]/10 object-cover sm:h-20 sm:w-20"
              />
              <div className="min-w-0">
                <span className="app-chip mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Vacancy Details
                </span>
                <h1 className="app-title text-2xl sm:text-4xl">{job.title}</h1>
                <p className="app-text-muted mt-1 text-base sm:text-lg">{job.company}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#526347] sm:text-sm">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#9FB08A]/35 bg-[#F5F9EB] px-3 py-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {job.location}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#9FB08A]/35 bg-[#F5F9EB] px-3 py-1">
                    <Clock className="h-3.5 w-3.5" />
                    {job.type}
                  </span>
                  {job.salary && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#9FB08A]/35 bg-[#F5F9EB] px-3 py-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      {job.salary}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="app-kpi-card shrink-0 px-4 py-3 text-sm text-[#485D3D]">
              <p>Posted {new Date(job.postedAt).toLocaleDateString()}</p>
              <p>{job.applicationsCount} applications</p>
              <p>{favoritesCount} saved</p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-2">
            <div className="app-section-card p-6 sm:p-7">
              <h2 className="app-title mb-3 text-xl">Overview</h2>
              <p className="app-text-muted leading-7">{job.description}</p>
            </div>

            <div className="app-section-card p-6 sm:p-7">
              <h2 className="app-title mb-3 text-xl">Requirements</h2>
              <ul className="space-y-2.5">
                {job.requirements.map((req, index) => (
                  <li key={index} className="app-text-muted flex items-start gap-2 leading-6">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#2B6A4D]" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <aside className="lg:col-span-1">
            <div className="app-section-card lg:sticky lg:top-[104px] p-5 sm:p-6">
              <h3 className="app-title mb-3 text-lg">Apply to this role</h3>

              {isCandidate ? (
                <div className="space-y-3">
                  <Button
                    variant={isFavorite ? 'default' : 'outline'}
                    size="lg"
                    className="w-full"
                    onClick={() => void handleToggleFavorite()}
                    disabled={isFavoriteMutating}
                  >
                    <Heart className="h-4 w-4" style={{ fill: isFavorite ? 'currentColor' : 'transparent' }} />
                    {isFavorite ? 'Saved in favorites' : 'Save to favorites'}
                  </Button>

                  <Textarea
                    value={coverLetter}
                    onChange={(event) => setCoverLetter(event.target.value)}
                    placeholder="Optional cover letter"
                    maxLength={4000}
                    className="min-h-[120px] rounded-xl border-[#9FB08A]/35 bg-white"
                  />

                  <Button variant="hero" size="lg" className="w-full" onClick={() => void handleApply()} disabled={isMutating}>
                    {isMutating ? 'Submitting...' : 'Apply now'}
                  </Button>

                  {applyError && (
                    <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{applyError}</div>
                  )}

                  {applySuccess && (
                    <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      {applySuccess} <Link to="/app/applications" className="underline">Open applications</Link>
                      {latestApplicationId && (
                        <>
                          {' · '}
                          <Link to={`/app/chat?applicationId=${latestApplicationId}`} className="underline">
                            Open chat
                          </Link>
                        </>
                      )}
                    </div>
                  )}

                  {favoriteError && (
                    <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{favoriteError}</div>
                  )}

                  <div className="rounded-xl border border-[#2B3B23]/10 bg-[#F4F8EA] px-3 py-2 text-xs leading-5 text-[#4A5E3D]">
                    Chat opens automatically after you submit an application.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button variant="hero" size="lg" className="w-full" disabled>
                    Sign in to apply
                  </Button>
                  <p className="app-text-muted text-sm">Only authorized candidates can apply and open related chats.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
