const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    const message =
      body && typeof body === 'object' && 'message' in body ? String((body as { message: unknown }).message) : `Request failed (${status})`;
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let responseBody: unknown = null;
    try {
      responseBody = await res.json();
    } catch {
      /* no JSON body on this error response */
    }
    throw new ApiError(res.status, responseBody);
  }

  if (res.status === 202 || res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export type JurisdictionType =
  | 'STATE'
  | 'DISTRICT'
  | 'BLOCK'
  | 'MUNICIPALITY'
  | 'TOWN_PANCHAYAT'
  | 'VILLAGE'
  | 'PARLIAMENT_CONSTITUENCY'
  | 'ASSEMBLY_CONSTITUENCY';

export interface JurisdictionUnit {
  id: string;
  tree: 'ADMINISTRATIVE' | 'ELECTORAL';
  type: JurisdictionType;
  name: string;
  parentId: string | null;
  districtId: string | null;
  code: string | null;
  path: string[];
  depth: number;
  status: 'ACTIVE' | 'RETIRED';
}

export interface RegistrationInput {
  fullName: string;
  fatherOrHusbandName: string;
  phone: string;
  code: string;
  email?: string;
  address: string;
  habitationOrStreet: string;
  idProofRef: string;
  homeDistrictId: string;
  homeAdministrativeUnitId?: string;
  homeElectoralUnitId?: string;
}

export type PostBody = 'MAIN' | 'SUB';

export interface Post {
  id: string;
  name: string;
  body: PostBody;
  rank: number;
}

export interface DirectoryEntry {
  assignmentId: string;
  bearerId: string;
  fullName: string;
  post: Post;
  jurisdictions: { id: string; name: string; type: JurisdictionType; path: string[]; districtId: string | null }[];
}

export interface NewsItem {
  id: string;
  title: string;
  bodyHtml: string;
  publishedAt: string;
  deepLinkSlug: string;
}

export type EventStatus = 'OPEN' | 'CLOSED';

export interface EventItem {
  id: string;
  title: string;
  purpose: string;
  bannerUrl: string | null;
  targetAmount: number | null;
  raised: number;
  openDate: string;
  closeDate: string;
  status: EventStatus;
}

export const publicApi = {
  requestOtp: (phone: string) => request<void>('/auth/otp/request', 'POST', { phone }),
  jurisdictions: (tree: 'ADMINISTRATIVE' | 'ELECTORAL') =>
    request<JurisdictionUnit[]>(`/public/jurisdictions?tree=${tree}`, 'GET'),
  register: (input: RegistrationInput) => request<{ id: string; status: string }>('/public/registrations', 'POST', input),
  posts: () => request<Post[]>('/public/posts', 'GET'),
  bearersDirectory: () => request<DirectoryEntry[]>('/public/bearers-directory', 'GET'),
  news: () => request<NewsItem[]>('/public/news', 'GET'),
  events: () => request<EventItem[]>('/public/events', 'GET'),
};
