import { api } from './api-client';
import type { JurisdictionStatus, JurisdictionTree, JurisdictionType, JurisdictionUnit } from '../types';

export interface CreateJurisdictionInput {
  tree: JurisdictionTree;
  type: JurisdictionType;
  name: string;
  parentId?: string;
}

export const jurisdictionsApi = {
  list: (filters?: { tree?: JurisdictionTree; parent?: string }) => {
    const params = new URLSearchParams();
    if (filters?.tree) params.set('tree', filters.tree);
    if (filters?.parent) params.set('parent', filters.parent);
    const qs = params.toString();
    return api.get<JurisdictionUnit[]>(`/jurisdictions${qs ? `?${qs}` : ''}`);
  },
  create: (input: CreateJurisdictionInput) => api.post<JurisdictionUnit>('/jurisdictions', input),
  update: (id: string, input: { name?: string; parentId?: string; status?: JurisdictionStatus }) =>
    api.patch<JurisdictionUnit>(`/jurisdictions/${id}`, input),
};
