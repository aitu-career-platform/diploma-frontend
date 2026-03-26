import { create } from 'zustand';
import api, { getApiErrorMessage } from '@shared/lib/api';
import type {
  FavoriteItem,
  FavoriteListFilters,
  FavoriteListMeta,
  FavoriteToggleResponse,
  FavoriteVacancy,
} from './types';

interface FavoritesStore {
  favoriteIds: Set<string>;
  items: FavoriteItem[];
  countsByVacancyId: Record<string, number>;
  meta: FavoriteListMeta;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  loadMyFavorites: (filters?: FavoriteListFilters) => Promise<void>;
  addFavorite: (vacancyId: string) => Promise<FavoriteToggleResponse>;
  removeFavorite: (vacancyId: string) => Promise<FavoriteToggleResponse>;
  toggleFavorite: (vacancyId: string) => Promise<FavoriteToggleResponse>;
  loadFavoritesCount: (vacancyId: string) => Promise<number>;
  isFavorite: (vacancyId: string) => boolean;
}

const defaultMeta: FavoriteListMeta = {
  total: 0,
  limit: 20,
  offset: 0,
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const asString = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

const asNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const normalizeVacancy = (payload: unknown): FavoriteVacancy | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const id = asString(payload.id);
  if (!id) {
    return null;
  }

  const company = isRecord(payload.company) ? payload.company : null;
  const publicationCity = isRecord(payload.publicationCity) ? payload.publicationCity : null;
  const specializations = Array.isArray(payload.specializations) ? payload.specializations : [];

  return {
    id,
    title: asString(payload.title) || 'Untitled vacancy',
    status: asString(payload.status),
    company: company
      ? {
          id: asString(company.id) || undefined,
          name: asString(company.name) || undefined,
        }
      : null,
    publicationCity: publicationCity
      ? {
          id: asString(publicationCity.id) || undefined,
          name: asString(publicationCity.name) || undefined,
          countryCode: asString(publicationCity.countryCode) || undefined,
        }
      : null,
    specializations: specializations
      .map((entry) => {
        if (!isRecord(entry)) {
          return null;
        }

        const nested = isRecord(entry.specialization) ? entry.specialization : entry;

        return {
          id: asString(nested.id) || undefined,
          name: asString(nested.name) || undefined,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry?.name || entry?.id)),
    favoritesCount: asNumber(payload.favoritesCount),
  };
};

const normalizeItems = (payload: unknown): FavoriteItem[] => {
  const list =
    isRecord(payload) && Array.isArray(payload.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];

  const items: FavoriteItem[] = [];

  list.forEach((entry) => {
    if (!isRecord(entry)) {
      return;
    }

    const vacancy = normalizeVacancy(entry.vacancy);
    if (!vacancy) {
      return;
    }

    items.push({
      favoriteCreatedAt: asString(entry.favoriteCreatedAt) || undefined,
      vacancy,
    });
  });

  return items;
};

const normalizeMeta = (payload: unknown): FavoriteListMeta => {
  if (!isRecord(payload) || !isRecord(payload.meta)) {
    return defaultMeta;
  }

  return {
    total: asNumber(payload.meta.total),
    limit: asNumber(payload.meta.limit) || defaultMeta.limit,
    offset: asNumber(payload.meta.offset),
  };
};

const buildCountsByVacancy = (items: FavoriteItem[]): Record<string, number> => {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.vacancy.id] = item.vacancy.favoritesCount;
    return acc;
  }, {});
};

const buildParams = (filters?: FavoriteListFilters): Record<string, string | number> => {
  if (!filters) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  ) as Record<string, string | number>;
};

const applyToggleResult = (
  state: FavoritesStore,
  result: FavoriteToggleResponse,
): Partial<FavoritesStore> => {
  const nextIds = new Set(state.favoriteIds);

  if (result.isFavorite) {
    nextIds.add(result.vacancyId);
  } else {
    nextIds.delete(result.vacancyId);
  }

  const nextItems = result.isFavorite
    ? state.items
    : state.items.filter((item) => item.vacancy.id !== result.vacancyId);

  return {
    favoriteIds: nextIds,
    items: nextItems,
    countsByVacancyId: {
      ...state.countsByVacancyId,
      [result.vacancyId]: result.favoritesCount,
    },
  };
};

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  favoriteIds: new Set<string>(),
  items: [],
  countsByVacancyId: {},
  meta: defaultMeta,
  isLoading: false,
  isMutating: false,
  error: null,

  loadMyFavorites: async (filters) => {
    set({ isLoading: true, error: null });

    try {
      const response = await api.get('/favorites/my', {
        params: buildParams(filters),
      });
      const items = normalizeItems(response.data);
      const countsByVacancyId = buildCountsByVacancy(items);

      set((state) => ({
        items,
        favoriteIds: new Set(items.map((item) => item.vacancy.id)),
        countsByVacancyId: {
          ...state.countsByVacancyId,
          ...countsByVacancyId,
        },
        meta: normalizeMeta(response.data),
        isLoading: false,
      }));
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load favorites');
      set({
        isLoading: false,
        error: message,
      });
      throw new Error(message);
    }
  },

  addFavorite: async (vacancyId) => {
    set({ isMutating: true, error: null });

    try {
      const response = await api.post(`/favorites/vacancies/${vacancyId}`);
      const result = response.data as FavoriteToggleResponse;

      set((state) => ({
        ...applyToggleResult(state, result),
        isMutating: false,
      }));

      return result;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to add favorite');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  removeFavorite: async (vacancyId) => {
    set({ isMutating: true, error: null });

    try {
      const response = await api.delete(`/favorites/vacancies/${vacancyId}`);
      const result = response.data as FavoriteToggleResponse;

      set((state) => ({
        ...applyToggleResult(state, result),
        isMutating: false,
      }));

      return result;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to remove favorite');
      set({ isMutating: false, error: message });
      throw new Error(message);
    }
  },

  toggleFavorite: async (vacancyId) => {
    if (get().favoriteIds.has(vacancyId)) {
      return get().removeFavorite(vacancyId);
    }

    return get().addFavorite(vacancyId);
  },

  loadFavoritesCount: async (vacancyId) => {
    try {
      const response = await api.get(`/favorites/vacancies/${vacancyId}/count`);
      const favoritesCount = asNumber(response.data?.favoritesCount);

      set((state) => ({
        countsByVacancyId: {
          ...state.countsByVacancyId,
          [vacancyId]: favoritesCount,
        },
      }));

      return favoritesCount;
    } catch (error) {
      const message = getApiErrorMessage(error, 'Failed to load favorites count');
      set({ error: message });
      throw new Error(message);
    }
  },

  isFavorite: (vacancyId) => get().favoriteIds.has(vacancyId),
}));
