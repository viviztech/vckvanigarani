import { api } from './api-client';
import type { CoverageReport } from '../types';

export const reportsApi = {
  coverage: (postId: string) => api.get<CoverageReport>(`/reports/coverage?post_id=${encodeURIComponent(postId)}`),
};
