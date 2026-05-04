import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock3, Download, FileText, MessageSquare, RefreshCcw, Shield, UserRound } from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input, Textarea } from '@shared/ui';
import {
  useApplicationStore,
  type Application,
  type ApplicationFilters,
  type ApplicationStatus,
} from '@entities/application';
import { isAdminRole, isCandidateRole, isHrRole, useUserStore } from '@entities/user';
import { useMediaStore } from '@entities/media';

const applicationStatuses: ApplicationStatus[] = [
  'SUBMITTED',
  'REVIEWED',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
];

const manageableStatuses: ApplicationStatus[] = [
  'SUBMITTED',
  'REVIEWED',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
];

const cardStyle = {
  backgroundColor: 'white',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
};

const formatDateTime = (value?: string): string => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
};

const formatStatus = (status?: string): string => {
  return String(status || 'UNKNOWN')
    .toLowerCase()
    .split('_')
    .map((chunk) => `${chunk.slice(0, 1).toUpperCase()}${chunk.slice(1)}`)
    .join(' ');
};

const getCandidateName = (application: Application): string => {
  const firstName = application.candidate?.firstName || '';
  const lastName = application.candidate?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || application.candidate?.email || 'Candidate';
};

const getTimelineActor = (event: {
  actor?: { firstName?: string; lastName?: string; email?: string } | null;
}): string => {
  const firstName = event.actor?.firstName || '';
  const lastName = event.actor?.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || event.actor?.email || 'System';
};

const getPrimaryResume = (application: Application) => {
  const resumes = application.candidate?.profile?.resumes || [];

  return resumes.find((resume) => resume.isPrimary) || resumes[0] || null;
};

