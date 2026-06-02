import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  MapPin,
  Search,
  Sparkles,
} from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { JobFilters } from '@features/job-filters';
import { JobsList } from '@widgets/jobs-list';
import { useJobStore } from '@entities/job';
import { useFavoritesStore } from '@entities/favorite';
import { Button, Input } from '@shared/ui';
import { isCandidateRole, useUserStore } from '@entities/user';
import { useUISettings } from '@shared/lib/ui-settings';

type CompanyDirectoryEntry = {
  name: string;
  employerId: string;
  logo?: string;
  vacancies: ReturnType<typeof useJobStore.getState>['jobs'];
  locations: string[];
  tags: string[];
};

export const JobsPage = () => {
  const { loadJobs, jobs } = useJobStore();
  const { isAuthenticated, currentUser } = useUserStore();
  const { loadMyFavorites } = useFavoritesStore();
  const { t } = useUISettings();
  const [activeView, setActiveView] = useState<'vacancies' | 'companies'>('vacancies');
  const [companySearch, setCompanySearch] = useState('');
  const [selectedCompanyName, setSelectedCompanyName] = useState('');

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!isAuthenticated || !isCandidateRole(currentUser?.role)) {
      return;
    }

    void loadMyFavorites({ limit: 100 });
  }, [currentUser?.role, isAuthenticated, loadMyFavorites]);

  const companies = useMemo<CompanyDirectoryEntry[]>(() => {
    const companiesMap = new Map<string, CompanyDirectoryEntry>();

    jobs.forEach((job) => {
      const key = job.company.trim().toLowerCase();
      const current = companiesMap.get(key);

      if (current) {
        current.vacancies.push(job);

        if (job.location && !current.locations.includes(job.location)) {
          current.locations.push(job.location);
        }

        job.tags.forEach((tag) => {
          if (!current.tags.includes(tag)) {
            current.tags.push(tag);
          }
        });

        return;
      }

      companiesMap.set(key, {
        name: job.company,
        employerId: job.employerId,
        logo: job.companyLogo,
        vacancies: [job],
        locations: job.location ? [job.location] : [],
        tags: [...job.tags],
      });
    });

    return [...companiesMap.values()]
      .map((company) => ({
        ...company,
        vacancies: [...company.vacancies].sort(
          (left, right) => new Date(right.postedAt).getTime() - new Date(left.postedAt).getTime(),
        ),
        tags: company.tags.slice(0, 8),
      }))
      .sort((left, right) => {
        if (right.vacancies.length !== left.vacancies.length) {
          return right.vacancies.length - left.vacancies.length;
        }

        return left.name.localeCompare(right.name);
      });
  }, [jobs]);

  const filteredCompanies = useMemo(() => {
    const needle = companySearch.trim().toLowerCase();

    if (!needle) {
      return companies;
    }

    return companies.filter((company) => {
      if (company.name.toLowerCase().includes(needle)) {
        return true;
      }

      return company.vacancies.some((job) => {
        return (
          job.title.toLowerCase().includes(needle) ||
          job.location.toLowerCase().includes(needle) ||
          job.tags.some((tag) => tag.toLowerCase().includes(needle))
        );
      });
    });
  }, [companies, companySearch]);

  useEffect(() => {
    if (!filteredCompanies.length) {
      setSelectedCompanyName('');
      return;
    }

    setSelectedCompanyName((current) => {
      if (current && filteredCompanies.some((company) => company.name === current)) {
        return current;
      }

      return filteredCompanies[0].name;
    });
  }, [filteredCompanies]);

  const selectedCompany =
    filteredCompanies.find((company) => company.name === selectedCompanyName) || filteredCompanies[0] || null;
  const totalCompanyVacancies = filteredCompanies.reduce((sum, company) => sum + company.vacancies.length, 0);

  return (
    <div className="min-h-screen app-shell app-page">
      <AppHeader />
      <main className="app-page-main">
        <Link
          to="/app"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--surface-text-muted)] transition-colors hover:text-[var(--surface-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('jobs.backToWorkspace')}
        </Link>

        <section className="app-section-card app-page-hero app-grid-backdrop relative overflow-hidden p-6 sm:p-8">
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="app-title text-3xl sm:text-4xl">{t('jobs.title')}</h1>
              <p className="app-text-muted mt-3 max-w-2xl text-sm sm:text-base">
                {t('jobs.description')}
              </p>
            </div>

            <div className="app-kpi-card flex items-center gap-3 p-4">
              <div className="rounded-xl bg-[var(--surface-chip)] p-2.5 text-[var(--surface-text-primary)]">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">{t('jobs.availableNow')}</p>
                <p className="text-2xl font-extrabold text-[var(--surface-text-primary)]">{jobs.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 flex flex-wrap gap-3">
          <Button variant={activeView === 'vacancies' ? 'hero' : 'outline'} onClick={() => setActiveView('vacancies')}>
            <Briefcase className="h-4 w-4" />
            {t('jobs.vacancies')}
          </Button>
          <Button variant={activeView === 'companies' ? 'hero' : 'outline'} onClick={() => setActiveView('companies')}>
            <Building2 className="h-4 w-4" />
            {t('jobs.companies')}
          </Button>
        </section>

        {activeView === 'vacancies' ? (
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
        ) : (
          <section className="mt-6 space-y-6">
            <div className="app-section-card p-5 sm:p-6">
              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-end">
                <div className="max-w-2xl">
                  <h2 className="app-title text-2xl sm:text-3xl">{t('jobs.companySearch.title')}</h2>
                  <p className="app-text-muted mt-2 text-sm sm:text-base">
                    {t('jobs.companySearch.description')}
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="app-kpi-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">{t('jobs.companySearch.found')}</p>
                      <p className="mt-2 text-2xl font-extrabold text-[var(--surface-text-primary)]">{filteredCompanies.length}</p>
                    </div>
                    <div className="app-kpi-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">{t('jobs.companySearch.openVacancies')}</p>
                      <p className="mt-2 text-2xl font-extrabold text-[var(--surface-text-primary)]">{totalCompanyVacancies}</p>
                    </div>
                    <div className="app-kpi-card p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">{t('jobs.companySearch.selectedCompany')}</p>
                      <p className="mt-2 text-2xl font-extrabold text-[var(--surface-text-primary)]">
                        {selectedCompany?.vacancies.length || 0}
                      </p>
                      <p className="mt-1 text-xs text-[var(--surface-text-soft)]">{t('jobs.companySearch.availableVacancies')}</p>
                    </div>
                  </div>
                </div>

                <div className="w-full xl:max-w-xl xl:justify-self-end">
                  <label className="mb-2 block text-sm font-semibold text-[var(--surface-text-primary)]">{t('jobs.companySearch.label')}</label>
                  <div className="relative">
                    <Input
                      value={companySearch}
                      onChange={(event) => setCompanySearch(event.target.value)}
                      placeholder={t('jobs.companySearch.placeholder')}
                      className="h-12 rounded-2xl border-black/10 bg-[var(--surface-soft)] pl-11"
                    />
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--surface-text-soft)]" />
                  </div>
                  <p className="mt-3 text-xs text-[var(--surface-text-soft)]">
                    {t('jobs.companySearch.listDescription')}
                  </p>
                </div>
              </div>
            </div>

            {!filteredCompanies.length ? (
              <div className="app-section-card p-8 text-center">
                <Building2 className="mx-auto h-12 w-12 text-[var(--surface-text-soft)]" />
                <h3 className="app-title mt-4 text-xl">{t('jobs.companySearch.emptyTitle')}</h3>
                <p className="app-text-muted mt-2 text-sm sm:text-base">
                  {t('jobs.companySearch.emptyDescription')}
                </p>
              </div>
            ) : (
              <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
                <div className="app-section-card p-5 sm:p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                        {t('jobs.companySearch.listTitle')}
                      </p>
                      <p className="mt-2 text-sm text-[var(--surface-text-muted)]">
                        {t('jobs.companySearch.listDescription')}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                        {t('jobs.companySearch.found')}
                      </p>
                      <p className="mt-1 text-xl font-extrabold text-[var(--surface-text-primary)]">{filteredCompanies.length}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 xl:max-h-[740px] xl:overflow-y-auto xl:pr-1">
                  {filteredCompanies.map((company) => {
                    const isSelected = selectedCompany?.name === company.name;

                    return (
                      <button
                        key={`${company.employerId}-${company.name}`}
                        type="button"
                        onClick={() => setSelectedCompanyName(company.name)}
                        className="block w-full rounded-[26px] p-5 text-left transition-all"
                        style={{
                          border: isSelected ? '1px solid var(--surface-border-strong)' : '1px solid var(--surface-border-soft)',
                          background: isSelected ? 'var(--surface-soft)' : 'var(--surface-base)',
                          boxShadow: isSelected ? '0 12px 28px rgba(20, 31, 23, 0.08)' : '0 1px 0 rgba(20, 31, 23, 0.03)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="app-title text-lg">{company.name}</h3>
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tone-success-bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--tone-success-text)]">
                                  <Check className="h-3 w-3" />
                                  {t('jobs.companySearch.selectedBadge')}
                                </span>
                              ) : null}
                            </div>
                            <p className="app-text-muted mt-2 text-sm">
                              {t('jobs.companySearch.vacancyCount', { count: company.vacancies.length })}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-[var(--surface-chip)] p-3 text-[var(--surface-text-primary)]">
                            <Building2 className="h-5 w-5" />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--surface-text-soft)]">
                          {company.locations.slice(0, 3).map((location) => (
                            <span
                              key={`${company.name}-${location}`}
                              className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-subtle)] px-3 py-1"
                            >
                              <MapPin className="h-3 w-3" />
                              {location}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {company.tags.slice(0, 4).map((tag) => (
                            <span
                              key={`${company.name}-${tag}`}
                              className="rounded-full bg-[var(--surface-base)] px-3 py-1 text-xs font-medium text-[var(--surface-text-primary)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedCompany ? (
                    <>
                      <div className="app-section-card p-5 sm:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">{t('jobs.companySearch.companyProfile')}</p>
                            <h3 className="app-title mt-2 text-2xl sm:text-3xl">{selectedCompany.name}</h3>
                            <p className="app-text-muted mt-2 text-sm sm:text-base">
                              {t('jobs.companySearch.openRolesDescription')}
                            </p>
                          </div>
                          <div className="app-kpi-card p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">{t('jobs.companySearch.openRoles')}</p>
                            <p className="mt-2 text-2xl font-extrabold text-[var(--surface-text-primary)]">
                              {selectedCompany.vacancies.length}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-3xl bg-[var(--surface-soft)] p-4">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                              <MapPin className="h-3.5 w-3.5" />
                              {t('jobs.companySearch.locations')}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {selectedCompany.locations.length > 0 ? selectedCompany.locations.slice(0, 6).map((location) => (
                                <span
                                  key={`${selectedCompany.name}-detail-${location}`}
                                  className="rounded-full bg-[var(--surface-base)] px-3 py-1 text-xs font-medium text-[var(--surface-text-primary)]"
                                >
                                  {location}
                                </span>
                              )) : (
                                <span className="text-sm text-[var(--surface-text-muted)]">—</span>
                              )}
                            </div>
                          </div>

                          <div className="rounded-3xl bg-[var(--surface-soft)] p-4">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                              <Sparkles className="h-3.5 w-3.5" />
                              {t('jobs.companySearch.topSkills')}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {selectedCompany.tags.length > 0 ? selectedCompany.tags.slice(0, 6).map((tag) => (
                                <span
                                  key={`${selectedCompany.name}-skill-${tag}`}
                                  className="rounded-full bg-[var(--surface-base)] px-3 py-1 text-xs font-medium text-[var(--surface-text-primary)]"
                                >
                                  {tag}
                                </span>
                              )) : (
                                <span className="text-sm text-[var(--surface-text-muted)]">—</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="app-section-card p-5 sm:p-6">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--surface-text-soft)]">
                            {t('jobs.companySearch.openRoles')}
                          </p>
                          <p className="app-text-muted mt-2 text-sm sm:text-base">
                            {t('jobs.companySearch.openRolesDescription')}
                          </p>
                        </div>

                        <div className="mt-5 space-y-4">
                        {selectedCompany.vacancies.map((job) => (
                          <div
                            key={job.id}
                            className="rounded-3xl border border-black/5 bg-[var(--surface-soft)] p-5"
                          >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <h4 className="text-lg font-bold text-[var(--surface-text-primary)]">{job.title}</h4>
                                <p className="mt-2 text-sm text-[var(--surface-text-muted)]">
                                  {job.location}
                                  {job.salary ? ` • ${job.salary}` : ''}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {job.tags.slice(0, 5).map((tag) => (
                                    <span
                                      key={`${job.id}-${tag}`}
                                      className="rounded-full bg-[var(--surface-base)] px-3 py-1 text-xs font-medium text-[var(--surface-text-primary)]"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <Link to={`/app/jobs/${job.id}`}>
                                <Button variant="outline">{t('jobs.viewVacancy')}</Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};
