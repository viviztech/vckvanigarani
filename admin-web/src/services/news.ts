import { api } from './api-client';
import type { NewsPost } from '../types';

export interface CreateNewsPostInput {
  title: string;
  bodyHtml: string;
  targetEveryone: boolean;
  jurisdictionUnitIds?: string[];
}

export const newsApi = {
  create: (input: CreateNewsPostInput) => api.post<NewsPost>('/news', input),
  update: (id: string, input: Partial<CreateNewsPostInput>) => api.patch<NewsPost>(`/news/${id}`, input),
  publish: (id: string) => api.post<NewsPost>(`/news/${id}/publish`),
  unpublish: (id: string) => api.post<NewsPost>(`/news/${id}/unpublish`),
  republish: (id: string) => api.post<NewsPost>(`/news/${id}/republish`),
  getForEdit: (id: string) => api.get<NewsPost>(`/news/${id}/edit`),
  drafts: () => api.get<NewsPost[]>('/news/drafts'),
};
