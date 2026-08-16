# Phase 1 Data Model: Bearer & Hierarchy Register

Derived from the Key Entities in [spec.md](./spec.md) and the storage decisions in
[research.md](./research.md).

## Post

A configurable title (Constitution Principle I) — never hard-coded.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| name | string | e.g. "Organizer", "Finance Secretary", "Secretary" — unique within `applicable_levels` |
| applicable_levels | enum[] | subset of `STATE, DISTRICT, BLOCK, MUNICIPALITY, TOWN_PANCHAYAT` |
| jurisdiction_type_rule | enum | which `JurisdictionUnit.type` an assignment of this post must use (FR-008), e.g. State Secretary → `PARLIAMENT_CONSTITUENCY` |
| capabilities | enum[] | data-driven grants held by anyone currently assigned this post, e.g. `FINANCE_VIEW` (FR-018, Constitution Principle I). Empty by default; not tied to any title string — a post named anything can carry `FINANCE_VIEW` if Super Admin sets it |
| active | boolean | soft-disable instead of delete |
| created_by, created_at | ref, timestamp | |

**Validation**: `applicable_levels` non-empty. `jurisdiction_type_rule` required for
state-level electoral posts (State Secretary, State Deputy Secretary); optional
(defaults to the administrative unit at the post's level) otherwise. `capabilities`
is an open enum Super Admin can extend without a schema change (starts with just
`FINANCE_VIEW`, seeded onto the Finance Secretary post per spec.md Assumptions,
but is not hardcoded to it).

**Capability resolution**: a Bearer's effective capabilities at runtime = the
union of `capabilities` on every Post referenced by their currently `ACTIVE`
Assignments, each scoped to that assignment's jurisdiction. This is separate from
and additive to whatever `AdminScope.role` (below) they may also hold — a Finance
Secretary who is *not* otherwise an admin still gets `FINANCE_VIEW` for their own
jurisdiction. The finance screens that consume `FINANCE_VIEW` are out of scope for
this feature (see Contribution & Events feature) — this feature is responsible
only for the grant existing and resolving correctly.

## JurisdictionUnit

One node in either tree (Constitution Principle II — trees never merge).

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| tree | enum | `ADMINISTRATIVE` \| `ELECTORAL` |
| type | enum | `STATE, DISTRICT, BLOCK, MUNICIPALITY, TOWN_PANCHAYAT` (administrative) or `STATE, PARLIAMENT_CONSTITUENCY, ASSEMBLY_CONSTITUENCY` (electoral) |
| name | string | |
| parent_id | uuid, nullable | null only for the root `STATE` node of each tree |
| path | uuid[] | materialized ancestor chain, root first (research.md §2) |
| depth | int | |
| status | enum | `ACTIVE, RETIRED` — retired units block new assignments but keep history |

**Validation**: `parent.type` must be the immediate allowed parent for `type`
(`DISTRICT` ← `STATE`; `BLOCK`/`MUNICIPALITY`/`TOWN_PANCHAYAT` ← `DISTRICT`;
`PARLIAMENT_CONSTITUENCY` ← `STATE`; `ASSEMBLY_CONSTITUENCY` ← `PARLIAMENT_CONSTITUENCY`).
`tree` is immutable once set.

**State transitions**: `ACTIVE` → renamed (name changes, `path`/`id` unaffected) →
`ACTIVE` with new `parent_id` (merge; existing `AssignmentJurisdiction` rows
re-point automatically since they reference `id`, not `path` — edge case from
spec.md) → `RETIRED` (blocks new assignments; existing assignments and history
untouched).

## Bearer

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| full_name | string | |
| phone | string | unique, E.164 |
| photo_url | string, nullable | |
| address | string | |
| membership_no | string | unique |
| id_proof_ref | string | reference/pointer only — no raw ID document content beyond what Principle IV requires |
| status | enum | `ACTIVE, INACTIVE` |
| created_at | timestamp | |

**Validation**: `phone` and `membership_no` unique. Per Constitution Principle IV,
no payment credentials are ever stored on this or any related entity. There is no
create path for this entity other than an authorized admin's request (FR-015) —
no public signup endpoint exists at all, not merely a hidden one.

**State transitions**: `ACTIVE` → `INACTIVE` (soft removal; FR requires history to
remain visible — see Assignment below). `INACTIVE` bearers cannot receive new
assignments.

**Login vs. creation**: OTP login (`/auth/otp/*`, contracts/api.md) authenticates
against an existing `Bearer.phone`; it never creates one. A verify attempt for a
phone with no matching `ACTIVE` Bearer is rejected (FR-016).

## Assignment

Links one Bearer to one Post; the unit of history (Constitution Principle II).

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| bearer_id | ref → Bearer | |
| post_id | ref → Post | |
| status | enum | `ACTIVE, CLOSED` |
| start_date | date | |
| end_date | date, nullable | set only when `status = CLOSED` |
| created_by, closed_by | ref, nullable | audit trail |
| created_at | timestamp | |

**Validation**: `end_date` null while `ACTIVE`; `end_date >= start_date` when
`CLOSED`. The set of linked `JurisdictionUnit`s (via `AssignmentJurisdiction`)
MUST all match `post.jurisdiction_type_rule` when one is defined (FR-008) — e.g. a
State Deputy Secretary assignment's jurisdiction resolves from exactly one
`PARLIAMENT_CONSTITUENCY` to that constituency's `ASSEMBLY_CONSTITUENCY` children.

**State transitions**: `ACTIVE` → `CLOSED` only (FR-007 — closing sets `end_date`
and `closed_by`; the row is never deleted or reopened; a new `Assignment` row is
created for a reassignment).

## AssignmentJurisdiction (bridge)

| Field | Type | Notes |
|---|---|---|
| assignment_id | ref → Assignment | |
| jurisdiction_unit_id | ref → JurisdictionUnit | |

**Validation**: composite unique on `(assignment_id, jurisdiction_unit_id)`. Many
rows per assignment support multi-constituency coverage (e.g. a State Secretary's
three Parliament Constituencies).

## AdminScope

Not named in the spec's Key Entities but required to implement FR-010/FR-011 and
Constitution Principle V.

| Field | Type | Notes |
|---|---|---|
| admin_bearer_id | ref → Bearer | |
| role | enum | `SUPER_ADMIN, STATE_ADMIN, DISTRICT_ADMIN, LOCAL_ADMIN` |
| scope_jurisdiction_unit_id | ref → JurisdictionUnit, nullable | null only for `SUPER_ADMIN` |

**Validation**: every role except `SUPER_ADMIN` requires a `scope_jurisdiction_unit_id`.
The `ScopedToJurisdictionGuard` (research.md §4) checks every request's target
record against this scope's `path`. A null `scope_jurisdiction_unit_id`
(`SUPER_ADMIN` only) matches every path, which is what lets Super Admin create a
bearer directly at any level in one action (FR-017) without a District/local
admin acting first.

## AuditLogEntry

Satisfies FR-014.

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| actor_bearer_id | ref → Bearer | who performed the action |
| action | enum | `ASSIGNMENT_CREATED, ASSIGNMENT_CLOSED, POST_CHANGED, JURISDICTION_CHANGED, BEARER_STATUS_CHANGED` |
| target_type, target_id | string, uuid | polymorphic reference |
| metadata | json | e.g. previous/new values |
| created_at | timestamp | |

## Entity Relationships

```text
Post 1───* Assignment *───1 Bearer
JurisdictionUnit 1───* AssignmentJurisdiction *───1 Assignment
JurisdictionUnit 1───* JurisdictionUnit (parent_id, self-referencing, per tree)
Bearer 1───1 AdminScope (optional — only bearers who are also admins)
```
