import { api } from './api-client';
import type { AdminRole, AdminScope } from '../types';

export interface GrantAdminScopeInput {
  bearerId: string;
  role: AdminRole;
  scopeJurisdictionUnitId?: string;
}

export const adminScopesApi = {
  list: () => api.get<AdminScope[]>('/admin-scopes'),
  me: () => api.get<AdminScope | null>('/admin-scopes/me'),
  grant: (input: GrantAdminScopeInput) => api.post<AdminScope>('/admin-scopes', input),
  revoke: (bearerId: string) => api.del<void>(`/admin-scopes/${bearerId}`),
};
