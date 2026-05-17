import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, BarChart3, RefreshCcw, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { AppHeader } from '@widgets/app-header';
import { Button, Input } from '@shared/ui';
import api, { getApiErrorMessage } from '@shared/lib/api';
import { useUISettings } from '@shared/lib/ui-settings';
import {
  complianceApi,
  type CompanyVerificationQueueItem,
  type CompanyVerificationStatus,
  type Complaint,
  type ComplaintStatus,
  type DeleteRequest,
  type DeletionRequestStatus,
  type ModerationActionType,
} from '@entities/compliance';
import { isAdminRole, useUserStore } from '@entities/user';

type BackendUserRole = 'CANDIDATE' | 'EMPLOYER' | 'ADMIN';
type BackendUserStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED';
type BackendVacancyStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'CLOSED';

interface ManagedUser {
  id: string;
  email: string;
  role: BackendUserRole;
  status: BackendUserStatus;
  firstName?: string;
  lastName?: string;
  candidateProfile?: {
    city?: string;
    country?: string;
    desiredRole?: string;
  } | null;
  employerProfile?: {
    companyName?: string;
    jobTitle?: string;
    hrEmail?: string;
  } | null;
}

interface ManagedUsersResponse {
  items: ManagedUser[];
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}

interface ManagedVacancy {
  id: string;
  title: string;
  status: BackendVacancyStatus;
  updatedAt?: string;
  publishedAt?: string;
  company?: { name?: string } | null;
}

interface ManagedVacancyResponse {
  items?: ManagedVacancy[];
}

const userRoleOptions: BackendUserRole[] = ['CANDIDATE', 'EMPLOYER', 'ADMIN'];
const userStatusOptions: BackendUserStatus[] = ['ACTIVE', 'SUSPENDED'];
const vacancyStatusOptions: Array<BackendVacancyStatus | ''> = [
  '',
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
  'CLOSED',
];
const restoreStatusOptions: BackendVacancyStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const kycStatusOptions: CompanyVerificationStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'RETRY_REQUIRED',
];
const complaintStatusOptions: ComplaintStatus[] = [
  'OPEN',
  'IN_REVIEW',
  'RESOLVED',
  'REJECTED',
];
const moderationActionOptions: ModerationActionType[] = ['HIDE', 'WARN', 'BAN', 'RESTORE'];
const deleteRequestStatusOptions: DeletionRequestStatus[] = [
  'REQUESTED',
  'CANCELED',
  'PROCESSED',
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

const formatEnum = (value: string): string => {
  return value
    .toLowerCase()
    .split('_')
    .map((chunk) => `${chunk.slice(0, 1).toUpperCase()}${chunk.slice(1)}`)
    .join(' ');
};

const getUserName = (user: ManagedUser): string => {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return fullName || user.email;
};

const parseUsersPayload = (payload: unknown): ManagedUsersResponse => {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { items: [] };
  }

  const data = payload as ManagedUsersResponse;
  return {
    items: Array.isArray(data.items) ? data.items : [],
    meta: data.meta,
  };
};

const parseVacanciesPayload = (payload: unknown): ManagedVacancy[] => {
  if (Array.isArray(payload)) {
    return payload as ManagedVacancy[];
  }

  if (typeof payload !== 'object' || payload === null) {
    return [];
  }

  const data = payload as ManagedVacancyResponse & { items?: ManagedVacancy[] };
  return Array.isArray(data.items) ? data.items : [];
};

