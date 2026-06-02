import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Building2, GraduationCap, RefreshCcw, Users } from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input } from '@shared/ui';
import api, { getApiErrorMessage } from '@shared/lib/api';
import { isUniversityRole, useUserStore } from '@entities/user';

type UniversityStatsPayload = {
  university?: {
    id: string;
    name: string;
    shortName?: string | null;
    city?: string | null;
    country?: string | null;
  };
  totals?: {
    candidates?: number;
    students?: number;
    graduates?: number;
    openToWork?: number;
    withResume?: number;
    withExperience?: number;
  };
  salary?: {
    averageDesiredSalary?: number | null;
  };
  distributions?: {
    desiredRoles?: Array<{ value: string; count: number }>;
    graduationYears?: Array<{ value: string; count: number }>;
    educationLevels?: Array<{ value: string; count: number }>;
  };
};

type UniversityCandidate = {
  id: string;
  user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  desiredRole?: string | null;
  graduationYear?: number | null;
  city?: string | null;
  isNonStudent?: boolean;
  openToWork?: boolean;
  _count?: {
    resumes?: number;
    experiences?: number;
    skills?: number;
  };
};

const cardStyle = {
  backgroundColor: 'var(--surface-base)',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
};

const formatName = (candidate: UniversityCandidate): string => {
  const first = candidate.user?.firstName || '';
  const last = candidate.user?.lastName || '';
  const full = `${first} ${last}`.trim();
  return full || candidate.user?.email || 'Candidate';
};

