export type AnalyticsRange = '7d' | '30d' | '90d' | '12m' | 'all';
export type AnalyticsTab =
  | 'overview'
  | 'users'
  | 'vacancies'
  | 'applications'
  | 'employers'
  | 'candidates'
  | 'universities'
  | 'pipeline'
  | 'compliance'
  | 'reports';

export interface AnalyticsEnvelope {
  range: string;
  generatedAt: string;
  available: boolean;
  message: string | null;
  summary: Record<string, unknown>;
  charts: Record<string, unknown>;
  tables: Record<string, unknown>;
}

export interface AnalyticsQuery {
  range?: AnalyticsRange;
  dateFrom?: string;
  dateTo?: string;
}
