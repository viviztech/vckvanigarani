import { api } from './api-client';
import type { Assignment } from '../types';

export interface CreateAssignmentInput {
  bearerId: string;
  postId: string;
  jurisdictionUnitIds: string[];
  startDate: string;
}

export const assignmentsApi = {
  create: (input: CreateAssignmentInput) => api.post<Assignment>('/assignments', input),
  close: (id: string, endDate: string) => api.post<Assignment>(`/assignments/${id}/close`, { endDate }),
};
