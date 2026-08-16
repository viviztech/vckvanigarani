import { api } from './api-client';
import type { EventDashboardData } from '../types';

export const dashboardApi = {
  get: (eventId: string) => api.get<EventDashboardData>(`/events/${eventId}/dashboard`),
  exportCsv: (eventId: string) => api.getBlob(`/events/${eventId}/dashboard/export`),
};
