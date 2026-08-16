# API Contract: Contribution & Events

REST, JSON. All routes except `/webhooks/razorpay` require a bearer JWT (feature
001's auth) and pass through `ScopedToJurisdictionGuard`, extended per
data-model.md's Access resolution rule.

## Events

| Method | Path | Body | Response | Scope |
|---|---|---|---|---|
| GET | `/events` | — | `Event[]` filtered to those applicable to the caller's post/jurisdiction (FR-003) | any authenticated bearer |
| POST | `/events` | `{ title, purpose, banner_url?, target_amount?, suggested_amount_by_post?, jurisdiction_scope_ids[], open_date, close_date }` | `Event` | SUPER_ADMIN only (FR-001) |
| POST | `/events/:id/close` | — | `Event` (`status: CLOSED`) | SUPER_ADMIN only (FR-002) |

## Payments

| Method | Path | Body | Response | Scope |
|---|---|---|---|---|
| POST | `/events/:id/pay` | — | `{ contribution_id, gateway_order_id, gatewayCheckoutPayload }` — creates a `PENDING` Contribution + Razorpay Order (research.md §1) | authenticated bearer; rejected `409 EVENT_CLOSED` if past `close_date` (FR-007) |
| POST | `/webhooks/razorpay` | Razorpay webhook payload (signature-verified) | `200` | none (signature-verified instead, per Razorpay's model) — this is the **only** route that can move a Contribution to `VERIFIED` or `FAILED` (FR-005) |
| GET | `/contributions/me` | — | `Contribution[]` for the caller | authenticated bearer |

## Reports

| Method | Path | Body | Response | Scope |
|---|---|---|---|---|
| GET | `/events/:id/dashboard` | — | `{ raised, target, byPost: [...], paid: Bearer[], unpaid: Bearer[] }` computed live (FR-009, FR-010) | SUPER_ADMIN (all), scoped admin (own subtree), or a bearer with an active `FINANCE_VIEW` post (own assignment's subtree) — per data-model.md Access resolution |
| GET | `/events/:id/dashboard/export` | — | CSV | same as above (FR-013) |

## Error shapes

```json
{ "statusCode": 409, "error": "EVENT_CLOSED", "message": "This event is no longer accepting payments" }
{ "statusCode": 403, "error": "OUT_OF_SCOPE", "message": "Target jurisdiction is outside your assigned scope" }
{ "statusCode": 403, "error": "NOT_SUPER_ADMIN", "message": "Only Super Admin can create or close events" }
```

`OUT_OF_SCOPE` reuses feature 001's single enforcement point (its
`ScopedToJurisdictionGuard`), now also satisfied by a `FINANCE_VIEW` capability
grant instead of only an `AdminScope` row.
