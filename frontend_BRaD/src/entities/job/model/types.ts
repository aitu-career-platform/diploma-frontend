export type JobType = 'Internship' | 'Full-time' | 'Part-time' | 'Contract';
export type JobStatus = 'active' | 'closed' | 'pending';

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  type: JobType;
  location: string;
  salary?: string;
  description: string;
  requirements: string[];
  tags: string[];
  status: JobStatus;
  postedAt: string;
  applicationsCount: number;
  favoritesCount?: number;
  employerId: string;
}

export interface JobFilters {
  type?: JobType | 'All';
  location?: string;
  search?: string;
  tags?: string[];
  salaryMin?: number;
  salaryMax?: number;
}
