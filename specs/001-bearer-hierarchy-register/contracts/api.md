# API Contract: Bearer & Hierarchy Register

REST, JSON. All routes except `/auth/*` require a bearer JWT and pass through
`ScopedToJurisdictionGuard` (research.md §4). "Scope" below states the minimum
`AdminScope.role` required.

## Auth

| Method | Path | Body | Response | Scope |
|---|---|---|---|---|
| POST | `/auth/otp/request` | `{ phone }` | `202` regardless of whether `phone` matches a Bearer, to avoid leaking which numbers are registered | none |
| POST | `/auth/otp/verify` | `{ phone, code }` | `{ accessToken, refreshToken }`, or `404 BEARER_NOT_FOUND` if no `ACTIVE` Bearer matches `phone` (FR-016) | none |
| POST | `/auth/refresh` | `{ refreshToken }` | `{ accessToken }` | authenticated |

There is no `POST /auth/signup` or equivalent — this API has no bearer-facing
account-creation route at all (FR-015). Accounts only come into existence via
`POST /bearers` below, which is admin-only.

## Posts

| Method | Path | Body | Response | Scope |
|---|---|---|---|---|
| GET | `/posts` | — | `Post[]` | any authenticated admin |
| POST | `/posts` | `{ name, applicable_levels, jurisdiction_type_rule?, capabilities? }` | `Post` | SUPER_ADMIN (FR-001, FR-011, FR-018) |
| PATCH | `/posts/:id` | partial `Post` (incl. `capabilities`) | `Post` | SUPER_ADMIN |

## Jurisdictions

| Method | Path | Body | Response | Scope |
|---|---|---|---|---|
| GET | `/jurisdictions?tree=&parent=` | — | `JurisdictionUnit[]` | any authenticated admin, filtered to caller's subtree unless SUPER_ADMIN |
| POST | `/jurisdictions` | `{ tree, type, name, parent_id }` | `JurisdictionUnit` | SUPER_ADMIN (FR-003, FR-011) |
| PATCH | `/jurisdictions/:id` | `{ name?, parent_id?, status? }` | `JurisdictionUnit` | SUPER_ADMIN |

## Bearers

| Method | Path | Body | Response | Scope |
|---|---|---|---|---|
| GET | `/bearers?query=&post_id=&jurisdiction_id=` | — | `Bearer[]` (search, FR-009) | any authenticated admin, results scoped to caller's subtree (FR-010) |
| GET | `/bearers/:id` | — | `Bearer & { assignments: Assignment[] }` (current + closed, Story 2 scenario 2) | scoped |
| POST | `/bearers` | `{ full_name, phone, address, membership_no, id_proof_ref, photo_url? }` | `Bearer` | scoped admin, target jurisdiction validated against caller's scope (FR-004, FR-015); SUPER_ADMIN's null scope matches any jurisdiction so they can create at State, District, Block, Municipality, Town Panchayat, or constituency level directly (FR-017) |
| PATCH | `/bearers/:id` | partial, incl. `status` | `Bearer` | scoped admin |

## Assignments

| Method | Path | Body | Response | Scope |
|---|---|---|---|---|
| POST | `/assignments` | `{ bearer_id, post_id, jurisdiction_unit_ids[], start_date }` | `Assignment` | scoped admin; rejected if any `jurisdiction_unit_id` falls outside caller's subtree (FR-005, edge case 1) |
| POST | `/assignments/:id/close` | `{ end_date }` | `Assignment` (status `CLOSED`) | scoped admin (FR-007) |
| GET | `/bearers/:id/assignments` | — | `Assignment[]` | scoped |

## Reports

| Method | Path | Body | Response | Scope |
|---|---|---|---|---|
| GET | `/reports/coverage?post_id=` | — | `{ unfilled: JurisdictionUnit[], overlapping: { unit: JurisdictionUnit, bearers: Bearer[] }[] }` (FR-012, FR-013) | any authenticated admin, scoped to caller's subtree |

## Error shape (all endpoints)

```json
{ "statusCode": 403, "error": "OUT_OF_SCOPE", "message": "Target jurisdiction is outside your assigned scope" }
```

`OUT_OF_SCOPE` (403) is the response the `ScopedToJurisdictionGuard` returns for
every request whose target falls outside the caller's `AdminScope` subtree —
this is the single enforcement point for Constitution Principle V and spec edge
case "admin tries to assign outside their own scope."
