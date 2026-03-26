import { create } from 'zustand';
import api, { getApiErrorMessage } from '@shared/lib/api';
import { isAdminRole, isCandidateRole, isHrRole, type UserRole } from '@entities/user';
import type {
  Application,
  ApplicationFilters,
  ApplicationListMeta,
  ApplicationStatus,
  ApplicationTimeline,
} from './types';

interface ApplicationStore {
  items: Application[];
  meta: ApplicationListMeta;
  selectedApplication: Application | null;
  timelines: Record<string, ApplicationTimeline>;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  listApplications: (role: UserRole | null | undefined, filters?: ApplicationFilters) => Promise<void>;
  loadApplication: (id: string) => Promise<Application>;
  loadTimeline: (id: string) => Promise<ApplicationTimeline>;
  applyToVacancy: (vacancyId: string, coverLetter?: string) => Promise<Application>;
  withdrawApplication: (id: string) => Promise<Application>;
  updateStatus: (id: string, status: ApplicationStatus, note?: string) => Promise<Application>;
  clearSelection: () => void;
}

const defaultMeta: ApplicationListMeta = {
  total: 0,
  limit: 20,
  offset: 0,
};

const buildQueryParams = (filters?: ApplicationFilters): Record<string, string | number> => {
  if (!filters) {
    return {};
  }

  const params = Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined);
  return Object.fromEntries(params) as Record<string, string | number>;
};

const getListEndpoint = (role: UserRole | null | undefined): string => {
  if (isAdminRole(role)) {
    return '/applications/admin';
  }

  if (isHrRole(role)) {
    return '/applications/hr';
  }

  if (isCandidateRole(role)) {
    return '/applications/my';
  }

  throw new Error('Applications are available only for signed-in users');
};

const normalizeMeta = (payload: unknown): ApplicationListMeta => {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return defaultMeta;
  }

  const data = payload as Record<string, unknown>;

  return {
    total: typeof data.total === 'number' ? data.total : Number(data.total || data.count || 0),
    limit: typeof data.limit === 'number' ? data.limit : Number(data.limit || 20),
    offset: typeof data.offset === 'number' ? data.offset : Number(data.offset || 0),
  };
};

export const useApplicationStore = create<ApplicationStore>((set) => ({
  items: [],
  meta: defaultMeta,
  selectedApplication: null,
  timelines: {},
  isLoading: false,
  isMutating: false,
  error: null,

  listApplications: async (role, filters) => {
    set({ isLoading: true, error: null });

    try {
      const endpoint = getListEndpoint(role);
      const response = await api.get(endpoint, {
        params: buildQueryParams(filters),
      });

      const items = Array.isArray(response.data?.items) ? (response.data.items as Application[]) : [];
      const meta = normalizeMeta(response.data?.meta);

      set({
        items,
        meta,
        isLoading: false,
      });
    } catch (error) {
      set({
        items: [],
        meta: defaultMeta,
        isLoading: false,
        error: getApiErrorMessage(error, 'Failed to load applications'),
      });
      throw error;
    }
  },

  loadApplication: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get(`/applications/${id}`);
      const application = response.data as Application;
      set({
        selectedApplication: application,
        isLoading: false,
      });
      return application;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load application');
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  loadTimeline: async (id) => {
    try {
      const response = await api.get(`/applications/${id}/timeline`);
      const timeline = response.data as ApplicationTimeline;

      set((state) => ({
        timelines: {
          ...state.timelines,
          [id]: timeline,
        },
      }));

      return timeline;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to load timeline'));
    }
  },

  applyToVacancy: async (vacancyId, coverLetter) => {
    set({ isMutating: true, error: null });

    try {
      const response = await api.post('/applications', {
        vacancyId,
        coverLetter: coverLetter?.trim() || undefined,
      });
      const application = response.data as Application;

      set({
        isMutating: false,
        selectedApplication: application,
      });

      return application;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to submit application');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  withdrawApplication: async (id) => {
    set({ isMutating: true, error: null });

    try {
      const response = await api.post(`/applications/${id}/withdraw`);
      const updatedApplication = response.data as Application;

      set((state) => ({
        isMutating: false,
        items: state.items.map((item) => (item.id === id ? { ...item, ...updatedApplication } : item)),
        selectedApplication:
          state.selectedApplication?.id === id
            ? { ...state.selectedApplication, ...updatedApplication }
            : state.selectedApplication,
      }));

      return updatedApplication;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to withdraw application');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  updateStatus: async (id, status, note) => {
    set({ isMutating: true, error: null });

    try {
      const response = await api.patch(`/applications/${id}/status`, {
        status,
        note: note?.trim() || undefined,
      });
      const updatedApplication = response.data as Application;

      set((state) => ({
        isMutating: false,
        items: state.items.map((item) => (item.id === id ? { ...item, ...updatedApplication } : item)),
        selectedApplication:
          state.selectedApplication?.id === id
            ? { ...state.selectedApplication, ...updatedApplication }
            : state.selectedApplication,
      }));

      return updatedApplication;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to update application status');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  clearSelection: () => {
    set({ selectedApplication: null });
  },
}));