export const ApplicationsPage = () => {
  const { currentUser, isAuthenticated } = useUserStore();
  const {
    items,
    meta,
    timelines,
    selectedApplication,
    isLoading,
    isMutating,
    error,
    listApplications,
    loadApplication,
    loadTimeline,
    withdrawApplication,
    updateStatus,
    clearSelection,
  } = useApplicationStore();
  const { getDownloadUrl } = useMediaStore();

  const [statusNote, setStatusNote] = useState('');
  const [nextStatus, setNextStatus] = useState<ApplicationStatus>('REVIEWED');
  const [filters, setFilters] = useState<ApplicationFilters>({
    status: '',
    limit: 20,
    offset: 0,
  });
  const [pageError, setPageError] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const isCandidate = isCandidateRole(currentUser?.role);
  const isHr = isHrRole(currentUser?.role);
  const isAdmin = isAdminRole(currentUser?.role);
  const canViewPage = isAuthenticated && (isCandidate || isHr || isAdmin);

  const currentTimeline = selectedApplication ? timelines[selectedApplication.id] : null;

  const scopeLabel = useMemo(() => {
    if (isAdmin) {
      return 'Admin mode';
    }

    if (isHr) {
      return 'HR mode';
    }

    return 'Candidate mode';
  }, [isAdmin, isHr]);

  const refreshList = async (nextFilters: ApplicationFilters = filters) => {
    if (!currentUser) {
      return;
    }

    setPageError(null);

    try {
      await listApplications(currentUser.role, nextFilters);
    } catch (loadError) {
      setPageError(loadError instanceof Error ? loadError.message : 'Failed to load applications');
    }
  };

  useEffect(() => {
    if (!canViewPage || !currentUser) {
      return;
    }

    void refreshList();
  }, [canViewPage, currentUser]);

  const handleFilterChange = (field: keyof ApplicationFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectApplication = async (applicationId: string) => {
    setPageError(null);

    try {
      await Promise.all([loadApplication(applicationId), loadTimeline(applicationId)]);
      setStatusNote('');
      setNextStatus('REVIEWED');
    } catch (loadError) {
      setPageError(loadError instanceof Error ? loadError.message : 'Failed to load application');
    }
  };

  const handleWithdraw = async (applicationId: string) => {
    setPageError(null);

    try {
      await withdrawApplication(applicationId);
      await refreshList();
      await loadTimeline(applicationId);
    } catch (mutationError) {
      setPageError(
        mutationError instanceof Error ? mutationError.message : 'Failed to withdraw application',
      );
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedApplication) {
      return;
    }

    setPageError(null);

    try {
      await updateStatus(selectedApplication.id, nextStatus, statusNote);
      await Promise.all([
        refreshList(),
        loadApplication(selectedApplication.id),
        loadTimeline(selectedApplication.id),
      ]);
      setStatusNote('');
    } catch (mutationError) {
      setPageError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to update application status',
      );
    }
  };

  const handleOpenResume = async (fileId: string) => {
    setPageError(null);
    setDownloadingFileId(fileId);

    try {
      const downloadUrl = await getDownloadUrl(fileId);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (downloadError) {
      setPageError(downloadError instanceof Error ? downloadError.message : 'Failed to open resume');
    } finally {
      setDownloadingFileId(null);
    }
  };

  if (!canViewPage) {
    return (
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="container mx-auto px-4 sm:px-6 py-10" style={{ maxWidth: '1280px' }}>
          <div className="mx-auto max-w-2xl rounded-[28px] border border-black/5 p-8 text-center" style={cardStyle}>
            <h1 className="font-heading mb-3 text-3xl font-bold" style={{ color: '#333A2F' }}>
              Applications are available after sign in
            </h1>
            <p className="mb-6 text-sm sm:text-base" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
              Candidates can manage their own applications. HR and admins can review and update application statuses.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/app/login">
                <Button variant="hero">Sign In</Button>
              </Link>
              <Link to="/app/jobs">
                <Button variant="outline">Browse Jobs</Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell app-page">
      <AppHeader />
      <main className="container mx-auto px-4 sm:px-6 py-8" style={{ maxWidth: '1360px' }}>
        <section
          className="mb-6 overflow-hidden rounded-[30px] border border-black/5 p-6 sm:p-8"
          style={{
            ...cardStyle,
            background:
              'linear-gradient(135deg, rgba(51,58,47,0.08) 0%, rgba(255,255,255,0.95) 45%, rgba(212,220,191,0.45) 100%)',
          }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#333A2F' }}>
                <Shield className="h-3.5 w-3.5" />
                {scopeLabel}
              </div>
              <h1 className="font-heading mb-3 text-3xl font-bold sm:text-4xl" style={{ color: '#333A2F' }}>
                {isCandidate ? 'Track your applications' : 'Review candidate pipeline'}
              </h1>
              <p className="max-w-2xl text-sm sm:text-base" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                {isCandidate
                  ? 'See statuses, open timeline events, and withdraw active applications when needed.'
                  : 'Filter applications by vacancy, candidate, dates, and keep the pipeline moving without leaving the frontend.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em]" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                  Loaded
                </div>
                <div className="mt-2 text-2xl font-bold" style={{ color: '#333A2F' }}>
                  {items.length}
                </div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em]" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                  Total
                </div>
                <div className="mt-2 text-2xl font-bold" style={{ color: '#333A2F' }}>
                  {meta.total}
                </div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em]" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                  Page Size
                </div>
                <div className="mt-2 text-2xl font-bold" style={{ color: '#333A2F' }}>
                  {meta.limit}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 rounded-[28px] border border-black/5 p-5 sm:grid-cols-2 xl:grid-cols-6" style={cardStyle}>
          <div className="xl:col-span-1">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(event) => handleFilterChange('status', event.target.value)}
              className="h-11 w-full rounded-xl border border-black/10 bg-[#F9FAF3] px-3 text-sm"
            >
              <option value="">All statuses</option>
              {applicationStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </div>

          {!isCandidate && (
            <div className="xl:col-span-1">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                Vacancy ID
              </label>
              <Input
                value={filters.vacancyId || ''}
                onChange={(event) => handleFilterChange('vacancyId', event.target.value)}
                placeholder="uuid"
                className="h-11 rounded-xl border-black/10 bg-[#F9FAF3]"
              />
            </div>
          )}

          {!isCandidate && (
            <div className="xl:col-span-1">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                Candidate ID
              </label>
              <Input
                value={filters.candidateId || ''}
                onChange={(event) => handleFilterChange('candidateId', event.target.value)}
                placeholder="uuid"
                className="h-11 rounded-xl border-black/10 bg-[#F9FAF3]"
              />
            </div>
          )}

          {isAdmin && (
            <div className="xl:col-span-1">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                HR User ID
              </label>
              <Input
                value={filters.hrUserId || ''}
                onChange={(event) => handleFilterChange('hrUserId', event.target.value)}
                placeholder="uuid"
                className="h-11 rounded-xl border-black/10 bg-[#F9FAF3]"
              />
            </div>
          )}

          {!isCandidate && (
            <div className="xl:col-span-1">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                Date From
              </label>
              <Input
                type="datetime-local"
                value={filters.dateFrom || ''}
                onChange={(event) => {
                  const value = event.target.value;
                  handleFilterChange('dateFrom', value ? new Date(value).toISOString() : '');
                }}
                className="h-11 rounded-xl border-black/10 bg-[#F9FAF3]"
              />
            </div>
          )}

          {!isCandidate && (
            <div className="xl:col-span-1">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                Date To
              </label>
              <Input
                type="datetime-local"
                value={filters.dateTo || ''}
                onChange={(event) => {
                  const value = event.target.value;
                  handleFilterChange('dateTo', value ? new Date(value).toISOString() : '');
                }}
                className="h-11 rounded-xl border-black/10 bg-[#F9FAF3]"
              />
            </div>
          )}

          <div className="flex items-end gap-3 xl:col-span-1">
            <Button
              onClick={() => void refreshList()}
              variant="hero"
              className="h-11 flex-1 rounded-xl"
              disabled={isLoading}
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              onClick={() => {
                setFilters({ status: '', limit: 20, offset: 0 });
                void refreshList({ status: '', limit: 20, offset: 0 });
                clearSelection();
              }}
              variant="outline"
              className="h-11 rounded-xl"
            >
              Reset
            </Button>
          </div>
        </section>

        {(pageError || error) && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError || error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <section className="rounded-[28px] border border-black/5 p-5 sm:p-6" style={cardStyle}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-heading text-2xl font-bold" style={{ color: '#333A2F' }}>
                  Application list
                </h2>
                <p className="mt-1 text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                  {isCandidate ? 'Your submissions and their current statuses.' : 'Applications available in your access scope.'}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-black/10 bg-[#F9FAF3] p-8 text-center text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                Loading applications...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/10 bg-[#F9FAF3] p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
                  <FileText className="h-6 w-6" style={{ color: '#333A2F' }} />
                </div>
                <h3 className="mb-2 text-lg font-semibold" style={{ color: '#333A2F' }}>
                  No applications found
                </h3>
                <p className="mx-auto mb-5 max-w-md text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                  {isCandidate
                    ? 'Apply to a published vacancy and it will appear here with full timeline history.'
                    : 'Try adjusting filters or reload the page after new applications arrive.'}
                </p>
                {isCandidate && (
                  <Link to="/app/jobs">
                    <Button variant="hero">Browse jobs</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((application) => {
                  const isSelected = selectedApplication?.id === application.id;

                  return (
                    <button
                      key={application.id}
                      type="button"
                      onClick={() => void handleSelectApplication(application.id)}
                      className="w-full rounded-[24px] border p-5 text-left transition-all"
                      style={{
                        borderColor: isSelected ? '#333A2F' : 'rgba(51, 58, 47, 0.08)',
                        backgroundColor: isSelected ? '#F7F8EF' : '#FFFFFF',
                      }}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#333A2F] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'white' }}>
                              {formatStatus(application.status)}
                            </span>
                            <span className="rounded-full bg-[#EBEDDF] px-3 py-1 text-xs font-semibold" style={{ color: '#333A2F' }}>
                              {application.vacancy?.company?.name || 'Company'}
                            </span>
                          </div>
                          <h3 className="font-heading text-xl font-bold" style={{ color: '#333A2F' }}>
                            {application.vacancy?.title || 'Untitled vacancy'}
                          </h3>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays className="h-4 w-4" />
                              {formatDateTime(application.createdAt)}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <Clock3 className="h-4 w-4" />
                              Updated {formatDateTime(application.updatedAt)}
                            </span>
                            {!isCandidate && (
                              <span className="inline-flex items-center gap-2">
                                <UserRound className="h-4 w-4" />
                                {getCandidateName(application)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-xs" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                          <div>ID</div>
                          <div className="mt-1 break-all font-mono text-[11px]" style={{ color: '#333A2F' }}>
                            {application.id}
                          </div>
                        </div>
                      </div>

                      {application.coverLetter && (
                        <p className="mt-4 line-clamp-3 text-sm leading-6" style={{ color: 'rgba(51, 58, 47, 0.72)' }}>
                          {application.coverLetter}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-3">
                        {application.chatId && (
                          <Link to={`/app/chat?chatId=${application.chatId}`}>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MessageSquare className="h-4 w-4" />
                              Open chat
                            </Button>
                          </Link>
                        )}
                        {isCandidate && application.status !== 'WITHDRAWN' && (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isMutating}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleWithdraw(application.id);
                            }}
                          >
                            Withdraw
                          </Button>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="rounded-[28px] border border-black/5 p-5 sm:p-6" style={cardStyle}>
            {!selectedApplication ? (
              <div className="rounded-[24px] border border-dashed border-black/10 bg-[#F9FAF3] p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white">
                  <CheckCircle2 className="h-6 w-6" style={{ color: '#333A2F' }} />
                </div>
                <h2 className="font-heading mb-2 text-2xl font-bold" style={{ color: '#333A2F' }}>
                  Open any application
                </h2>
                <p className="text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                  Details, timeline events, and status actions will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#333A2F] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'white' }}>
                      {formatStatus(selectedApplication.status)}
                    </span>
                    <span className="rounded-full bg-[#EBEDDF] px-3 py-1 text-xs font-semibold" style={{ color: '#333A2F' }}>
                      {selectedApplication.vacancy?.publicationCity?.name || 'No city'}
                    </span>
                  </div>
                  <h2 className="font-heading text-2xl font-bold" style={{ color: '#333A2F' }}>
                    {selectedApplication.vacancy?.title || 'Untitled vacancy'}
                  </h2>
                  <p className="mt-2 text-sm" style={{ color: 'rgba(51, 58, 47, 0.72)' }}>
                    {selectedApplication.vacancy?.company?.name || 'Company'}
                  </p>
                </div>

                {!isCandidate && (
                  <div className="rounded-[24px] border border-black/5 bg-[#F9FAF3] p-4">
                    <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                      Candidate
                    </div>
                    <div className="mt-2 text-base font-semibold" style={{ color: '#333A2F' }}>
                      {getCandidateName(selectedApplication)}
                    </div>
                    <div className="mt-2 space-y-1 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                      <div>{selectedApplication.candidate?.email || '—'}</div>
                      <div>{selectedApplication.candidate?.phone || 'No phone'}</div>
                      <div>
                        {selectedApplication.candidate?.profile?.city || '—'}
                        {selectedApplication.candidate?.profile?.country
                          ? `, ${selectedApplication.candidate.profile.country}`
                          : ''}
                      </div>
                    </div>
                    {getPrimaryResume(selectedApplication)?.fileId && (
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={downloadingFileId === getPrimaryResume(selectedApplication)?.fileId}
                          onClick={() =>
                            void handleOpenResume(getPrimaryResume(selectedApplication)?.fileId || '')
                          }
                        >
                          <Download className="h-4 w-4" />
                          {downloadingFileId === getPrimaryResume(selectedApplication)?.fileId
                            ? 'Opening resume...'
                            : `Open ${getPrimaryResume(selectedApplication)?.isPrimary ? 'primary ' : ''}resume`}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {selectedApplication.coverLetter && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                      Cover letter
                    </div>
                    <div className="rounded-[24px] border border-black/5 bg-[#F9FAF3] p-4 text-sm leading-6" style={{ color: 'rgba(51, 58, 47, 0.78)' }}>
                      {selectedApplication.coverLetter}
                    </div>
                  </div>
                )}

                {selectedApplication.chatId && (
                  <div className="rounded-[24px] border border-black/5 bg-[#F9FAF3] p-4">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                      Chat
                    </div>
                    <p className="mb-3 text-sm" style={{ color: 'rgba(51, 58, 47, 0.72)' }}>
                      Open the application chat to continue the conversation in realtime.
                    </p>
                    <Link to={`/app/chat?chatId=${selectedApplication.chatId}`}>
                      <Button variant="hero" className="w-full">
                        <MessageSquare className="h-4 w-4" />
                        Open chat
                      </Button>
                    </Link>
                  </div>
                )}

                {(isHr || isAdmin) && selectedApplication.status !== 'WITHDRAWN' && (
                  <div className="rounded-[24px] border border-black/5 bg-[#F9FAF3] p-4">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                      Update status
                    </div>
                    <div className="space-y-3">
                      <select
                        value={nextStatus}
                        onChange={(event) => setNextStatus(event.target.value as ApplicationStatus)}
                        className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm"
                      >
                        {manageableStatuses.map((status) => (
                          <option key={status} value={status}>
                            {formatStatus(status)}
                          </option>
                        ))}
                      </select>
                      <Textarea
                        value={statusNote}
                        onChange={(event) => setStatusNote(event.target.value)}
                        placeholder="Optional note for timeline"
                        className="min-h-[110px] rounded-2xl border-black/10 bg-white"
                      />
                      <Button
                        variant="hero"
                        className="w-full"
                        disabled={isMutating}
                        onClick={() => void handleStatusUpdate()}
                      >
                        Save status update
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                      Timeline
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void loadTimeline(selectedApplication.id)}
                    >
                      Reload
                    </Button>
                  </div>

                  {currentTimeline?.events?.length ? (
                    <div className="space-y-3">
                      {currentTimeline.events.map((event) => (
                        <div key={event.id} className="rounded-[22px] border border-black/5 bg-[#F9FAF3] p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-semibold" style={{ color: '#333A2F' }}>
                                {event.fromStatus ? `${formatStatus(event.fromStatus)} -> ` : ''}
                                {formatStatus(event.toStatus)}
                              </div>
                              <div className="mt-1 text-xs" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                                {getTimelineActor(event)}
                              </div>
                            </div>
                            <div className="text-right text-xs" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                              {formatDateTime(event.createdAt)}
                            </div>
                          </div>
                          {event.note && (
                            <p className="mt-3 text-sm leading-6" style={{ color: 'rgba(51, 58, 47, 0.72)' }}>
                              {event.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-black/10 bg-[#F9FAF3] p-5 text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                      Timeline will appear here after loading the selected application.
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
};
