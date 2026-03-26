export interface FavoriteToggleResponse {
  vacancyId: string;
  isFavorite: boolean;
  favoritesCount: number;
}

export interface FavoriteCompany {
  id?: string;
  name?: string;
}

export interface FavoriteCity {
  id?: string;
  name?: string;
  countryCode?: string;
}

export interface FavoriteSpecialization {
  id?: string;
  name?: string;
}

export interface FavoriteVacancy {
  id: string;
  title: string;
  status?: string;
  company?: FavoriteCompany | null;
  publicationCity?: FavoriteCity | null;
  specializations: FavoriteSpecialization[];
  favoritesCount: number;
}

export interface FavoriteItem {
  favoriteCreatedAt?: string;
  vacancy: FavoriteVacancy;
}

export interface FavoriteListMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface FavoriteListFilters {
  status?: string;
  limit?: number;
  offset?: number;
}
