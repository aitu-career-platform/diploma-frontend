import { create } from 'zustand';
import { Job, JobFilters } from './types';
import api from '@shared/lib/api';

const mockJobs: Job[] = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    company: 'TechCorp',
    companyLogo: '/images/companies/default_company.jpg',
    type: 'Full-time',
    location: 'Remote',
    salary: '$80k - $120k',
    description: 'We are looking for an experienced Frontend Developer to join our team...',
    requirements: ['React', 'TypeScript', '5+ years experience'],
    tags: ['React', 'TypeScript', 'Next.js', 'Remote'],
    status: 'active',
    postedAt: '2024-01-15',
    applicationsCount: 24,
    employerId: 'emp1',
  },
  {
    id: '2',
    title: 'UX/UI Design Intern',
    company: 'DesignStudio',
    companyLogo: '/images/companies/default_company.jpg',
    type: 'Internship',
    location: 'Remote',
    salary: '$2k - $3k/month',
    description: 'Join our design team as an intern and work on exciting projects...',
    requirements: ['Figma', 'Design thinking', 'Portfolio'],
    tags: ['Design', 'Figma', 'UI/UX', 'Remote'],
    status: 'active',
    postedAt: '2024-01-14',
    applicationsCount: 18,
    employerId: 'emp2',
  },
  {
    id: '3',
    title: 'Backend Engineer',
    company: 'CloudTech',
    companyLogo: '/images/companies/default_company.jpg',
    type: 'Full-time',
    location: 'San Francisco, CA',
    salary: '$100k - $150k',
    description: 'We need a skilled Backend Engineer to build scalable systems...',
    requirements: ['Node.js', 'Python', 'AWS', '3+ years'],
    tags: ['Node.js', 'Python', 'AWS', 'Backend'],
    status: 'active',
    postedAt: '2024-01-13',
    applicationsCount: 32,
    employerId: 'emp3',
  },
  {
    id: '4',
    title: 'Marketing Specialist',
    company: 'GrowthHub',
    companyLogo: '/images/companies/default_company.jpg',
    type: 'Part-time',
    location: 'Remote',
    salary: '$30k - $50k',
    description: 'Looking for a creative Marketing Specialist to drive our growth...',
    requirements: ['Marketing', 'Social Media', 'Content Creation'],
    tags: ['Marketing', 'Social Media', 'Content', 'Remote'],
    status: 'active',
    postedAt: '2024-01-12',
    applicationsCount: 15,
    employerId: 'emp4',
  },
];

interface JobStore {
  jobs: Job[];
  filteredJobs: Job[];
  filters: JobFilters;
  selectedJob: Job | null;
  isLoading: boolean;
  error: string | null;

  setFilters: (filters: JobFilters) => void;
  setSelectedJob: (job: Job | null) => void;
  applyFilters: () => void;
  loadJobs: () => Promise<void>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const asString = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const toJobType = (employmentType: unknown): Job['type'] => {
  const normalized = asString(employmentType).toUpperCase();
  if (normalized === 'PART_TIME') {
    return 'Part-time';
  }
  if (normalized === 'PROJECT' || normalized === 'SIDE_JOB') {
    return 'Contract';
  }

  return 'Full-time';
};

const toJobStatus = (status: unknown): Job['status'] => {
  const normalized = asString(status).toUpperCase();
  if (normalized === 'PUBLISHED' || normalized === 'ACTIVE') {
    return 'active';
  }
  if (normalized === 'ARCHIVED' || normalized === 'CLOSED') {
    return 'closed';
  }

  return 'pending';
};

const formatSalary = (salaryFrom: unknown, salaryTo: unknown, currency: unknown): string | undefined => {
  const from = asNumber(salaryFrom);
  const to = asNumber(salaryTo);
  const curr = asString(currency).trim() || 'USD';

  if (from === null && to === null) {
    return undefined;
  }

  if (from !== null && to !== null) {
    return `${from} - ${to} ${curr}`;
  }

  if (from !== null) {
    return `From ${from} ${curr}`;
  }

  return `Up to ${to} ${curr}`;
};

const unique = (items: string[]): string[] => {
  return [...new Set(items.filter(Boolean))];
};

const fromArray = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

const extractList = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  const list = payload.items || payload.data || payload.results || payload.vacancies;
  return Array.isArray(list) ? list : [];
};

