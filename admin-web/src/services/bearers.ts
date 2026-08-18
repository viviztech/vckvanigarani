import { api } from './api-client';
import type { Bearer, BearerDetail, BearerStatus } from '../types';

export interface CreateBearerInput {
  fullName: string;
  fatherOrHusbandName: string;
  phone: string;
  /** Required, unique — this is the OTP login identity. */
  email: string;
  address: string;
  habitationOrStreet: string;
  /** Voter ID number. */
  idProofRef: string;
  photoUrl?: string;
  homeAdministrativeUnitId?: string;
  homeElectoralUnitId?: string;
  /** Required on create — the district segment of the generated membership ID comes from this. */
  homeDistrictId: string;
}

export interface BearerSearchParams {
  query?: string;
  postId?: string;
  jurisdictionId?: string;
}

function toQueryString(params: BearerSearchParams): string {
  const q = new URLSearchParams();
  if (params.query) q.set('query', params.query);
  if (params.postId) q.set('post_id', params.postId);
  if (params.jurisdictionId) q.set('jurisdiction_id', params.jurisdictionId);
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const bearersApi = {
  /** If `input.phone` already belongs to a bearer, the backend updates that bearer instead of creating a new one — `matchedExisting` tells you which happened. */
  create: (input: CreateBearerInput) => api.post<Bearer & { matchedExisting: boolean }>('/bearers', input),
  update: (id: string, input: Partial<CreateBearerInput> & { status?: BearerStatus }) =>
    api.patch<Bearer>(`/bearers/${id}`, input),
  search: (params: BearerSearchParams) => api.get<Bearer[]>(`/bearers${toQueryString(params)}`),
  getOne: (id: string) => api.get<BearerDetail>(`/bearers/${id}`),
  list: () => api.get<BearerDetail[]>('/bearers/list'),
};
