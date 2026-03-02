export type VacancyWorkflowStep =
  | 'basic'
  | 'conditions'
  | 'schedule'
  | 'address'
  | 'compensation'
  | 'description'
  | 'skills'
  | 'languages';

export interface DictionaryOption {
  value: string;
  label: string;
}

export interface VacancyDictionaries {
  specializations: DictionaryOption[];
  languages: DictionaryOption[];
  cities: DictionaryOption[];
  experienceLevels: DictionaryOption[];
  workerKinds: DictionaryOption[];
  employmentTypes: DictionaryOption[];
  workFormats: DictionaryOption[];
  contractTypes: DictionaryOption[];
  gphParties: DictionaryOption[];
  schedules: DictionaryOption[];
  workHours: DictionaryOption[];
  currencies: DictionaryOption[];
  salaryPeriods: DictionaryOption[];
  salaryTaxModes: DictionaryOption[];
  payoutFrequencies: DictionaryOption[];
  skillHints: DictionaryOption[];
  languageHints: DictionaryOption[];
  raw: Record<string, unknown>;
}

export interface CreateVacancyDraftPayload {
  title: string;
  specializationIds: string[];
  experienceLevel?: string;
  hiringPlan?: number;
}

export interface Vacancy {
  id: string;
  title: string;
  status: string;
  specializationIds: string[];
  experienceLevel?: string;
  hiringPlan?: number;
  workerKind?: string;
  employmentType?: string;
  workFormats: string[];
  schedules: string[];
  workHours: string[];
  publicationCityId?: string;
  workAddress?: string;
  hideWorkAddress?: boolean;
  salaryFrom?: number;
  salaryTo?: number;
  currency?: string;
  salaryPeriod?: string;
  salaryTaxMode?: string;
  payoutFrequency?: string;
  description?: string;
  skills: string[];
  languageIds: string[];
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  archivedAt?: string;
  raw: Record<string, unknown>;
}
