import { create } from 'zustand';
import api from '@shared/lib/api';
import type {
  CreateVacancyDraftPayload,
  DictionaryOption,
  Vacancy,
  VacancyDictionaries,
  VacancyWorkflowStep,
} from './types';

interface VacancyStore {
  vacancies: Vacancy[];
  currentVacancy: Vacancy | null;
  currentVacancyId: string | null;
  dictionaries: VacancyDictionaries;
  isDictionariesLoading: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  loadDictionaries: () => Promise<void>;
  loadMyVacancies: () => Promise<void>;
  loadVacancy: (id: string) => Promise<void>;
  createDraft: (payload: CreateVacancyDraftPayload) => Promise<Vacancy>;
  saveStep: (step: VacancyWorkflowStep, payload: Record<string, unknown>) => Promise<Vacancy>;
  publishCurrent: () => Promise<Vacancy>;
  archiveVacancy: (id: string) => Promise<Vacancy>;
  clearCurrent: () => void;
}

const defaultDictionaries: VacancyDictionaries = {
  specializations: [],
  languages: [],
  cities: [],
  experienceLevels: [
    { value: 'NO_EXPERIENCE', label: 'No Experience' },
    { value: 'ONE_TO_THREE_YEARS', label: '1-3 Years' },
    { value: 'THREE_TO_SIX_YEARS', label: '3-6 Years' },
    { value: 'SIX_PLUS_YEARS', label: '6+ Years' },
  ],
  workerKinds: [
    { value: 'PERMANENT', label: 'Permanent' },
    { value: 'TEMPORARY', label: 'Temporary' },
  ],
  employmentTypes: [
    { value: 'FULL_TIME', label: 'Full Time' },
    { value: 'PART_TIME', label: 'Part Time' },
    { value: 'PROJECT', label: 'Project' },
    { value: 'SIDE_JOB', label: 'Side Job' },
    { value: 'WATCH', label: 'Watch' },
  ],
  workFormats: [
    { value: 'ONSITE', label: 'Onsite' },
    { value: 'HYBRID', label: 'Hybrid' },
    { value: 'REMOTE', label: 'Remote' },
  ],
  contractTypes: [
    { value: 'LABOR', label: 'Labor' },
    { value: 'GPH', label: 'GPH' },
  ],
  gphParties: [
    { value: 'IP', label: 'IP' },
    { value: 'SELF_EMPLOYED', label: 'Self Employed' },
  ],
  schedules: [
    { value: 'FIVE_TWO', label: 'Five Two' },
  ],
  workHours: [
    { value: 'H8', label: '8 Hours' },
    { value: 'NEGOTIABLE', label: 'Negotiable' },
  ],
  currencies: [
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
    { value: 'KZT', label: 'KZT' },
  ],
  salaryPeriods: [
    { value: 'MONTH', label: 'Month' },
  ],
  salaryTaxModes: [
    { value: 'GROSS', label: 'Gross' },
    { value: 'NET', label: 'Net' },
  ],
  payoutFrequencies: [
    { value: 'MONTHLY', label: 'Monthly' },
  ],
  skillHints: [
    { value: 'react', label: 'React' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'nodejs', label: 'Node.js' },
  ],
  languageHints: [
    { value: 'english', label: 'English' },
    { value: 'russian', label: 'Russian' },
    { value: 'kazakh', label: 'Kazakh' },
  ],
  raw: {},
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const asString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const formatEnumLabel = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    return value;
  }

  return normalized
    .split('_')
    .map((chunk) => `${chunk.slice(0, 1)}${chunk.slice(1).toLowerCase()}`)
    .join(' ');
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const asBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
};

const pickFirst = (source: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (key in source) {
      return source[key];
    }
  }

  return undefined;
};

