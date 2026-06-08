import api from '@shared/lib/api';
import type { AnalyticsEnvelope, AnalyticsQuery, AnalyticsTab } from './types';

const buildParams = (query?: AnalyticsQuery): Record<string, string> => {
  if (!query) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
  ) as Record<string, string>;
};

const getEndpoint = (tab: AnalyticsTab): string => {
  switch (tab) {
    case 'overview':
      return '/analytics/overview';
    case 'users':
      return '/analytics/users';
    case 'vacancies':
      return '/analytics/vacancies';
    case 'applications':
      return '/analytics/applications';
    case 'employers':
      return '/analytics/employers';
    case 'candidates':
      return '/analytics/candidates';
    case 'universities':
      return '/analytics/universities';
    case 'pipeline':
      return '/analytics/pipeline';
    case 'compliance':
      return '/analytics/compliance';
    case 'reports':
      return '/analytics/reports/platform-summary';
    default:
      return '/analytics/overview';
  }
};

const loadAnalytics = async (tab: AnalyticsTab, query?: AnalyticsQuery): Promise<AnalyticsEnvelope> => {
  const response = await api.get(getEndpoint(tab), {
    params: buildParams(query),
  });

  return response.data as AnalyticsEnvelope;
};

export const analyticsApi = {
  getAnalyticsOverview: (query?: AnalyticsQuery) => loadAnalytics('overview', query),
  getUsersAnalytics: (query?: AnalyticsQuery) => loadAnalytics('users', query),
  getVacanciesAnalytics: (query?: AnalyticsQuery) => loadAnalytics('vacancies', query),
  getApplicationsAnalytics: (query?: AnalyticsQuery) => loadAnalytics('applications', query),
  getEmployersAnalytics: (query?: AnalyticsQuery) => loadAnalytics('employers', query),
  getCandidatesAnalytics: (query?: AnalyticsQuery) => loadAnalytics('candidates', query),
  getUniversitiesAnalytics: (query?: AnalyticsQuery) => loadAnalytics('universities', query),
  getPipelineAnalytics: (query?: AnalyticsQuery) => loadAnalytics('pipeline', query),
  getComplianceAnalytics: (query?: AnalyticsQuery) => loadAnalytics('compliance', query),
  getReportsAnalytics: (query?: AnalyticsQuery) => loadAnalytics('reports', query),
};
