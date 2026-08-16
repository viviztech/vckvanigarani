import { api } from './api-client';
import type { PendingRegistration } from '../types';

export const pendingRegistrationsApi = {
  list: () => api.get<PendingRegistration[]>('/pending-registrations'),
  approve: (id: string) =>
    api.post<{ registration: PendingRegistration; bearerId: string; membershipNo: string }>(`/pending-registrations/${id}/approve`, {}),
  reject: (id: string, reason?: string) =>
    api.post<PendingRegistration>(`/pending-registrations/${id}/reject`, { reason }),
};