const normalizeId = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const RESERVED_ID_TOKENS = new Set([
  'api',
  'v1',
  'v2',
  'vacancy',
  'vacancies',
  'draft',
  'publish',
  'archive',
  'basic',
  'conditions',
  'schedule',
  'address',
  'compensation',
  'description',
  'skills',
  'languages',
]);

const isLikelyVacancyId = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (RESERVED_ID_TOKENS.has(normalized)) {
    return false;
  }

  return true;
};

const extractIdFromPath = (path: string): string | null => {
  const parts = path.split('/').filter(Boolean);
  if (!parts.length) {
    return null;
  }

  const last = normalizeId(parts[parts.length - 1]);
  if (!last || !isLikelyVacancyId(last)) {
    return null;
  }

  const previous = parts.length > 1 ? parts[parts.length - 2]?.toLowerCase() : '';
  const hasCollectionBefore = previous === 'vacancies' || previous === 'vacancy';

  // Most reliable URI format: /vacancies/:id
  if (hasCollectionBefore) {
    return last;
  }

  // Also allow plain header value with just id
  if (parts.length === 1) {
    return last;
  }

  return null;
};

const extractIdFromHeaders = (headers: Record<string, unknown>): string | null => {
  const preferredKeys = [
    'x-vacancy-id',
    'x-draft-id',
    'vacancy-id',
    'draft-id',
    'resource-id',
    'id',
    'location',
    'content-location',
  ];

  for (const key of preferredKeys) {
    const value = normalizeId(headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()]);
    if (!value) {
      continue;
    }

    if (key.includes('location')) {
      const fromPath = extractIdFromPath(value);
      if (fromPath) {
        return fromPath;
      }
      continue;
    }

    if (!isLikelyVacancyId(value)) {
      continue;
    }

    return value;
  }

  for (const [key, rawValue] of Object.entries(headers)) {
    const normalizedKey = key.toLowerCase();
    if (!normalizedKey.includes('id') && !normalizedKey.includes('location')) {
      continue;
    }

    const value = normalizeId(rawValue);
    if (!value) {
      continue;
    }

    if (normalizedKey.includes('location')) {
      const fromPath = extractIdFromPath(value);
      if (fromPath) {
        return fromPath;
      }
      continue;
    }

    if (!isLikelyVacancyId(value)) {
      continue;
    }

    return value;
  }

  return null;
};

const extractDraftId = (
  payload: unknown,
  headers?: unknown,
  responseUrl?: unknown
): string | null => {
  if (typeof payload === 'string') {
    const asDirect = normalizeId(payload);
    if (asDirect) {
      return asDirect;
    }
  }

  if (typeof payload === 'number') {
    return String(payload);
  }

  if (isRecord(payload)) {
    const direct = normalizeId(
      pickFirst(payload, [
        'id',
        'vacancyId',
        'vacancy_id',
        'draftId',
        'draft_id',
        'createdId',
        'created_id',
      ])
    );

    if (direct) {
      return direct;
    }

    const nestedKeys = ['data', 'vacancy', 'result', 'item'];
    for (const key of nestedKeys) {
      const nested = payload[key];
      if (isRecord(nested)) {
        const nestedId = normalizeId(
          pickFirst(nested, ['id', 'vacancyId', 'vacancy_id', 'draftId', 'draft_id'])
        );
        if (nestedId) {
          return nestedId;
        }
      }
    }
  }

  if (isRecord(headers)) {
    const fromHeaders = extractIdFromHeaders(headers);
    if (fromHeaders) {
      return fromHeaders;
    }
  }

  const responseUrlValue = normalizeId(responseUrl);
  if (responseUrlValue) {
    try {
      const parsedUrl = new URL(responseUrlValue, window.location.origin);
      const fromPath = extractIdFromPath(parsedUrl.pathname);
      if (fromPath) {
        return fromPath;
      }
    } catch {
      const fromPath = extractIdFromPath(responseUrlValue);
      if (fromPath) {
        return fromPath;
      }
    }
  }

  return null;
};