export const AdminPanelPage = () => {
  const { t } = useUISettings();
  const { currentUser, isAuthenticated } = useUserStore();

  const [activeTab, setActiveTab] = useState<'statistics' | 'operations'>('statistics');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [vacancies, setVacancies] = useState<ManagedVacancy[]>([]);
  const [kycQueue, setKycQueue] = useState<CompanyVerificationQueueItem[]>([]);
  const [complaintsQueue, setComplaintsQueue] = useState<Complaint[]>([]);
  const [deleteRequestsQueue, setDeleteRequestsQueue] = useState<DeleteRequest[]>([]);
  const [userError, setUserError] = useState<string | null>(null);
  const [vacancyError, setVacancyError] = useState<string | null>(null);
  const [complianceError, setComplianceError] = useState<string | null>(null);
  const [complianceSuccess, setComplianceSuccess] = useState<string | null>(null);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isVacanciesLoading, setIsVacanciesLoading] = useState(false);
  const [isComplianceLoading, setIsComplianceLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [usersTotal, setUsersTotal] = useState(0);
  const [userFilters, setUserFilters] = useState({
    role: '',
    status: '',
    limit: 20,
    offset: 0,
  });
  const [vacancyFilters, setVacancyFilters] = useState({
    status: '',
    hrUserId: '',
  });
  const [kycStatusFilter, setKycStatusFilter] = useState<CompanyVerificationStatus>('PENDING');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<ComplaintStatus>('OPEN');
  const [deleteRequestStatusFilter, setDeleteRequestStatusFilter] = useState<DeletionRequestStatus>('REQUESTED');
  const [roleDrafts, setRoleDrafts] = useState<Record<string, BackendUserRole>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, BackendUserStatus>>({});
  const [companyIdDrafts, setCompanyIdDrafts] = useState<Record<string, string>>({});
  const [restoreDrafts, setRestoreDrafts] = useState<Record<string, BackendVacancyStatus>>({});
  const [kycReviewDrafts, setKycReviewDrafts] = useState<
    Record<string, { status: CompanyVerificationStatus; comment: string }>
  >({});
  const [complaintModerationDrafts, setComplaintModerationDrafts] = useState<
    Record<string, { actionType: ModerationActionType; complaintStatus: ComplaintStatus; note: string }>
  >({});
  const [deleteProcessDrafts, setDeleteProcessDrafts] = useState<
    Record<string, { status: DeletionRequestStatus; note: string }>
  >({});

  const isAdmin = isAdminRole(currentUser?.role);
  const canViewPage = isAuthenticated && isAdmin;
  const openComplianceItems = kycQueue.length + complaintsQueue.length + deleteRequestsQueue.length;
  const userRoleSummary = userRoleOptions.map((role) => ({
    role,
    count: users.filter((user) => user.role === role).length,
  }));
  const userStatusSummary = (['ACTIVE', 'PENDING', 'SUSPENDED', 'DELETED'] as BackendUserStatus[]).map((status) => ({
    status,
    count: users.filter((user) => user.status === status).length,
  }));
  const vacancyStatusSummary = (['DRAFT', 'PUBLISHED', 'ARCHIVED', 'CLOSED'] as BackendVacancyStatus[]).map((status) => ({
    status,
    count: vacancies.filter((vacancy) => vacancy.status === status).length,
  }));

  const loadUsers = async (nextFilters = userFilters) => {
    if (!canViewPage) {
      return;
    }

    setIsUsersLoading(true);
    setUserError(null);

    try {
      const params = Object.fromEntries(
        Object.entries(nextFilters).filter(([, value]) => value !== ''),
      );

      const response = await api.get('/users', { params });
      const parsed = parseUsersPayload(response.data);

      setUsers(parsed.items);
      setUsersTotal(parsed.meta?.total || parsed.items.length);
      setRoleDrafts(
        Object.fromEntries(parsed.items.map((user) => [user.id, user.role])) as Record<
          string,
          BackendUserRole
        >,
      );
      setStatusDrafts(
        Object.fromEntries(parsed.items.map((user) => [user.id, user.status])) as Record<
          string,
          BackendUserStatus
        >,
      );
    } catch (error) {
      setUserError(getApiErrorMessage(error, 'Failed to load users'));
      setUsers([]);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const loadVacancies = async (nextFilters = vacancyFilters) => {
    if (!canViewPage) {
      return;
    }

    setIsVacanciesLoading(true);
    setVacancyError(null);

    try {
      const params = nextFilters.status ? { status: nextFilters.status } : undefined;
      const response = await api.get('/vacancies', { params });
      const parsed = parseVacanciesPayload(response.data);

      setVacancies(parsed);
      setRestoreDrafts(
        Object.fromEntries(parsed.map((vacancy) => [vacancy.id, 'DRAFT'])) as Record<
          string,
          BackendVacancyStatus
        >,
      );
    } catch (error) {
      setVacancyError(getApiErrorMessage(error, 'Failed to load vacancies'));
      setVacancies([]);
    } finally {
      setIsVacanciesLoading(false);
    }
  };

  const loadCompliance = async () => {
    if (!canViewPage) {
      return;
    }

    setIsComplianceLoading(true);
    setComplianceError(null);
    setComplianceSuccess(null);

    try {
      const [kycItems, complaintItems, deleteRequestItems] = await Promise.all([
        complianceApi.listCompanyVerificationQueue(kycStatusFilter),
        complianceApi.listComplaintsQueue(complaintStatusFilter),
        complianceApi.listDeleteRequestsQueue(deleteRequestStatusFilter),
      ]);

      setKycQueue(kycItems);
      setComplaintsQueue(complaintItems);
      setDeleteRequestsQueue(deleteRequestItems);

      setKycReviewDrafts(
        Object.fromEntries(
          kycItems.map((item) => [
            item.id,
            {
              status: item.status,
              comment: '',
            },
          ]),
        ) as Record<string, { status: CompanyVerificationStatus; comment: string }>,
      );

      setComplaintModerationDrafts(
        Object.fromEntries(
          complaintItems.map((item) => [
            item.id,
            {
              actionType: 'WARN',
              complaintStatus: item.status || 'IN_REVIEW',
              note: '',
            },
          ]),
        ) as Record<
          string,
          { actionType: ModerationActionType; complaintStatus: ComplaintStatus; note: string }
        >,
      );

      setDeleteProcessDrafts(
        Object.fromEntries(
          deleteRequestItems.map((item) => [
            item.id,
            {
              status: item.status || 'REQUESTED',
              note: '',
            },
          ]),
        ) as Record<string, { status: DeletionRequestStatus; note: string }>,
      );
    } catch (error) {
      setComplianceError(getApiErrorMessage(error, 'Failed to load compliance queues'));
      setKycQueue([]);
      setComplaintsQueue([]);
      setDeleteRequestsQueue([]);
    } finally {
      setIsComplianceLoading(false);
    }
  };

  useEffect(() => {
    if (!canViewPage) {
      return;
    }

    void loadUsers();
    void loadVacancies();
  }, [canViewPage]);

  useEffect(() => {
    if (!canViewPage) {
      return;
    }

    void loadCompliance();
  }, [
    canViewPage,
    complaintStatusFilter,
    deleteRequestStatusFilter,
    kycStatusFilter,
  ]);

  const handleUpdateUserRole = async (user: ManagedUser) => {
    const nextRole = roleDrafts[user.id];
    if (!nextRole) {
      return;
    }

    setIsMutating(true);
    setUserError(null);

    try {
      const payload: Record<string, string> = { role: nextRole };
      const companyId = companyIdDrafts[user.id]?.trim();

      if (companyId) {
        payload.companyId = companyId;
      }

      await api.patch(`/users/${user.id}/role`, payload);
      await loadUsers();
    } catch (error) {
      setUserError(getApiErrorMessage(error, 'Failed to update user role'));
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateUserStatus = async (user: ManagedUser, nextStatus?: BackendUserStatus) => {
    const status = nextStatus || statusDrafts[user.id];
    if (!status) {
      return;
    }

    setIsMutating(true);
    setUserError(null);

    try {
      await api.patch(`/users/${user.id}/status`, { status });
      await loadUsers();
    } catch (error) {
      setUserError(getApiErrorMessage(error, 'Failed to update user status'));
    } finally {
      setIsMutating(false);
    }
  };

  const handleShortcutStatus = async (user: ManagedUser, action: 'ban' | 'unban') => {
    setIsMutating(true);
    setUserError(null);

    try {
      await api.patch(`/users/${user.id}/${action}`);
      await loadUsers();
    } catch (error) {
      setUserError(getApiErrorMessage(error, `Failed to ${action} user`));
    } finally {
      setIsMutating(false);
    }
  };

  const handleVacancyAction = async (
    vacancyId: string,
    action: 'archive' | 'soft-delete' | 'restore',
  ) => {
    setIsMutating(true);
    setVacancyError(null);

    try {
      if (action === 'restore') {
        await api.post(`/vacancies/${vacancyId}/restore`, {
          status: restoreDrafts[vacancyId] || 'DRAFT',
        });
      } else {
        await api.post(`/vacancies/${vacancyId}/${action}`);
      }

      await loadVacancies();
    } catch (error) {
      setVacancyError(getApiErrorMessage(error, `Failed to ${action} vacancy`));
    } finally {
      setIsMutating(false);
    }
  };

  const handleReviewKycSubmission = async (submissionId: string) => {
    const draft = kycReviewDrafts[submissionId];
    if (!draft) {
      return;
    }

    setIsMutating(true);
    setComplianceError(null);
    setComplianceSuccess(null);

    try {
      await complianceApi.reviewCompanyVerificationSubmission(submissionId, {
        status: draft.status,
        comment: draft.comment.trim() || undefined,
      });
      setComplianceSuccess(`KYC submission ${submissionId} reviewed.`);
      await loadCompliance();
    } catch (error) {
      setComplianceError(getApiErrorMessage(error, 'Failed to review KYC submission'));
    } finally {
      setIsMutating(false);
    }
  };

  const handleModerateComplaint = async (complaintId: string) => {
    const draft = complaintModerationDrafts[complaintId];
    if (!draft) {
      return;
    }

    setIsMutating(true);
    setComplianceError(null);
    setComplianceSuccess(null);

    try {
      await complianceApi.moderateComplaint(complaintId, {
        actionType: draft.actionType,
        complaintStatus: draft.complaintStatus,
        note: draft.note.trim() || undefined,
      });
      setComplianceSuccess(`Complaint ${complaintId} moderated.`);
      await loadCompliance();
    } catch (error) {
      setComplianceError(getApiErrorMessage(error, 'Failed to moderate complaint'));
    } finally {
      setIsMutating(false);
    }
  };

  const handleProcessDeleteRequest = async (requestId: string) => {
    const draft = deleteProcessDrafts[requestId];
    if (!draft) {
      return;
    }

    setIsMutating(true);
    setComplianceError(null);
    setComplianceSuccess(null);

    try {
      await complianceApi.processDeleteRequest(requestId, {
        status: draft.status,
        note: draft.note.trim() || undefined,
      });
      setComplianceSuccess(`Delete request ${requestId} updated.`);
      await loadCompliance();
    } catch (error) {
      setComplianceError(getApiErrorMessage(error, 'Failed to process delete request'));
    } finally {
      setIsMutating(false);
    }
  };

  if (!canViewPage) {
    return (
      <div className="min-h-screen app-shell app-page">
        <AppHeader />
        <main className="container mx-auto px-4 sm:px-6 py-10" style={{ maxWidth: '1280px' }}>
          <div className="mx-auto max-w-2xl rounded-[28px] border border-black/5 p-8 text-center" style={cardStyle}>
            <h1 className="font-heading mb-3 text-3xl font-bold" style={{ color: '#333A2F' }}>
              {t('admin.accessTitle')}
            </h1>
            <p className="mb-6 text-sm sm:text-base" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
              {t('admin.accessDescription')}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/app/login">
                <Button variant="hero">Sign In</Button>
              </Link>
              <Link to="/app">
                <Button variant="outline">Back to app</Button>
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
            background: '#FFFFFF',
          }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#333A2F' }}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {t('admin.badge')}
              </div>
              <h1 className="font-heading mb-3 text-3xl font-bold sm:text-4xl" style={{ color: '#333A2F' }}>
                {t('admin.title')}
              </h1>
              <p className="max-w-2xl text-sm sm:text-base" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                {t('admin.description')}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em]" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                  Users
                </div>
                <div className="mt-2 text-2xl font-bold" style={{ color: '#333A2F' }}>
                  {usersTotal}
                </div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em]" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                  Vacancies
                </div>
                <div className="mt-2 text-2xl font-bold" style={{ color: '#333A2F' }}>
                  {vacancies.length}
                </div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                <div className="text-xs uppercase tracking-[0.2em]" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                  Compliance
                </div>
                <div className="mt-2 text-2xl font-bold" style={{ color: '#333A2F' }}>
                  {openComplianceItems}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 flex flex-wrap gap-3">
          <Button variant={activeTab === 'statistics' ? 'hero' : 'outline'} onClick={() => setActiveTab('statistics')}>
            <BarChart3 className="h-4 w-4" />
            {t('admin.statistics')}
          </Button>
          <Button variant={activeTab === 'operations' ? 'hero' : 'outline'} onClick={() => setActiveTab('operations')}>
            <UserCog className="h-4 w-4" />
            {t('admin.operations')}
          </Button>
        </section>

        {activeTab === 'statistics' && (
          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-[28px] border border-black/5 p-5" style={cardStyle}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                  Users loaded
                </div>
                <div className="mt-3 text-3xl font-bold text-[#333A2F]">{users.length}</div>
                <p className="mt-2 text-sm text-[#5D6F50]">Current dataset from the user moderation feed.</p>
              </div>
              <div className="rounded-[28px] border border-black/5 p-5" style={cardStyle}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                  Vacancies loaded
                </div>
                <div className="mt-3 text-3xl font-bold text-[#333A2F]">{vacancies.length}</div>
                <p className="mt-2 text-sm text-[#5D6F50]">Visible vacancies in the current moderation snapshot.</p>
              </div>
              <div className="rounded-[28px] border border-black/5 p-5" style={cardStyle}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                  KYC queue
                </div>
                <div className="mt-3 text-3xl font-bold text-[#333A2F]">{kycQueue.length}</div>
                <p className="mt-2 text-sm text-[#5D6F50]">Items for status {formatEnum(kycStatusFilter)}.</p>
              </div>
              <div className="rounded-[28px] border border-black/5 p-5" style={cardStyle}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                  Complaints
                </div>
                <div className="mt-3 text-3xl font-bold text-[#333A2F]">{complaintsQueue.length}</div>
                <p className="mt-2 text-sm text-[#5D6F50]">Cases for status {formatEnum(complaintStatusFilter)}.</p>
              </div>
              <div className="rounded-[28px] border border-black/5 p-5" style={cardStyle}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                  Delete requests
                </div>
                <div className="mt-3 text-3xl font-bold text-[#333A2F]">{deleteRequestsQueue.length}</div>
                <p className="mt-2 text-sm text-[#5D6F50]">Requests for status {formatEnum(deleteRequestStatusFilter)}.</p>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="rounded-[28px] border border-black/5 p-5 sm:p-6" style={cardStyle}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-heading text-2xl font-bold text-[#333A2F]">Users snapshot</h2>
                  <span className="rounded-full bg-[#EBEDDF] px-3 py-1 text-xs font-semibold text-[#333A2F]">
                    {usersTotal} total
                  </span>
                </div>
                <div className="space-y-3">
                  {userRoleSummary.map((item) => (
                    <div key={item.role} className="flex items-center justify-between rounded-2xl bg-[#F9FAF3] px-4 py-3">
                      <span className="text-sm font-medium text-[#33412D]">{formatEnum(item.role)}</span>
                      <span className="text-lg font-bold text-[#333A2F]">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-black/5 p-5 sm:p-6" style={cardStyle}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-heading text-2xl font-bold text-[#333A2F]">User status</h2>
                  <span className="rounded-full bg-[#EBEDDF] px-3 py-1 text-xs font-semibold text-[#333A2F]">
                    moderation
                  </span>
                </div>
                <div className="space-y-3">
                  {userStatusSummary.map((item) => (
                    <div key={item.status} className="flex items-center justify-between rounded-2xl bg-[#F9FAF3] px-4 py-3">
                      <span className="text-sm font-medium text-[#33412D]">{formatEnum(item.status)}</span>
                      <span className="text-lg font-bold text-[#333A2F]">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-black/5 p-5 sm:p-6" style={cardStyle}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-heading text-2xl font-bold text-[#333A2F]">Vacancy status</h2>
                  <span className="rounded-full bg-[#EBEDDF] px-3 py-1 text-xs font-semibold text-[#333A2F]">
                    lifecycle
                  </span>
                </div>
                <div className="space-y-3">
                  {vacancyStatusSummary.map((item) => (
                    <div key={item.status} className="flex items-center justify-between rounded-2xl bg-[#F9FAF3] px-4 py-3">
                      <span className="text-sm font-medium text-[#33412D]">{formatEnum(item.status)}</span>
                      <span className="text-lg font-bold text-[#333A2F]">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'operations' && (
          <section className="space-y-6">
            <div className="rounded-[28px] border border-black/5 p-5 sm:p-6" style={cardStyle}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-[#333A2F]">{t('admin.operations')}</h2>
                  <p className="mt-2 text-sm text-[#5D6F50]">
                    {t('admin.description')}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#F9FAF3] px-4 py-3 text-sm font-medium text-[#33412D]">
                  Active queue: {openComplianceItems} items
                </div>
              </div>
            </div>

          <section className="rounded-[28px] border border-black/5 p-5 sm:p-6" style={cardStyle}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-2xl font-bold text-[#333A2F]">{t('admin.userManagement')}</h3>
                <p className="mt-2 text-sm text-[#5D6F50]">{t('admin.userManagementDescription')}</p>
              </div>
              <span className="rounded-full bg-[#EBEDDF] px-3 py-1 text-xs font-semibold text-[#333A2F]">
                {users.length} loaded
              </span>
            </div>
            <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_1fr_120px_auto]">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                  Role filter
                </label>
                <select
                  value={userFilters.role}
                  onChange={(event) => setUserFilters((prev) => ({ ...prev, role: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-black/10 bg-[#F9FAF3] px-3 text-sm"
                >
                  <option value="">All roles</option>
                  {userRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {formatEnum(role)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                  Status filter
                </label>
                <select
                  value={userFilters.status}
                  onChange={(event) => setUserFilters((prev) => ({ ...prev, status: event.target.value }))}
                  className="h-11 w-full rounded-xl border border-black/10 bg-[#F9FAF3] px-3 text-sm"
                >
                  <option value="">All statuses</option>
                  {(['ACTIVE', 'PENDING', 'SUSPENDED', 'DELETED'] as BackendUserStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {formatEnum(status)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                  Limit
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={String(userFilters.limit)}
                  onChange={(event) =>
                    setUserFilters((prev) => ({
                      ...prev,
                      limit: Number(event.target.value || 20),
                    }))
                  }
                  className="h-11 rounded-xl border-black/10 bg-[#F9FAF3]"
                />
              </div>
              <div className="flex items-end gap-3">
                <Button variant="hero" className="h-11" onClick={() => void loadUsers()} disabled={isUsersLoading}>
                  <RefreshCcw className="h-4 w-4" />
                  Reload
                </Button>
              </div>
            </div>

            {userError && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {userError}
              </div>
            )}

            {isUsersLoading ? (
              <div className="rounded-2xl border border-dashed border-black/10 bg-[#F9FAF3] p-8 text-center text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                Loading users...
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="rounded-[24px] border border-black/5 bg-[#F9FAF3] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#333A2F] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'white' }}>
                            {formatEnum(user.role)}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold" style={{ color: '#333A2F' }}>
                            {formatEnum(user.status)}
                          </span>
                        </div>
                        <div className="text-xl font-bold" style={{ color: '#333A2F' }}>
                          {getUserName(user)}
                        </div>
                        <div className="mt-1 text-sm" style={{ color: 'rgba(51, 58, 47, 0.72)' }}>
                          {user.email}
                        </div>
                        <div className="mt-2 break-all text-xs font-mono" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                          {user.id}
                        </div>
                        {user.candidateProfile?.desiredRole && (
                          <div className="mt-3 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                            Desired role: {user.candidateProfile.desiredRole}
                          </div>
                        )}
                        {user.employerProfile?.companyName && (
                          <div className="mt-3 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                            Company: {user.employerProfile.companyName}
                          </div>
                        )}
                      </div>

                      <div className="grid gap-3 lg:min-w-[320px]">
                        <select
                          value={roleDrafts[user.id] || user.role}
                          onChange={(event) =>
                            setRoleDrafts((prev) => ({
                              ...prev,
                              [user.id]: event.target.value as BackendUserRole,
                            }))
                          }
                          className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm"
                        >
                          {userRoleOptions.map((role) => (
                            <option key={role} value={role}>
                              {formatEnum(role)}
                            </option>
                          ))}
                        </select>
                        {isAdmin && roleDrafts[user.id] === 'EMPLOYER' && (
                          <Input
                            value={companyIdDrafts[user.id] || ''}
                            onChange={(event) =>
                              setCompanyIdDrafts((prev) => ({
                                ...prev,
                                [user.id]: event.target.value,
                              }))
                            }
                            placeholder="Optional company UUID"
                            className="h-11 rounded-xl border-black/10 bg-white"
                          />
                        )}
                        <Button
                          variant="outline"
                          disabled={isMutating}
                          onClick={() => void handleUpdateUserRole(user)}
                        >
                          Update role
                        </Button>
                        <select
                          value={statusDrafts[user.id] || (user.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE')}
                          onChange={(event) =>
                            setStatusDrafts((prev) => ({
                              ...prev,
                              [user.id]: event.target.value as BackendUserStatus,
                            }))
                          }
                          className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm"
                        >
                          {userStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {formatEnum(status)}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          disabled={isMutating}
                          onClick={() => void handleUpdateUserStatus(user)}
                        >
                          Update status
                        </Button>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            disabled={isMutating}
                            onClick={() => void handleShortcutStatus(user, 'ban')}
                          >
                            Ban
                          </Button>
                          <Button
                            variant="outline"
                            disabled={isMutating}
                            onClick={() => void handleShortcutStatus(user, 'unban')}
                          >
                            Unban
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {!users.length && (
                  <div className="rounded-2xl border border-dashed border-black/10 bg-[#F9FAF3] p-8 text-center text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                    No users found with current filters.
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-black/5 p-5 sm:p-6" style={cardStyle}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-2xl font-bold text-[#333A2F]">{t('admin.vacancyOperations')}</h3>
                <p className="mt-2 text-sm text-[#5D6F50]">{t('admin.vacancyOperationsDescription')}</p>
              </div>
              <span className="rounded-full bg-[#EBEDDF] px-3 py-1 text-xs font-semibold text-[#333A2F]">
                {vacancies.length} loaded
              </span>
            </div>
            <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                  Vacancy status
                </label>
                <select
                  value={vacancyFilters.status}
                  onChange={(event) =>
                    setVacancyFilters((prev) => ({
                      ...prev,
                      status: event.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-black/10 bg-[#F9FAF3] px-3 text-sm"
                >
                  {vacancyStatusOptions.map((status) => (
                    <option key={status || 'all'} value={status}>
                      {status ? formatEnum(status) : 'All statuses'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-3">
                <Button
                  variant="hero"
                  className="h-11"
                  onClick={() => void loadVacancies()}
                  disabled={isVacanciesLoading}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reload
                </Button>
              </div>
            </div>

            {vacancyError && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {vacancyError}
              </div>
            )}

            {isVacanciesLoading ? (
              <div className="rounded-2xl border border-dashed border-black/10 bg-[#F9FAF3] p-8 text-center text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                Loading vacancies...
              </div>
            ) : (
              <div className="space-y-4">
                {vacancies.map((vacancy) => (
                  <div key={vacancy.id} className="rounded-[24px] border border-black/5 bg-[#F9FAF3] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#333A2F] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'white' }}>
                            {formatEnum(vacancy.status)}
                          </span>
                        </div>
                        <div className="text-xl font-bold" style={{ color: '#333A2F' }}>
                          {vacancy.title}
                        </div>
                        <div className="mt-2 break-all text-xs font-mono" style={{ color: 'rgba(51, 58, 47, 0.55)' }}>
                          {vacancy.id}
                        </div>
                        <div className="mt-3 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                          Updated: {formatDateTime(vacancy.updatedAt)}
                        </div>
                        <div className="mt-1 text-sm" style={{ color: 'rgba(51, 58, 47, 0.7)' }}>
                          Published: {formatDateTime(vacancy.publishedAt)}
                        </div>
                      </div>

                      <div className="grid gap-3 lg:min-w-[320px]">
                        <Button
                          variant="outline"
                          disabled={isMutating}
                          onClick={() => void handleVacancyAction(vacancy.id, 'archive')}
                        >
                          <Archive className="h-4 w-4" />
                          Archive
                        </Button>
                        <Button
                          variant="outline"
                          disabled={isMutating}
                          onClick={() => void handleVacancyAction(vacancy.id, 'soft-delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                          Soft delete
                        </Button>
                        <select
                          value={restoreDrafts[vacancy.id] || 'DRAFT'}
                          onChange={(event) =>
                            setRestoreDrafts((prev) => ({
                              ...prev,
                              [vacancy.id]: event.target.value as BackendVacancyStatus,
                            }))
                          }
                          className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm"
                        >
                          {restoreStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              Restore to {formatEnum(status)}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="hero"
                          disabled={isMutating}
                          onClick={() => void handleVacancyAction(vacancy.id, 'restore')}
                        >
                          Restore
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {!vacancies.length && (
                  <div className="rounded-2xl border border-dashed border-black/10 bg-[#F9FAF3] p-8 text-center text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                    No vacancies found with current filters.
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="rounded-[28px] border border-black/5 p-5 sm:p-6" style={cardStyle}>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-heading text-2xl font-bold text-[#333A2F]">{t('admin.complianceOperations')}</h3>
                  <p className="mt-2 text-sm text-[#5D6F50]">{t('admin.complianceOperationsDescription')}</p>
                </div>
                <span className="rounded-full bg-[#EBEDDF] px-3 py-1 text-xs font-semibold text-[#333A2F]">
                  {openComplianceItems} items
                </span>
              </div>
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                    KYC status
                  </label>
                  <select
                    value={kycStatusFilter}
                    onChange={(event) => setKycStatusFilter(event.target.value as CompanyVerificationStatus)}
                    className="h-11 w-full rounded-xl border border-black/10 bg-[#F9FAF3] px-3 text-sm"
                  >
                    {kycStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {formatEnum(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                    Complaints status
                  </label>
                  <select
                    value={complaintStatusFilter}
                    onChange={(event) => setComplaintStatusFilter(event.target.value as ComplaintStatus)}
                    className="h-11 w-full rounded-xl border border-black/10 bg-[#F9FAF3] px-3 text-sm"
                  >
                    {complaintStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {formatEnum(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(51, 58, 47, 0.6)' }}>
                    Delete requests
                  </label>
                  <select
                    value={deleteRequestStatusFilter}
                    onChange={(event) => setDeleteRequestStatusFilter(event.target.value as DeletionRequestStatus)}
                    className="h-11 w-full rounded-xl border border-black/10 bg-[#F9FAF3] px-3 text-sm"
                  >
                    {deleteRequestStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {formatEnum(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="hero"
                    className="h-11"
                    onClick={() => void loadCompliance()}
                    disabled={isComplianceLoading}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Reload
                  </Button>
                </div>
              </div>

              {complianceError && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {complianceError}
                </div>
              )}

              {complianceSuccess && (
                <div className="mt-4 rounded-2xl border border-[#C8D9B3] bg-[#F1F8E8] px-4 py-3 text-sm text-[#2B5A41]">
                  {complianceSuccess}
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-black/5 p-5 sm:p-6" style={cardStyle}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-heading text-2xl font-bold text-[#333A2F]">KYC Queue</h3>
                <span className="rounded-full bg-[#EBEDDF] px-3 py-1 text-xs font-semibold text-[#333A2F]">
                  {kycQueue.length} items
                </span>
              </div>

              {isComplianceLoading ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-[#F9FAF3] p-8 text-center text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                  Loading compliance queue...
                </div>
              ) : kycQueue.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-[#F9FAF3] p-8 text-center text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                  No KYC submissions for selected status.
                </div>
              ) : (
                <div className="space-y-4">
                  {kycQueue.map((item) => {
                    const draft = kycReviewDrafts[item.id] || { status: item.status, comment: '' };

                    return (
                      <div key={item.id} className="rounded-2xl border border-black/5 bg-[#F9FAF3] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#333A2F] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                            {formatEnum(item.status)}
                          </span>
                          <span className="text-xs font-mono text-[#5D6F50]">{item.id}</span>
                        </div>

                        <p className="mt-2 text-sm text-[#33412D]">
                          Legal name: {item.legalName || item.companyName || 'Unknown company'}
                        </p>
                        <p className="text-sm text-[#526347]">
                          BIN/IIN: {item.binIin || '—'} • Created: {formatDateTime(item.createdAt)}
                        </p>

                        <div className="mt-3 grid gap-3 md:grid-cols-[200px_1fr_auto]">
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              setKycReviewDrafts((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...draft,
                                  status: event.target.value as CompanyVerificationStatus,
                                },
                              }))
                            }
                            className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm"
                          >
                            {kycStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {formatEnum(status)}
                              </option>
                            ))}
                          </select>
                          <Input
                            value={draft.comment}
                            onChange={(event) =>
                              setKycReviewDrafts((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...draft,
                                  comment: event.target.value,
                                },
                              }))
                            }
                            placeholder="Review comment (optional)"
                            className="h-11 rounded-xl border-black/10 bg-white"
                          />
                          <Button
                            variant="hero"
                            disabled={isMutating}
                            onClick={() => void handleReviewKycSubmission(item.id)}
                          >
                            Review
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-black/5 p-5 sm:p-6" style={cardStyle}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-heading text-2xl font-bold text-[#333A2F]">Complaints Queue</h3>
                <span className="rounded-full bg-[#EBEDDF] px-3 py-1 text-xs font-semibold text-[#333A2F]">
                  {complaintsQueue.length} items
                </span>
              </div>

              {complaintsQueue.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-[#F9FAF3] p-8 text-center text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                  No complaints for selected status.
                </div>
              ) : (
                <div className="space-y-4">
                  {complaintsQueue.map((complaint) => {
                    const draft = complaintModerationDrafts[complaint.id] || {
                      actionType: 'WARN' as ModerationActionType,
                      complaintStatus: complaint.status || 'IN_REVIEW',
                      note: '',
                    };

                    return (
                      <div key={complaint.id} className="rounded-2xl border border-black/5 bg-[#F9FAF3] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#333A2F] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                            {formatEnum(complaint.status)}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#33412D]">
                            {formatEnum(complaint.targetType)}
                          </span>
                          <span className="text-xs font-mono text-[#5D6F50]">{complaint.id}</span>
                        </div>
                        <p className="mt-2 text-sm text-[#33412D]">Reason: {complaint.reason || 'No reason'}</p>
                        <p className="text-sm text-[#526347]">Target ID: {complaint.targetId || '—'}</p>
                        {complaint.details && (
                          <p className="text-sm text-[#526347]">Details: {complaint.details}</p>
                        )}

                        <div className="mt-3 grid gap-3 md:grid-cols-[180px_180px_1fr_auto]">
                          <select
                            value={draft.actionType}
                            onChange={(event) =>
                              setComplaintModerationDrafts((prev) => ({
                                ...prev,
                                [complaint.id]: {
                                  ...draft,
                                  actionType: event.target.value as ModerationActionType,
                                },
                              }))
                            }
                            className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm"
                          >
                            {moderationActionOptions.map((actionType) => (
                              <option key={actionType} value={actionType}>
                                {formatEnum(actionType)}
                              </option>
                            ))}
                          </select>
                          <select
                            value={draft.complaintStatus}
                            onChange={(event) =>
                              setComplaintModerationDrafts((prev) => ({
                                ...prev,
                                [complaint.id]: {
                                  ...draft,
                                  complaintStatus: event.target.value as ComplaintStatus,
                                },
                              }))
                            }
                            className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm"
                          >
                            {complaintStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {formatEnum(status)}
                              </option>
                            ))}
                          </select>
                          <Input
                            value={draft.note}
                            onChange={(event) =>
                              setComplaintModerationDrafts((prev) => ({
                                ...prev,
                                [complaint.id]: {
                                  ...draft,
                                  note: event.target.value,
                                },
                              }))
                            }
                            placeholder="Moderation note"
                            className="h-11 rounded-xl border-black/10 bg-white"
                          />
                          <Button
                            variant="hero"
                            disabled={isMutating}
                            onClick={() => void handleModerateComplaint(complaint.id)}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-black/5 p-5 sm:p-6" style={cardStyle}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-heading text-2xl font-bold text-[#333A2F]">Delete Requests Queue</h3>
                <span className="rounded-full bg-[#EBEDDF] px-3 py-1 text-xs font-semibold text-[#333A2F]">
                  {deleteRequestsQueue.length} items
                </span>
              </div>

              {deleteRequestsQueue.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/10 bg-[#F9FAF3] p-8 text-center text-sm" style={{ color: 'rgba(51, 58, 47, 0.65)' }}>
                  No deletion requests for selected status.
                </div>
              ) : (
                <div className="space-y-4">
                  {deleteRequestsQueue.map((request) => {
                    const draft = deleteProcessDrafts[request.id] || {
                      status: request.status || 'REQUESTED',
                      note: '',
                    };

                    return (
                      <div key={request.id} className="rounded-2xl border border-black/5 bg-[#F9FAF3] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#333A2F] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
                            {formatEnum(request.status)}
                          </span>
                          <span className="text-xs font-mono text-[#5D6F50]">{request.id}</span>
                        </div>
                        <p className="mt-2 text-sm text-[#33412D]">
                          User: {request.user?.email || request.user?.id || 'Unknown'}
                        </p>
                        <p className="text-sm text-[#526347]">Created: {formatDateTime(request.createdAt)}</p>
                        {request.reason && (
                          <p className="text-sm text-[#526347]">Reason: {request.reason}</p>
                        )}

                        <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr_auto]">
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              setDeleteProcessDrafts((prev) => ({
                                ...prev,
                                [request.id]: {
                                  ...draft,
                                  status: event.target.value as DeletionRequestStatus,
                                },
                              }))
                            }
                            className="h-11 rounded-xl border border-black/10 bg-white px-3 text-sm"
                          >
                            {deleteRequestStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {formatEnum(status)}
                              </option>
                            ))}
                          </select>
                          <Input
                            value={draft.note}
                            onChange={(event) =>
                              setDeleteProcessDrafts((prev) => ({
                                ...prev,
                                [request.id]: {
                                  ...draft,
                                  note: event.target.value,
                                },
                              }))
                            }
                            placeholder="Admin note"
                            className="h-11 rounded-xl border-black/10 bg-white"
                          />
                          <Button
                            variant="hero"
                            disabled={isMutating}
                            onClick={() => void handleProcessDeleteRequest(request.id)}
                          >
                            Process
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
          </section>
        )}
      </main>
    </div>
  );
};
