import { create } from 'zustand';
import { getApiErrorMessage } from '@shared/lib/api';
import { miniInternshipApi } from './api';
import type {
  CreateMiniInternshipPayload,
  MiniInternshipDetail,
  MiniInternshipListFilters,
  MiniInternshipSummary,
  PortfolioAchievement,
  ReviewTaskSubmissionPayload,
  StartTaskSubmissionPayload,
  SubmitTaskReflectionPayload,
  TaskSubmissionDetail,
  TaskSubmissionSummary,
  UpdateMiniInternshipPayload,
  UpdateTaskSubmissionPayload,
} from './types';

interface MiniInternshipStore {
  publishedMiniInternships: MiniInternshipSummary[];
  myMiniInternships: MiniInternshipSummary[];
  mySubmissions: TaskSubmissionSummary[];
  miniInternshipSubmissions: TaskSubmissionSummary[];
  portfolioAchievements: PortfolioAchievement[];
  selectedMiniInternship: MiniInternshipDetail | null;
  selectedSubmission: TaskSubmissionDetail | null;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;

  loadPublishedMiniInternships: (filters?: MiniInternshipListFilters) => Promise<void>;
  loadMyMiniInternships: (filters?: MiniInternshipListFilters) => Promise<void>;
  loadMiniInternship: (id: string) => Promise<MiniInternshipDetail>;
  createMiniInternship: (payload: CreateMiniInternshipPayload) => Promise<MiniInternshipDetail>;
  updateMiniInternship: (id: string, payload: UpdateMiniInternshipPayload) => Promise<MiniInternshipDetail>;
  publishMiniInternship: (id: string) => Promise<MiniInternshipDetail>;
  closeMiniInternship: (id: string) => Promise<MiniInternshipDetail>;
  startMiniInternship: (id: string, payload?: StartTaskSubmissionPayload) => Promise<TaskSubmissionDetail>;
  loadMySubmissions: () => Promise<void>;
  loadSubmission: (submissionId: string) => Promise<TaskSubmissionDetail>;
  loadSubmissionsForMiniInternship: (id: string) => Promise<void>;
  updateSubmission: (submissionId: string, payload: UpdateTaskSubmissionPayload) => Promise<TaskSubmissionDetail>;
  submitSubmission: (submissionId: string) => Promise<TaskSubmissionDetail>;
  submitReflection: (submissionId: string, payload: SubmitTaskReflectionPayload) => Promise<TaskSubmissionDetail>;
  reviewSubmission: (submissionId: string, payload: ReviewTaskSubmissionPayload) => Promise<TaskSubmissionDetail>;
  addSubmissionToPortfolio: (submissionId: string) => Promise<PortfolioAchievement>;
  loadMyPortfolio: () => Promise<void>;
  clearSelection: () => void;
}

const upsertById = <T extends { id: string }>(items: T[], item: T): T[] => {
  const index = items.findIndex((entry) => entry.id === item.id);
  if (index === -1) {
    return [item, ...items];
  }

  const next = items.slice();
  next[index] = item;
  return next;
};

const replaceTaskSubmissionInList = (
  items: TaskSubmissionSummary[],
  updated: TaskSubmissionSummary | TaskSubmissionDetail,
): TaskSubmissionSummary[] => {
  return upsertById(items, updated as TaskSubmissionSummary);
};

const toMiniInternshipSummary = (miniInternship: MiniInternshipDetail): MiniInternshipSummary => ({
  id: miniInternship.id,
  companyId: miniInternship.companyId,
  vacancyId: miniInternship.vacancyId,
  accessMode: miniInternship.accessMode,
  title: miniInternship.title,
  roleCategory: miniInternship.roleCategory,
  status: miniInternship.status,
  description: miniInternship.description,
  taskInstructions: miniInternship.taskInstructions,
  deadline: miniInternship.deadline,
  timeLimitMinutes: miniInternship.timeLimitMinutes,
  allowedAttempts: miniInternship.allowedAttempts,
  submissionRequirements: miniInternship.submissionRequirements,
  publishedAt: miniInternship.publishedAt,
  createdAt: miniInternship.createdAt,
  updatedAt: miniInternship.updatedAt,
  company: miniInternship.company,
  vacancy: miniInternship.vacancy,
  author: miniInternship.author,
  skillCriteria: miniInternship.skillCriteria,
  questionCount: miniInternship.questionCount,
  reflectionQuestionCount: miniInternship.reflectionQuestionCount,
  submissionCount: miniInternship.submissionCount,
});

