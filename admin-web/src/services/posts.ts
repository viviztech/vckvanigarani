import { api } from './api-client';
import type { JurisdictionType, OrgLevel, Post, PostBody, PostCapability } from '../types';

export interface CreatePostInput {
  name: string;
  body?: PostBody;
  applicableLevels: OrgLevel[];
  jurisdictionTypeRule?: JurisdictionType;
  jurisdictionExpandToChildren?: boolean;
  capabilities?: PostCapability[];
  rank?: number;
}

export const postsApi = {
  list: () => api.get<Post[]>('/posts'),
  create: (input: CreatePostInput) => api.post<Post>('/posts', input),
  update: (id: string, input: Partial<CreatePostInput> & { active?: boolean }) =>
    api.patch<Post>(`/posts/${id}`, input),
};
