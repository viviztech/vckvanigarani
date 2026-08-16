import { api } from './api-client';
import type { VanigarEvent } from '../types';

export interface CreateEventInput {
  title: string;
  purpose: string;
  bannerUrl?: string;
  targetAmount?: number;
  suggestedAmountByPost?: Record<string, number>;
  jurisdictionScopeIds: string[];
  openDate: string;
  closeDate: string;
}

export const eventsApi = {
  list: () => api.get<VanigarEvent[]>('/events'),
  create: (input: CreateEventInput) => api.post<VanigarEvent>('/events', input),
  close: (id: string) => api.post<VanigarEvent>(`/events/${id}/close`),
};
