import api from '@shared/lib/api';
import type {
  CreateMiniInternshipPayload,
  MiniInternshipDetail,
  MiniInternshipListFilters,
  MiniInternshipListResponse,
  PortfolioAchievementListResponse,
  ReviewTaskSubmissionPayload,
  StartTaskSubmissionPayload,
  TaskSubmissionDetail,
  TaskSubmissionListResponse,
  UpdateMiniInternshipPayload,
  UpdateTaskSubmissionPayload,
} from './types';

type RecordLike = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordLike => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const normalizeListResponse = <T>(payload: unknown): { items: T[]; total: number } => {
  if (Array.isArray(payload)) {
    return { items: payload as T[], total: payload.length };
  }

  if (!isRecord(payload)) {
    return { items: [], total: 0 };
  }

  const items = Array.isArray(payload.items) ? (payload.items as T[]) : [];
  const total =
    typeof payload.total === 'number'
      ? payload.total
      : Number(payload.total || payload.count || items.length || 0);

  return { items, total: Number.isFinite(total) ? total : items.length };
};

const buildQuery = (filters?: MiniInternshipListFilters): Record<string, string> => {
  if (!filters) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  ) as Record<string, string>;
};

export const miniInternshipApi = {
  async listPublished(filters?: MiniInternshipListFilters): Promise<MiniInternshipListResponse> {
    const response = await api.get('/mini-internships/published', { params: buildQuery(filters) });
    return normalizeListResponse(response.data);
  },

  async listMy(filters?: MiniInternshipListFilters): Promise<MiniInternshipListResponse> {
    const response = await api.get('/mini-internships/my', { params: buildQuery(filters) });
    return normalizeListResponse(response.data);
  },

  async getOne(id: string): Promise<MiniInternshipDetail> {
    const response = await api.get(`/mini-internships/${id}`);
    return response.data as MiniInternshipDetail;
  },

  async create(payload: CreateMiniInternshipPayload): Promise<MiniInternshipDetail> {
    const response = await api.post('/mini-internships', payload);
    return response.data as MiniInternshipDetail;
  },

  async update(id: string, payload: UpdateMiniInternshipPayload): Promise<MiniInternshipDetail> {
    const response = await api.patch(`/mini-internships/${id}`, payload);
    return response.data as MiniInternshipDetail;
  },

  async publish(id: string): Promise<MiniInternshipDetail> {
    const response = await api.post(`/mini-internships/${id}/publish`);
    return response.data as MiniInternshipDetail;
  },

  async close(id: string): Promise<MiniInternshipDetail> {
    const response = await api.post(`/mini-internships/${id}/close`);
    return response.data as MiniInternshipDetail;
  },

  async start(id: string, payload?: StartTaskSubmissionPayload): Promise<TaskSubmissionDetail> {
    const response = await api.post(`/mini-internships/${id}/start`, payload || {});
    return response.data as TaskSubmissionDetail;
  },

  async listMySubmissions(): Promise<TaskSubmissionListResponse> {
    const response = await api.get('/mini-internships/my/submissions');
    return normalizeListResponse(response.data);
  },

  async updateSubmission(
    submissionId: string,
    payload: UpdateTaskSubmissionPayload,
  ): Promise<TaskSubmissionDetail> {
    const response = await api.patch(`/mini-internships/submissions/${submissionId}`, payload);
    return response.data as TaskSubmissionDetail;
  },

  async submitSubmission(submissionId: string): Promise<TaskSubmissionDetail> {
    const response = await api.post(`/mini-internships/submissions/${submissionId}/submit`);
    return response.data as TaskSubmissionDetail;
  },

  async listSubmissionsForMiniInternship(id: string): Promise<TaskSubmissionListResponse> {
    const response = await api.get(`/mini-internships/${id}/submissions`);
    return normalizeListResponse(response.data);
  },

  async getSubmission(submissionId: string): Promise<TaskSubmissionDetail> {
    const response = await api.get(`/mini-internships/submissions/${submissionId}`);
    return response.data as TaskSubmissionDetail;
  },

  async reviewSubmission(
    submissionId: string,
    payload: ReviewTaskSubmissionPayload,
  ): Promise<TaskSubmissionDetail> {
    const response = await api.post(`/mini-internships/submissions/${submissionId}/review`, payload);
    return response.data as TaskSubmissionDetail;
  },

  async addSubmissionToPortfolio(submissionId: string): Promise<unknown> {
    const response = await api.post(`/mini-internships/submissions/${submissionId}/portfolio`);
    return response.data;
  },

  async getMyPortfolio(): Promise<PortfolioAchievementListResponse> {
    const response = await api.get('/mini-internships/portfolio/me');
    return normalizeListResponse(response.data);
  },

  async getAiEvaluation(submissionId: string): Promise<TaskSubmissionDetail> {
    return miniInternshipApi.getSubmission(submissionId);
  },

  async runAiEvaluation(_submissionId: string): Promise<never> {
    throw new Error('AI rerun endpoint is not available in this frontend build');
  },
};