const toOption = (value: unknown): DictionaryOption | null => {
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    return { value: normalized, label: formatEnumLabel(normalized) };
  }

  if (!isRecord(value)) {
    return null;
  }

  const optionValue = asString(value.value) || asString(value.id) || asString(value.code) || asString(value.key);
  const optionLabel =
    asString(value.label) || asString(value.name) || asString(value.title) || optionValue;

  if (!optionValue || !optionLabel) {
    return null;
  }

  return {
    value: optionValue,
    label: optionLabel,
  };
};

const extractOptions = (value: unknown): DictionaryOption[] => {
  const source = Array.isArray(value)
    ? value
    : isRecord(value)
      ? Object.values(value)
      : [];

  return source
    .map((item) => toOption(item))
    .filter((item): item is DictionaryOption => Boolean(item));
};

const readOptions = (raw: Record<string, unknown>, keys: string[], fallback: DictionaryOption[]): DictionaryOption[] => {
  for (const key of keys) {
    const options = extractOptions(raw[key]);
    if (options.length > 0) {
      return options;
    }
  }

  return fallback;
};

const normalizeDictionaries = (payload: unknown): VacancyDictionaries => {
  const root = isRecord(payload) ? payload : {};
  const raw = isRecord(root.data) ? root.data : root;
  const enums = isRecord(raw.enums) ? raw.enums : isRecord(root.enums) ? root.enums : {};

  return {
    specializations: readOptions(raw, ['specializations'], defaultDictionaries.specializations),
    languages: readOptions(raw, ['languages'], defaultDictionaries.languages),
    cities: readOptions(raw, ['cities'], defaultDictionaries.cities),
    experienceLevels: readOptions(enums, ['experienceLevel', 'experienceLevels'], defaultDictionaries.experienceLevels),
    workerKinds: readOptions(enums, ['workerKind', 'workerKinds'], defaultDictionaries.workerKinds),
    employmentTypes: readOptions(enums, ['employmentType', 'employmentTypes'], readOptions(raw, ['employmentTypes', 'employment', 'employmentType', 'employment_type'], defaultDictionaries.employmentTypes)),
    workFormats: readOptions(enums, ['workFormat', 'workFormats'], readOptions(raw, ['workFormats', 'workFormat', 'formats', 'work_format'], defaultDictionaries.workFormats)),
    contractTypes: readOptions(enums, ['contractType', 'contractTypes'], defaultDictionaries.contractTypes),
    gphParties: readOptions(enums, ['gphParty', 'gphParties'], defaultDictionaries.gphParties),
    schedules: readOptions(enums, ['workScheduleType', 'schedules'], readOptions(raw, ['schedules', 'schedule', 'scheduleTypes', 'schedule_types'], defaultDictionaries.schedules)),
    workHours: readOptions(enums, ['workHourType', 'workHours'], defaultDictionaries.workHours),
    currencies: readOptions(raw, ['currencies', 'currency', 'salaryCurrencies', 'salary_currencies'], defaultDictionaries.currencies),
    salaryPeriods: readOptions(enums, ['salaryPeriod', 'salaryPeriods'], defaultDictionaries.salaryPeriods),
    salaryTaxModes: readOptions(enums, ['salaryTaxMode', 'salaryTaxModes'], defaultDictionaries.salaryTaxModes),
    payoutFrequencies: readOptions(enums, ['payoutFrequency', 'payoutFrequencies'], defaultDictionaries.payoutFrequencies),
    skillHints: readOptions(raw, ['skills', 'skillHints', 'skill_hints'], defaultDictionaries.skillHints),
    languageHints: readOptions(raw, ['languageHints', 'language_hints'], defaultDictionaries.languageHints),
    raw,
  };
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry.trim();
      }

      if (isRecord(entry)) {
        return asString(entry.name) || asString(entry.label) || asString(entry.value) || '';
      }

      return '';
    })
    .filter(Boolean);
};

