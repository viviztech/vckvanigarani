# Phase 1 Data Model: Contribution & Events

Derived from the Key Entities in [spec.md](./spec.md) and the decisions in
[research.md](./research.md). Reuses `Bearer`, `Post`, `JurisdictionUnit`,
`Assignment`, and `AdminScope` from feature 001's data-model.md unchanged.

## Event

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| title | string | |
| purpose | text | |
| banner_url | string, nullable | |
| target_amount | decimal, nullable | advisory only per spec.md Assumptions |
| suggested_amount_by_post | json, nullable | `{ post_id: amount }`, advisory only |
| jurisdiction_scope_ids | uuid[] | one or more `JurisdictionUnit.id` from feature 001 (statewide = the root `STATE` node) |
| open_date, close_date | timestamp | |
| status | enum | `OPEN, CLOSED` |
| created_by, closed_by | ref → Bearer, nullable | audit trail (FR-015) |
| created_at | timestamp | |

**Validation**: `close_date > open_date`. `status` transitions to `CLOSED` only
via the close action (FR-002), which also stamps `closed_by`. Only a `SUPER_ADMIN`
(feature 001 `AdminScope.role`) may create or transition this entity (FR-001,
FR-002, Constitution Principle III).

**State transitions**: `OPEN` → `CLOSED` (terminal; no reopening — a mistakenly
closed event is a new `Event`, keeping the audit trail honest per Principle III).

## Contribution

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| event_id | ref → Event | |
| bearer_id | ref → Bearer | |
| amount | decimal | |
| gateway_order_id | string, unique | Razorpay Order id (research.md §2) |
| gateway_payment_id | string, nullable | populated once captured |
| idempotency_key | uuid, unique | generated server-side at Order creation (research.md §2) |
| status | enum | `PENDING, VERIFIED, FAILED` |
| receipt_url | string, nullable | populated once `VERIFIED` (research.md §7) |
| verified_at | timestamp, nullable | |
| created_at | timestamp | |

**Validation**: `status` only transitions to `VERIFIED` from a verified webhook
payload or the reconciliation job (research.md §1, §3) — never from a request
whose only evidence is the mobile client's own report (FR-005, Principle III).
A bearer may have any number of `VERIFIED` Contributions against the same
`Event` (FR-014); each is a distinct row from a distinct Order.

**State transitions**: `PENDING` → `VERIFIED` (webhook/reconciliation confirms
capture) or `PENDING` → `FAILED` (gateway reports failure/expiry). Terminal once
`VERIFIED` or `FAILED` — a failed attempt is retried as a brand-new
`Contribution`/Order, not by mutating the failed row.

## Entity Relationships

```text
Event 1───* Contribution *───1 Bearer
Event *───* JurisdictionUnit   (via jurisdiction_scope_ids, feature 001's trees — read-only reference, no new tree)
```

## Access resolution (extends feature 001's AdminScope)

Not a new entity — a rule for how `ScopedToJurisdictionGuard` (feature 001,
extended per research.md §5) resolves a caller's scope for this feature's
routes:

1. If the caller has an `AdminScope` row: use its `role`/`scope_jurisdiction_unit_id`
   as feature 001 already defines.
2. Else, if the caller has an `ACTIVE` `Assignment` (feature 001) to a `Post`
   whose `capabilities` includes `FINANCE_VIEW`: use that assignment's
   jurisdiction as the scope, granting dashboard read access only (never event
   create/close, which stays Super-Admin-only regardless of capability).
3. Else: no access to any `/events` reporting route beyond the bearer's own
   `Contribution` history.
