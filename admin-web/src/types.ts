export type OrgLevel = 'STATE' | 'DISTRICT' | 'BLOCK' | 'MUNICIPALITY' | 'TOWN_PANCHAYAT' | 'VILLAGE';

export type JurisdictionType =
  | 'STATE'
  | 'DISTRICT'
  | 'BLOCK'
  | 'MUNICIPALITY'
  | 'TOWN_PANCHAYAT'
  | 'VILLAGE'
  | 'PARLIAMENT_CONSTITUENCY'
  | 'ASSEMBLY_CONSTITUENCY';

export type JurisdictionTree = 'ADMINISTRATIVE' | 'ELECTORAL';
export type JurisdictionStatus = 'ACTIVE' | 'RETIRED';
export type PostCapability = 'FINANCE_VIEW';
export type PostBody = 'MAIN' | 'SUB';
export type BearerStatus = 'ACTIVE' | 'INACTIVE';
export type AssignmentStatus = 'ACTIVE' | 'CLOSED';

export interface Post {
  id: string;
  name: string;
  body: PostBody;
  applicableLevels: OrgLevel[];
  jurisdictionTypeRule: JurisdictionType | null;
  jurisdictionExpandToChildren: boolean;
  capabilities: PostCapability[];
  /** Top-to-bottom hierarchy order (lower = higher in the org) — used by the public Office Bearers listing. */
  rank: number;
  active: boolean;
  createdAt: string;
}

export interface JurisdictionUnit {
  id: string;
  tree: JurisdictionTree;
  type: JurisdictionType;
  name: string;
  parentId: string | null;
  /** Only set for ELECTORAL/ASSEMBLY_CONSTITUENCY — the ADMINISTRATIVE/DISTRICT its territory primarily falls in. */
  districtId: string | null;
  /** Only set on ADMINISTRATIVE/DISTRICT rows — the district segment of a membership ID (VCK-VGA-<code>-00001). */
  code: string | null;
  path: string[];
  depth: number;
  status: JurisdictionStatus;
}

export interface Bearer {
  id: string;
  fullName: string;
  fatherOrHusbandName: string;
  phone: string;
  email: string;
  photoUrl: string | null;
  address: string;
  habitationOrStreet: string;
  membershipNo: string;
  /** Voter ID number. */
  idProofRef: string;
  status: BearerStatus;
  homeAdministrativeUnitId: string | null;
  homeElectoralUnitId: string | null;
  homeDistrictId: string | null;
  homeAdministrativeUnit?: JurisdictionUnit | null;
  homeElectoralUnit?: JurisdictionUnit | null;
  homeDistrict?: JurisdictionUnit | null;
  createdAt: string;
}

export type PendingRegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PendingRegistration {
  id: string;
  fullName: string;
  fatherOrHusbandName: string;
  phone: string;
  email: string;
  address: string;
  habitationOrStreet: string;
  idProofRef: string;
  photoUrl: string | null;
  homeDistrictId: string;
  homeDistrict?: JurisdictionUnit;
  homeAdministrativeUnitId: string | null;
  homeElectoralUnitId: string | null;
  status: PendingRegistrationStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedByBearerId: string | null;
  resultingBearerId: string | null;
  rejectionReason: string | null;
}

export interface Assignment {
  id: string;
  bearerId: string;
  postId: string;
  status: AssignmentStatus;
  startDate: string;
  endDate: string | null;
  jurisdictions: { jurisdictionUnit: JurisdictionUnit }[];
  post?: Post;
}

export interface BearerDetail extends Bearer {
  assignments: Assignment[];
}

export interface CoverageReport {
  unfilled: JurisdictionUnit[];
  overlapping: { unit: JurisdictionUnit; bearers: Bearer[] }[];
}

export type NewsPostStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED';

export interface NewsPost {
  id: string;
  title: string;
  bodyHtml: string;
  targetEveryone: boolean;
  status: NewsPostStatus;
  authorId: string;
  publishedAt: string | null;
  updatedAt: string;
  deepLinkSlug: string;
  createdAt: string;
  jurisdictions: { jurisdictionUnit: JurisdictionUnit }[];
}

export type EventStatus = 'OPEN' | 'CLOSED';
export type ContributionStatus = 'PENDING' | 'VERIFIED' | 'FAILED';

export interface VanigarEvent {
  id: string;
  title: string;
  purpose: string;
  bannerUrl: string | null;
  targetAmount: string | null;
  suggestedAmountByPost: Record<string, number> | null;
  jurisdictionScopeIds: string[];
  openDate: string;
  closeDate: string;
  status: EventStatus;
  createdAt: string;
}

export interface Contribution {
  id: string;
  eventId: string;
  bearerId: string;
  amount: string;
  status: ContributionStatus;
  receiptUrl: string | null;
  verifiedAt: string | null;
  createdAt: string;
  event: VanigarEvent;
}

export interface DashboardByPostRow {
  postId: string;
  postName: string;
  totalAmount: number;
  contributorCount: number;
}

export interface EventDashboardData {
  raised: number;
  target: number | null;
  byPost: DashboardByPostRow[];
  paid: Bearer[];
  unpaid: Bearer[];
}

/** Administrative levels a jurisdiction picker can offer, per tree. */
export const ADMINISTRATIVE_TYPES: JurisdictionType[] = [
  'STATE',
  'DISTRICT',
  'BLOCK',
  'MUNICIPALITY',
  'TOWN_PANCHAYAT',
  'VILLAGE',
];
export const ELECTORAL_TYPES: JurisdictionType[] = ['STATE', 'PARLIAMENT_CONSTITUENCY', 'ASSEMBLY_CONSTITUENCY'];

/** A bearer's home address resolves to one of these — the leaf administrative levels. */
export const HOME_ADMINISTRATIVE_TYPES: JurisdictionType[] = ['BLOCK', 'MUNICIPALITY', 'TOWN_PANCHAYAT', 'VILLAGE'];