const toJob = (value: unknown): Job | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = asString(value.id);
  if (!id) {
    return null;
  }

  const publicationCity = isRecord(value.publicationCity) ? value.publicationCity : null;
  const company = isRecord(value.company) ? value.company : null;
  const skillTexts = fromArray(value.skillTexts);
  const specializations = fromArray(value.specializations);
  const applications = fromArray(value.applications);
  const appCountFromCount = isRecord(value._count) ? asNumber(value._count.applications) : null;
  const favoritesCountFromCount = isRecord(value._count) ? asNumber(value._count.favorites) : null;

  const skills = unique(
    skillTexts
      .map((entry) => (isRecord(entry) ? asString(entry.name).trim() : ''))
      .filter(Boolean),
  );

  const specializationNames = unique(
    specializations
      .map((entry) => {
        if (!isRecord(entry)) {
          return '';
        }
        const nested = isRecord(entry.specialization) ? entry.specialization : null;
        return asString(nested?.name).trim();
      })
      .filter(Boolean),
  );

  const tags = unique([...skills, ...specializationNames]).slice(0, 12);
  const status = toJobStatus(value.status);

  return {
    id,
    title: asString(value.title) || 'Untitled vacancy',
    company: asString(company?.name) || 'Company',
    companyLogo: '/images/companies/default_company.jpg',
    type: toJobType(value.employmentType),
    location: asString(publicationCity?.name) || asString(value.workAddress) || 'Remote',
    salary: formatSalary(value.salaryFrom, value.salaryTo, value.currency),
    description: asString(value.description) || 'No description yet.',
    requirements: skills.length ? skills : specializationNames,
    tags,
    status,
    postedAt: asString(value.publishedAt) || asString(value.createdAt) || new Date().toISOString(),
    applicationsCount: appCountFromCount ?? applications.length,
    favoritesCount: favoritesCountFromCount ?? asNumber(value.favoritesCount) ?? undefined,
    employerId: asString(value.authorId) || asString(value.companyId) || 'employer',
  };
};

export const useJobStore = create<JobStore>((set, get) => ({
  jobs: mockJobs,
  filteredJobs: mockJobs,
  filters: {},
  selectedJob: null,
  isLoading: false,
  error: null,

  setFilters: (filters) => {
    set({ filters });
    get().applyFilters();
  },

  setSelectedJob: (job) => set({ selectedJob: job }),

  applyFilters: () => {
    const { jobs, filters } = get();
    let filtered = [...jobs];

    if (filters.type && filters.type !== 'All') {
      filtered = filtered.filter((job) => job.type === filters.type);
    }

    if (filters.location) {
      filtered = filtered.filter((job) =>
        job.location.toLowerCase().includes(filters.location!.toLowerCase())
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(searchLower) ||
          job.company.toLowerCase().includes(searchLower) ||
          job.description.toLowerCase().includes(searchLower) ||
          job.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((job) =>
        filters.tags!.some((tag) => job.tags.includes(tag))
      );
    }

    set({ filteredJobs: filtered });
  },

  loadJobs: async () => {
    set({ isLoading: true, error: null });

    try {
      const endpointCandidates = ['/public/vacancies', '/vacancies'];
      let response: { data: unknown } | null = null;

      for (const endpoint of endpointCandidates) {
        try {
          response = await api.get(endpoint);
          break;
        } catch (error) {
          const status = (error as { response?: { status?: number } })?.response?.status;
          const isLast = endpoint === endpointCandidates[endpointCandidates.length - 1];
          if (isLast || (status !== 401 && status !== 403 && status !== 404)) {
            throw error;
          }
        }
      }

      if (!response) {
        throw new Error('Failed to load jobs');
      }

      const jobs = extractList(response.data)
        .map((entry) => toJob(entry))
        .filter((entry): entry is Job => Boolean(entry))
        .filter((entry) => entry.status === 'active');

      set({
        jobs,
        filteredJobs: jobs,
        isLoading: false,
        error: null,
      });

      get().applyFilters();
    } catch (error) {
      set({
        jobs: mockJobs,
        filteredJobs: mockJobs,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load jobs',
      });
      get().applyFilters();
    }
  },
}));