const toIdArray = (value: unknown, directIdKeys: string[] = ['id', 'value']): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry.trim();
      }

      if (!isRecord(entry)) {
        return '';
      }

      for (const key of directIdKeys) {
        const id = asString(entry[key]);
        if (id) {
          return id;
        }
      }

      const nestedId =
        asString(pickFirst(entry, ['specializationId', 'languageId'])) ||
        (isRecord(entry.specialization) ? asString(entry.specialization.id) : undefined) ||
        (isRecord(entry.language) ? asString(entry.language.id) : undefined);

      return nestedId || '';
    })
    .filter(Boolean);
};

const toEnumArray = (value: unknown, keyCandidates: string[]): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry.trim();
      }

      if (!isRecord(entry)) {
        return '';
      }

      const direct = keyCandidates
        .map((key) => asString(entry[key]))
        .find((candidate): candidate is string => Boolean(candidate));

      return direct || '';
    })
    .filter(Boolean);
};

const normalizeVacancy = (payload: unknown): Vacancy => {
  const raw = isRecord(payload) ? payload : {};

  const id = String(pickFirst(raw, ['id', 'vacancyId', 'vacancy_id']) || '');

  return {
    id,
    title: asString(pickFirst(raw, ['title', 'position', 'name'])) || 'Untitled vacancy',
    status: asString(pickFirst(raw, ['status', 'state'])) || 'DRAFT',
    specializationIds: toIdArray(pickFirst(raw, ['specializations']), ['specializationId', 'id', 'value']),
    experienceLevel: asString(pickFirst(raw, ['experienceLevel'])),
    hiringPlan: asNumber(pickFirst(raw, ['hiringPlan'])),
    workerKind: asString(pickFirst(raw, ['workerKind'])),
    employmentType: asString(pickFirst(raw, ['employmentType', 'employment_type'])),
    workFormats: toEnumArray(pickFirst(raw, ['workFormats']), ['format', 'workFormat', 'value']),
    schedules: toEnumArray(pickFirst(raw, ['schedules']), ['schedule', 'value']),
    workHours: toEnumArray(pickFirst(raw, ['workHours']), ['hourType', 'workHour', 'value']),
    publicationCityId: asString(pickFirst(raw, ['publicationCityId'])),
    workAddress: asString(pickFirst(raw, ['workAddress'])),
    hideWorkAddress: asBoolean(pickFirst(raw, ['hideWorkAddress'])),
    salaryFrom: asNumber(pickFirst(raw, ['salaryFrom', 'salary_from'])),
    salaryTo: asNumber(pickFirst(raw, ['salaryTo', 'salary_to'])),
    currency: asString(pickFirst(raw, ['currency'])),
    salaryPeriod: asString(pickFirst(raw, ['salaryPeriod'])),
    salaryTaxMode: asString(pickFirst(raw, ['salaryTaxMode'])),
    payoutFrequency: asString(pickFirst(raw, ['payoutFrequency'])),
    description: asString(pickFirst(raw, ['description'])),
    skills: toStringArray(pickFirst(raw, ['skillTexts', 'skills'])),
    languageIds: toIdArray(pickFirst(raw, ['languages']), ['languageId', 'id', 'value']),
    favoritesCount: asNumber(pickFirst(raw, ['favoritesCount'])),
    createdAt: asString(pickFirst(raw, ['createdAt', 'created_at'])),
    updatedAt: asString(pickFirst(raw, ['updatedAt', 'updated_at'])),
    publishedAt: asString(pickFirst(raw, ['publishedAt', 'published_at'])),
    archivedAt: asString(pickFirst(raw, ['archivedAt', 'archived_at'])),
    raw,
  };
};

