# Quickstart: Contribution & Events

Validates the feature end-to-end against the acceptance scenarios in
[spec.md](./spec.md), using [data-model.md](./data-model.md) and
[contracts/api.md](./contracts/api.md). Assumes feature 001 is already seeded
(a bearer, a District, and — for Story 2 scenario 3 — a Post with
`capabilities: ["FINANCE_VIEW"]` and an active Assignment to it).

## Prerequisites

- Backend running with a Razorpay test-mode key pair and webhook secret
  configured.
- A Razorpay CLI or test utility able to simulate a `payment.captured` webhook
  event for a given Order id.
- One `SUPER_ADMIN` `AdminScope` row to authenticate as for setup steps.

## Validation walkthrough

1. **Story 1, scenario 1 — event visibility**
   - `POST /events` as SUPER_ADMIN with a District-scoped `jurisdiction_scope_ids`.
   - `GET /events` as a bearer inside that district → the event appears; as a
     bearer outside it → the event does not appear.

2. **Story 1, scenario 2 — verified-webhook-only Contribution**
   - `POST /events/:id/pay` as the in-district bearer → `201` with a `PENDING`
     Contribution and a `gateway_order_id`.
   - `GET /contributions/me` → the Contribution is `PENDING`, not `VERIFIED` —
     confirms the client-side call alone never verifies it (FR-005).
   - Simulate a `payment.captured` webhook for that `gateway_order_id` →
     `POST /webhooks/razorpay` → `200`.
   - `GET /contributions/me` → now `VERIFIED`, with a `receipt_url` populated.

3. **Story 1, scenario 3 — event creation/close is Super-Admin-only**
   - `POST /events` and `POST /events/:id/close` as a District Admin → both
     `403 NOT_SUPER_ADMIN`.

4. **Story 1, scenario 4 — closed event rejects payment**
   - `POST /events/:id/close` as SUPER_ADMIN.
   - `POST /events/:id/pay` as a bearer → `409 EVENT_CLOSED`; `GET /events/:id`
     still returns the event with its final total.

5. **Story 1, scenario 5 — idempotent retry**
   - Repeat the same `POST /events/:id/pay` → `POST /webhooks/razorpay`
     sequence for the same Order id twice (simulating a retried webhook
     delivery) → only one `VERIFIED` Contribution row exists for that Order
     (FR-006).

6. **Story 2 — dashboard, scope, and the Finance Secretary capability**
   - `GET /events/:id/dashboard` as SUPER_ADMIN → totals match the verified
     Contributions from steps above.
   - Same call as a District Admin scoped to a different district → the
     in-scope bearer's contribution does not appear.
   - Authenticate as the bearer holding the seeded `FINANCE_VIEW` post (not an
     admin) → `GET /events/:id/dashboard` succeeds, scoped to their own
     assignment's jurisdiction (FR-011).
   - `GET /events/:id/dashboard/export` as SUPER_ADMIN → CSV matches the
     on-screen dashboard.

7. **Story 3 — reminders**
   - Create a second bearer in scope who has not paid; advance the system clock
     (or trigger the reminder job manually) close to the event's `close_date` →
     confirm a reminder send is queued for the unpaid bearer and not for the one
     who paid in step 2.

## Expected outcome

All seven steps pass without manual data cleanup between them, confirming
FR-001 through FR-015 and SC-001 through SC-005 are met, and specifically that
no `Contribution` ever reaches `VERIFIED` without step 2's simulated webhook —
the single most important guarantee in this feature per Constitution
Principle III.