const applyMiniInternshipToLists = (
  state: MiniInternshipStore,
  miniInternship: MiniInternshipDetail,
): Partial<MiniInternshipStore> => {
  const summary = toMiniInternshipSummary(miniInternship);

  return {
    selectedMiniInternship: miniInternship,
    myMiniInternships: upsertById(state.myMiniInternships, summary),
    publishedMiniInternships: upsertById(state.publishedMiniInternships, summary),
  };
};

export const useMiniInternshipStore = create<MiniInternshipStore>((set) => ({
  publishedMiniInternships: [],
  myMiniInternships: [],
  mySubmissions: [],
  miniInternshipSubmissions: [],
  portfolioAchievements: [],
  selectedMiniInternship: null,
  selectedSubmission: null,
  isLoading: false,
  isMutating: false,
  error: null,

  loadPublishedMiniInternships: async (filters) => {
    set({ isLoading: true, error: null });

    try {
      const response = await miniInternshipApi.listPublished(filters);
      set({
        publishedMiniInternships: response.items,
        isLoading: false,
      });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load mini internships');
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  loadMyMiniInternships: async (filters) => {
    set({ isLoading: true, error: null });

    try {
      const response = await miniInternshipApi.listMy(filters);
      set({
        myMiniInternships: response.items,
        isLoading: false,
      });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load mini internships');
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  loadMiniInternship: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const miniInternship = await miniInternshipApi.getOne(id);
      set((state) => ({
        selectedMiniInternship: miniInternship,
        isLoading: false,
        ...applyMiniInternshipToLists(state, miniInternship),
      }));
      return miniInternship;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load mini internship');
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  createMiniInternship: async (payload) => {
    set({ isMutating: true, error: null });

    try {
      const miniInternship = await miniInternshipApi.create(payload);
      set((state) => ({
        isMutating: false,
        selectedMiniInternship: miniInternship,
        myMiniInternships: upsertById(state.myMiniInternships, {
          id: miniInternship.id,
          companyId: miniInternship.companyId,
          vacancyId: miniInternship.vacancyId,
          title: miniInternship.title,
          roleCategory: miniInternship.roleCategory,
          status: miniInternship.status,
          description: miniInternship.description,
          taskInstructions: miniInternship.taskInstructions,
          deadline: miniInternship.deadline,
          timeLimitMinutes: miniInternship.timeLimitMinutes,
          allowedAttempts: miniInternship.allowedAttempts,
          submissionRequirements: miniInternship.submissionRequirements,
          publishedAt: miniInternship.publishedAt,
          createdAt: miniInternship.createdAt,
          updatedAt: miniInternship.updatedAt,
          company: miniInternship.company,
          vacancy: miniInternship.vacancy,
          author: miniInternship.author,
          skillCriteria: miniInternship.skillCriteria,
          submissionCount: miniInternship.submissionCount,
        }),
      }));
      return miniInternship;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to create mini internship');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  updateMiniInternship: async (id, payload) => {
    set({ isMutating: true, error: null });

    try {
      const miniInternship = await miniInternshipApi.update(id, payload);
      set((state) => ({
        isMutating: false,
        selectedMiniInternship: state.selectedMiniInternship?.id === id ? miniInternship : state.selectedMiniInternship,
        myMiniInternships: upsertById(state.myMiniInternships, {
          id: miniInternship.id,
          companyId: miniInternship.companyId,
          vacancyId: miniInternship.vacancyId,
          title: miniInternship.title,
          roleCategory: miniInternship.roleCategory,
          status: miniInternship.status,
          description: miniInternship.description,
          taskInstructions: miniInternship.taskInstructions,
          deadline: miniInternship.deadline,
          timeLimitMinutes: miniInternship.timeLimitMinutes,
          allowedAttempts: miniInternship.allowedAttempts,
          submissionRequirements: miniInternship.submissionRequirements,
          publishedAt: miniInternship.publishedAt,
          createdAt: miniInternship.createdAt,
          updatedAt: miniInternship.updatedAt,
          company: miniInternship.company,
          vacancy: miniInternship.vacancy,
          author: miniInternship.author,
          skillCriteria: miniInternship.skillCriteria,
          submissionCount: miniInternship.submissionCount,
        }),
      }));
      return miniInternship;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to update mini internship');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  publishMiniInternship: async (id) => {
    set({ isMutating: true, error: null });

    try {
      const miniInternship = await miniInternshipApi.publish(id);
      set((state) => ({
        isMutating: false,
        selectedMiniInternship: state.selectedMiniInternship?.id === id ? miniInternship : state.selectedMiniInternship,
        myMiniInternships: upsertById(state.myMiniInternships, {
          id: miniInternship.id,
          companyId: miniInternship.companyId,
          vacancyId: miniInternship.vacancyId,
          title: miniInternship.title,
          roleCategory: miniInternship.roleCategory,
          status: miniInternship.status,
          description: miniInternship.description,
          taskInstructions: miniInternship.taskInstructions,
          deadline: miniInternship.deadline,
          timeLimitMinutes: miniInternship.timeLimitMinutes,
          allowedAttempts: miniInternship.allowedAttempts,
          submissionRequirements: miniInternship.submissionRequirements,
          publishedAt: miniInternship.publishedAt,
          createdAt: miniInternship.createdAt,
          updatedAt: miniInternship.updatedAt,
          company: miniInternship.company,
          vacancy: miniInternship.vacancy,
          author: miniInternship.author,
          skillCriteria: miniInternship.skillCriteria,
          submissionCount: miniInternship.submissionCount,
        }),
      }));
      return miniInternship;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to publish mini internship');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  closeMiniInternship: async (id) => {
    set({ isMutating: true, error: null });

    try {
      const miniInternship = await miniInternshipApi.close(id);
      set((state) => ({
        isMutating: false,
        selectedMiniInternship: state.selectedMiniInternship?.id === id ? miniInternship : state.selectedMiniInternship,
        myMiniInternships: upsertById(state.myMiniInternships, {
          id: miniInternship.id,
          companyId: miniInternship.companyId,
          vacancyId: miniInternship.vacancyId,
          title: miniInternship.title,
          roleCategory: miniInternship.roleCategory,
          status: miniInternship.status,
          description: miniInternship.description,
          taskInstructions: miniInternship.taskInstructions,
          deadline: miniInternship.deadline,
          timeLimitMinutes: miniInternship.timeLimitMinutes,
          allowedAttempts: miniInternship.allowedAttempts,
          submissionRequirements: miniInternship.submissionRequirements,
          publishedAt: miniInternship.publishedAt,
          createdAt: miniInternship.createdAt,
          updatedAt: miniInternship.updatedAt,
          company: miniInternship.company,
          vacancy: miniInternship.vacancy,
          author: miniInternship.author,
          skillCriteria: miniInternship.skillCriteria,
          submissionCount: miniInternship.submissionCount,
        }),
      }));
      return miniInternship;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to close mini internship');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  startMiniInternship: async (id, payload) => {
    set({ isMutating: true, error: null });

    try {
      const submission = await miniInternshipApi.start(id, payload);
      set((state) => ({
        isMutating: false,
        selectedSubmission: submission,
        selectedMiniInternship:
          state.selectedMiniInternship?.id === id
            ? {
                ...state.selectedMiniInternship,
                currentSubmission: submission,
                submissionStatus: submission.status,
              }
            : state.selectedMiniInternship,
      }));
      return submission;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to start mini internship');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  loadMySubmissions: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await miniInternshipApi.listMySubmissions();
      set({
        mySubmissions: response.items,
        isLoading: false,
      });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load submissions');
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  loadSubmission: async (submissionId) => {
    set({ isLoading: true, error: null });

    try {
      const submission = await miniInternshipApi.getSubmission(submissionId);
      set({
        selectedSubmission: submission,
        isLoading: false,
      });
      return submission;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load submission');
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  loadSubmissionsForMiniInternship: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const response = await miniInternshipApi.listSubmissionsForMiniInternship(id);
      set({
        miniInternshipSubmissions: response.items,
        isLoading: false,
      });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load submissions');
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  updateSubmission: async (submissionId, payload) => {
    set({ isMutating: true, error: null });

    try {
      const submission = await miniInternshipApi.updateSubmission(submissionId, payload);
      set((state) => ({
        isMutating: false,
        selectedSubmission: submission,
        mySubmissions: replaceTaskSubmissionInList(state.mySubmissions, submission),
        miniInternshipSubmissions: replaceTaskSubmissionInList(
          state.miniInternshipSubmissions,
          submission,
        ),
      }));
      return submission;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to update submission');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  submitSubmission: async (submissionId) => {
    set({ isMutating: true, error: null });

    try {
      const submission = await miniInternshipApi.submitSubmission(submissionId);
      set((state) => ({
        isMutating: false,
        selectedSubmission: submission,
        mySubmissions: replaceTaskSubmissionInList(state.mySubmissions, submission),
        miniInternshipSubmissions: replaceTaskSubmissionInList(
          state.miniInternshipSubmissions,
          submission,
        ),
      }));
      return submission;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to submit task');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  submitReflection: async (submissionId, payload) => {
    set({ isMutating: true, error: null });

    try {
      const submission = await miniInternshipApi.submitReflection(submissionId, payload);
      set((state) => ({
        isMutating: false,
        selectedSubmission: submission,
        mySubmissions: replaceTaskSubmissionInList(state.mySubmissions, submission),
        miniInternshipSubmissions: replaceTaskSubmissionInList(
          state.miniInternshipSubmissions,
          submission,
        ),
      }));
      return submission;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to save reflection');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  reviewSubmission: async (submissionId, payload) => {
    set({ isMutating: true, error: null });

    try {
      const submission = await miniInternshipApi.reviewSubmission(submissionId, payload);
      set((state) => ({
        isMutating: false,
        selectedSubmission: submission,
        mySubmissions: replaceTaskSubmissionInList(state.mySubmissions, submission),
        miniInternshipSubmissions: replaceTaskSubmissionInList(
          state.miniInternshipSubmissions,
          submission,
        ),
      }));
      return submission;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to save review');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  addSubmissionToPortfolio: async (submissionId) => {
    set({ isMutating: true, error: null });

    try {
      const achievement = (await miniInternshipApi.addSubmissionToPortfolio(
        submissionId,
      )) as PortfolioAchievement;

      set((state) => ({
        isMutating: false,
        portfolioAchievements: upsertById(state.portfolioAchievements, achievement),
        selectedSubmission:
          state.selectedSubmission?.id === submissionId
            ? {
                ...state.selectedSubmission,
                portfolioAchievement: achievement,
              }
            : state.selectedSubmission,
        mySubmissions: state.mySubmissions.map((submission) =>
          submission.id === submissionId
            ? { ...submission, portfolioAchievement: achievement }
            : submission,
        ),
      }));

      return achievement;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to add to portfolio');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  loadMyPortfolio: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await miniInternshipApi.getMyPortfolio();
      set({
        portfolioAchievements: response.items,
        isLoading: false,
      });
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load portfolio achievements');
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  clearSelection: () => {
    set({
      selectedMiniInternship: null,
      selectedSubmission: null,
      error: null,
    });
  },
}));