const extractList = (payload: unknown): Vacancy[] => {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeVacancy(item)).filter((item) => Boolean(item.id));
  }

  if (!isRecord(payload)) {
    return [];
  }

  const listKeyCandidates = ['items', 'data', 'vacancies', 'results'];
  for (const key of listKeyCandidates) {
    if (Array.isArray(payload[key])) {
      return (payload[key] as unknown[])
        .map((item) => normalizeVacancy(item))
        .filter((item) => Boolean(item.id));
    }
  }

  return [];
};

const upsertVacancy = (vacancies: Vacancy[], vacancy: Vacancy): Vacancy[] => {
  const index = vacancies.findIndex((item) => item.id === vacancy.id);
  if (index === -1) {
    return [vacancy, ...vacancies];
  }

  const next = [...vacancies];
  next[index] = vacancy;
  return next;
};

const applyVacancyResponse = (
  current: Vacancy | null,
  id: string | null,
  payload: unknown
): Vacancy => {
  const normalized = normalizeVacancy(payload);
  if (normalized.id) {
    return normalized;
  }

  if (current && (!id || current.id === id)) {
    return {
      ...current,
      raw: isRecord(payload) ? payload : current.raw,
    };
  }

  return normalizeVacancy(id ? { id } : {});
};

type HttpMethod = 'get' | 'post' | 'patch';

const getErrorStatus = (error: unknown): number | null => {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return null;
  }

  const response = (error as { response?: { status?: number } }).response;
  return typeof response?.status === 'number' ? response.status : null;
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    const responseData = (error as { response?: { data?: unknown } }).response?.data;
    if (isRecord(responseData)) {
      const messageField = responseData.message;
      if (Array.isArray(messageField)) {
        const joined = messageField
          .map((item) => (typeof item === 'string' ? item : ''))
          .filter(Boolean)
          .join('; ');
        if (joined) {
          return joined;
        }
      }
      if (typeof messageField === 'string' && messageField.trim()) {
        return messageField.trim();
      }
      const errorField = asString(responseData.error);
      if (errorField) {
        return errorField;
      }
    }

    return error.message;
  }

  return fallback;
};

const requestWithFallback = async (
  method: HttpMethod,
  paths: string[],
  payload?: unknown
) => {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      if (method === 'get') {
        return await api.get(path);
      }
      if (method === 'post') {
        return await api.post(path, payload || {});
      }
      return await api.patch(path, payload || {});
    } catch (error) {
      lastError = error;
      const status = getErrorStatus(error);
      if (status === 404 && path !== paths[paths.length - 1]) {
        continue;
      }
      throw error;
    }
  }

  throw lastError;
};