export const UniversityPage = () => {
  const { isAuthenticated, currentUser } = useUserStore();

  const [stats, setStats] = useState<UniversityStatsPayload | null>(null);
  const [items, setItems] = useState<UniversityCandidate[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<'ALL' | 'STUDENTS' | 'GRADUATES'>('ALL');
  const [query, setQuery] = useState('');

  const isUniversity = isUniversityRole(currentUser?.role);

  const totalCandidates = stats?.totals?.candidates || 0;
  const studentsCount = stats?.totals?.students || 0;
  const graduatesCount = stats?.totals?.graduates || 0;
  const averageSalary = stats?.salary?.averageDesiredSalary;

  const topDesiredRoles = useMemo(
    () => (stats?.distributions?.desiredRoles || []).slice(0, 6),
    [stats?.distributions?.desiredRoles],
  );

  const loadStats = async () => {
    if (!isUniversity) {
      return;
    }

    setIsLoadingStats(true);
    setError(null);

    try {
      const response = await api.get('/universities/me/stats');
      setStats(response.data as UniversityStatsPayload);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Failed to load university statistics'));
      setStats(null);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadCandidates = async () => {
    if (!isUniversity) {
      return;
    }

    setIsLoadingCandidates(true);
    setError(null);

    try {
      const response = await api.get('/universities/me/candidates', {
        params: {
          segment,
          q: query || undefined,
          limit: 50,
          offset: 0,
        },
      });

      const payload = response.data as { items?: UniversityCandidate[] };
      setItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, 'Failed to load university candidates'));
      setItems([]);
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  useEffect(() => {
    if (!isUniversity) {
      return;
    }

    void loadStats();
  }, [isUniversity]);

  useEffect(() => {
    if (!isUniversity) {
      return;
    }

    void loadCandidates();
  }, [isUniversity, query, segment]);

  if (!isAuthenticated) {
    return <Navigate to="/app/login" replace />;
  }

  if (!isUniversity) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen app-shell app-page">
      <AppHeader />

      <main className="app-page-main">
        <section className="app-section-card app-page-hero p-6 sm:p-7" style={cardStyle}>
          <div className="app-toolbar">
            <div>
              <p className="app-section-eyebrow">
                University dashboard
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[var(--surface-text-primary)] sm:text-3xl">
                {stats?.university?.shortName || stats?.university?.name || 'University'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--surface-text-muted)] sm:text-base">
                {stats?.university?.city || 'City not set'}
                {stats?.university?.country ? `, ${stats.university.country}` : ''}
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                void loadStats();
                void loadCandidates();
              }}
              disabled={isLoadingStats || isLoadingCandidates}
              className="inline-flex items-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {error && (
            <div
              className="mt-4 rounded-xl px-4 py-3 text-sm"
              style={{ backgroundColor: 'var(--tone-danger-bg)', color: 'var(--tone-danger-text)' }}
            >
              {error}
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="app-kpi-card p-5" style={cardStyle}>
            <div className="inline-flex rounded-xl bg-[var(--surface-chip)] p-2 text-[var(--surface-text-primary)]">
              <Users className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm text-[var(--surface-text-soft)]">Total candidates</p>
            <p className="mt-1 text-2xl font-bold text-[var(--surface-text-primary)]">{totalCandidates}</p>
          </article>

          <article className="app-kpi-card p-5" style={cardStyle}>
            <div className="inline-flex rounded-xl bg-[var(--surface-chip)] p-2 text-[var(--surface-text-primary)]">
              <GraduationCap className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm text-[var(--surface-text-soft)]">Students</p>
            <p className="mt-1 text-2xl font-bold text-[var(--surface-text-primary)]">{studentsCount}</p>
          </article>

          <article className="app-kpi-card p-5" style={cardStyle}>
            <div className="inline-flex rounded-xl bg-[var(--surface-chip)] p-2 text-[var(--surface-text-primary)]">
              <Building2 className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm text-[var(--surface-text-soft)]">Graduates</p>
            <p className="mt-1 text-2xl font-bold text-[var(--surface-text-primary)]">{graduatesCount}</p>
          </article>

          <article className="app-kpi-card p-5" style={cardStyle}>
            <div className="inline-flex rounded-xl bg-[var(--surface-chip)] p-2 text-[var(--surface-text-primary)]">
              <Users className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm text-[var(--surface-text-soft)]">Avg desired salary</p>
            <p className="mt-1 text-2xl font-bold text-[var(--surface-text-primary)]">
              {averageSalary ? `${averageSalary.toLocaleString()} ₸` : '—'}
            </p>
          </article>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[360px_1fr]">
          <article className="app-section-card p-5" style={cardStyle}>
            <div className="app-section-heading">
              <p className="app-section-eyebrow">Snapshot</p>
              <h2 className="text-lg font-bold text-[var(--surface-text-primary)]">Top desired roles</h2>
            </div>
            <div className="mt-4 space-y-2.5">
              {topDesiredRoles.map((entry) => (
                <div
                  key={entry.value}
                  className="flex items-center justify-between rounded-xl border px-3 py-2"
                  style={{ borderColor: 'var(--surface-border-soft)', backgroundColor: 'var(--surface-base-soft)' }}
                >
                  <span className="text-sm text-[var(--surface-text-primary)]">{entry.value}</span>
                  <span className="text-sm font-semibold text-[var(--surface-text-primary)]">{entry.count}</span>
                </div>
              ))}

              {!topDesiredRoles.length && (
                <p className="text-sm text-[var(--surface-text-muted)]">No role data yet.</p>
              )}
            </div>
          </article>

          <article className="app-section-card p-5" style={cardStyle}>
            <div className="app-toolbar">
              <div className="app-section-heading">
                <p className="app-section-eyebrow">Directory</p>
                <h2 className="text-lg font-bold text-[var(--surface-text-primary)]">Candidates</h2>
                <p className="text-sm text-[var(--surface-text-muted)]">Students and graduates linked to your university.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={segment}
                  onChange={(event) => setSegment(event.target.value as 'ALL' | 'STUDENTS' | 'GRADUATES')}
                  className="h-11 rounded-2xl border px-4 text-sm"
                  style={{ borderColor: 'var(--surface-border-strong)' }}
                >
                  <option value="ALL">All</option>
                  <option value="STUDENTS">Students</option>
                  <option value="GRADUATES">Graduates</option>
                </select>
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, email, role"
                  className="h-11 w-[240px]"
                />
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--surface-border-soft)' }}>
                    <th className="px-3 py-2 font-semibold text-[var(--surface-text-soft)]">Candidate</th>
                    <th className="px-3 py-2 font-semibold text-[var(--surface-text-soft)]">Role</th>
                    <th className="px-3 py-2 font-semibold text-[var(--surface-text-soft)]">Status</th>
                    <th className="px-3 py-2 font-semibold text-[var(--surface-text-soft)]">Location</th>
                    <th className="px-3 py-2 font-semibold text-[var(--surface-text-soft)]">Profile depth</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((candidate) => (
                    <tr key={candidate.id} className="border-b" style={{ borderColor: 'var(--surface-border-soft)' }}>
                      <td className="px-3 py-2 text-[var(--surface-text-primary)]">
                        <div className="font-medium">{formatName(candidate)}</div>
                        <div className="text-xs text-[var(--surface-text-soft)]">{candidate.user?.email || '—'}</div>
                      </td>
                      <td className="px-3 py-2 text-[var(--surface-text-primary)]">{candidate.desiredRole || '—'}</td>
                      <td className="px-3 py-2 text-[var(--surface-text-primary)]">
                        {candidate.isNonStudent ? 'Graduate / non-student' : 'Student'}
                        <div className="text-xs text-[var(--surface-text-soft)]">
                          Open to work: {candidate.openToWork ? 'Yes' : 'No'}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[var(--surface-text-primary)]">{candidate.city || '—'}</td>
                      <td className="px-3 py-2 text-[var(--surface-text-primary)]">
                        {candidate._count?.skills || 0} skills • {candidate._count?.experiences || 0} exp • {candidate._count?.resumes || 0} resumes
                      </td>
                    </tr>
                  ))}

                  {!isLoadingCandidates && !items.length && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6">
                        <div className="app-empty-state py-6">
                          <div className="app-empty-state-icon">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="app-title text-lg">No candidates found</p>
                            <p className="app-text-muted mt-2 text-sm">Adjust the segment or search query to explore your university pool.</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {isLoadingCandidates && (
                <p className="mt-3 text-sm text-[var(--surface-text-muted)]">Loading candidates...</p>
              )}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
};