export const useVacancyStore = create<VacancyStore>((set, get) => ({
  vacancies: [],
  currentVacancy: null,
  currentVacancyId: null,
  dictionaries: defaultDictionaries,
  isDictionariesLoading: false,
  isLoading: false,
  isSaving: false,
  error: null,

  loadDictionaries: async () => {
    set({ isDictionariesLoading: true });

    try {
      const response = await requestWithFallback('get', ['/vacancies/dictionaries']);
      set({ dictionaries: normalizeDictionaries(response.data), isDictionariesLoading: false, error: null });
    } catch (error) {
      set({
        dictionaries: defaultDictionaries,
        isDictionariesLoading: false,
        error: getErrorMessage(error, 'Failed to load vacancy dictionaries'),
      });
    }
  },

  loadMyVacancies: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await requestWithFallback('get', ['/vacancies']);
      const vacancies = extractList(response.data);
      set({ vacancies, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  loadVacancy: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const response = await requestWithFallback('get', [`/vacancies/${id}`]);
      const vacancy = normalizeVacancy(response.data);

      if (!vacancy.id) {
        throw new Error('Vacancy id is missing');
      }

      set((state) => ({
        currentVacancy: vacancy,
        currentVacancyId: vacancy.id,
        vacancies: upsertVacancy(state.vacancies, vacancy),
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false, error: 'Failed to load vacancy' });
      throw new Error('Failed to load vacancy');
    }
  },

  createDraft: async (payload: CreateVacancyDraftPayload) => {
    set({ isSaving: true, error: null });

    try {
      const response = await requestWithFallback('post', ['/vacancies'], payload);
      const responsePayload =
        isRecord(response.data) && isRecord(response.data.vacancy) ? response.data.vacancy : response.data;
      const responseId = extractDraftId(
        response.data,
        response.headers,
        (response as { request?: { responseURL?: string } }).request?.responseURL
      );
      const baseVacancy = responseId
        ? normalizeVacancy({ ...(isRecord(responsePayload) ? responsePayload : {}), id: responseId })
        : normalizeVacancy(responsePayload);
      const normalizedId = baseVacancy.id || null;

      if (!normalizedId) {
        throw new Error('Backend did not return draft id');
      }

      set((state) => ({
        currentVacancy: normalizedId === baseVacancy.id ? baseVacancy : { ...baseVacancy, id: normalizedId },
        currentVacancyId: normalizedId,
        vacancies: upsertVacancy(
          state.vacancies,
          normalizedId === baseVacancy.id ? baseVacancy : { ...baseVacancy, id: normalizedId }
        ),
        isSaving: false,
      }));

      return normalizedId === baseVacancy.id ? baseVacancy : { ...baseVacancy, id: normalizedId };
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to create draft');
      set({ isSaving: false, error: message });
      throw new Error(message);
    }
  },

  saveStep: async (step: VacancyWorkflowStep, payload: Record<string, unknown>) => {
    const vacancyId = get().currentVacancyId;
    if (!vacancyId || !isLikelyVacancyId(vacancyId)) {
      throw new Error('Create draft first');
    }

    set({ isSaving: true, error: null });

    try {
      const response = await requestWithFallback(
        'patch',
        [`/vacancies/${vacancyId}/${step}`],
        payload
      );
      const vacancy = applyVacancyResponse(get().currentVacancy, vacancyId, response.data);

      set((state) => ({
        currentVacancy: vacancy,
        currentVacancyId: vacancy.id || state.currentVacancyId,
        vacancies: vacancy.id ? upsertVacancy(state.vacancies, vacancy) : state.vacancies,
        isSaving: false,
      }));

      return vacancy;
    } catch (error) {
      const message = getErrorMessage(error, `Failed to save ${step}`);
      set({ isSaving: false, error: message });
      throw new Error(message);
    }
  },

  publishCurrent: async () => {
    const vacancyId = get().currentVacancyId;
    if (!vacancyId || !isLikelyVacancyId(vacancyId)) {
      throw new Error('Create draft first');
    }

    set({ isSaving: true, error: null });

    try {
      const response = await requestWithFallback(
        'post',
        [`/vacancies/${vacancyId}/publish`],
        {}
      );
      const vacancy = applyVacancyResponse(get().currentVacancy, vacancyId, response.data);

      set((state) => ({
        currentVacancy: vacancy,
        currentVacancyId: vacancy.id || state.currentVacancyId,
        vacancies: vacancy.id ? upsertVacancy(state.vacancies, vacancy) : state.vacancies,
        isSaving: false,
      }));

      return vacancy;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to publish vacancy');
      set({ isSaving: false, error: message });
      throw new Error(message);
    }
  },

  archiveVacancy: async (id: string) => {
    set({ isSaving: true, error: null });

    try {
      const response = await requestWithFallback('post', [`/vacancies/${id}/archive`], {});
      const vacancy = applyVacancyResponse(get().currentVacancy, id, response.data);

      set((state) => ({
        currentVacancy: state.currentVacancyId === id ? vacancy : state.currentVacancy,
        vacancies: upsertVacancy(state.vacancies, vacancy),
        isSaving: false,
      }));

      return vacancy;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to archive vacancy');
      set({ isSaving: false, error: message });
      throw new Error(message);
    }
  },

  clearCurrent: () => {
    set({ currentVacancy: null, currentVacancyId: null, error: null });
  },
}));
