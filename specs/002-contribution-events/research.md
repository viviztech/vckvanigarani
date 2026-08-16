# Phase 0 Research: Contribution & Events

No `NEEDS CLARIFICATION` markers remained in the Technical Context. This
research resolves the implementation-pattern decisions within the
constitution-fixed stack (Razorpay, PostgreSQL, NestJS/React/Flutter).

## 1. Payment flow shape

- **Decision**: Razorpay Orders API. The backend creates an `Order` when a
  bearer taps Pay, the mobile client completes checkout against that order, and
  a `Contribution` is only written to the database when Razorpay's webhook
  confirms `payment.captured` for that order — never from the checkout SDK's
  client-side success callback.
- **Rationale**: Directly satisfies FR-005 and Constitution Principle III — the
  client-side callback can fire even if the server-side capture later fails or
  is spoofed by a modified client, so it cannot be the write trigger.
- **Alternatives considered**: Trusting the client SDK's success callback
  directly — rejected outright, it is exactly what Principle III prohibits.
  Razorpay Payment Links instead of Orders — simpler integration but weaker
  per-attempt correlation to a specific bearer+event, making idempotency (below)
  harder to enforce cleanly.

## 2. Idempotency

- **Decision**: The backend generates the idempotency key (a UUID) when it
  creates the Razorpay `Order`, and stores it on the `Contribution` row before
  any payment happens. The webhook handler upserts by `(gateway_order_id)` —
  a second webhook delivery for the same order (Razorpay retries webhooks) or a
  client retry against the same order updates the same row instead of inserting
  a new one.
- **Rationale**: Satisfies FR-006 and the edge case "retried request must not
  double-charge," while still allowing FR-014 (multiple genuine contributions
  per bearer per event) — each new Pay tap creates a *new* Order and therefore a
  new idempotency key, so deliberate repeat contributions are unaffected.
- **Alternatives considered**: Client-generated idempotency key — rejected,
  since a malicious or buggy client could reuse or omit it; the server must be
  the source of truth for its own consistency guarantee.

## 3. Reconciliation for missed webhooks

- **Decision**: A scheduled job (every few minutes) queries Razorpay for the
  status of any `Order` still `PENDING` in the local database after a short
  grace period, and reconciles it the same way the webhook handler would.
- **Rationale**: Satisfies the edge case "webhook never arrives after a
  successful payment" — webhooks are best-effort delivery, not guaranteed.
- **Alternatives considered**: Relying on the webhook alone — rejected, this is
  the exact gap the edge case identifies. A user-triggered "refresh my payment
  status" button — kept as a nice-to-have UI affordance in `tasks.md`, but not a
  substitute for the automatic job, since a bearer who closes the app should
  still get correctly reconciled.

## 4. Dashboard aggregation

- **Decision**: Dashboard totals are plain aggregate SQL queries
  (`SUM`/`COUNT ... GROUP BY`) run at request time against the `Contribution`
  table, filtered by the caller's scope (feature 001's guard) or by
  jurisdiction, for whichever event is selected.
- **Rationale**: Satisfies FR-010 (no stored, hand-editable total) directly; at
  the scale in scope (single-digit thousands of contributions per event, not
  millions), a live aggregate query comfortably meets the 10-second SC-003
  target without needing a materialized view or cache layer.
- **Alternatives considered**: A periodically refreshed materialized view —
  rejected as premature; revisit only if a single event's contribution volume
  grows large enough that live aggregation misses SC-003.

## 5. Finance-visibility access check

- **Decision**: Extend feature 001's `ScopedToJurisdictionGuard` with a second
  pass: if the caller has no `AdminScope` role but has an `ACTIVE` `Assignment`
  to a `Post` whose `capabilities` includes `FINANCE_VIEW`, the guard resolves
  their scope from that assignment's jurisdiction instead of an `AdminScope`
  row, and applies the same subtree check.
- **Rationale**: Satisfies FR-011 and Story 2 scenario 3 without duplicating the
  scope-check logic feature 001 already built — one guard, two ways to arrive at
  a scope.
- **Alternatives considered**: A separate guard just for capability-based access
  — rejected as a second enforcement point that could drift from the first,
  which is exactly the kind of risk Principle V's "single enforcement point"
  reasoning (feature 001 research.md §4) was written to avoid.

## 6. Reminder scheduling

- **Decision**: A single scheduled job (`@nestjs/schedule` cron) runs daily,
  finds events within a configurable window of their close date, and queues a
  push + SMS/WhatsApp send to every bearer in scope with zero verified
  contributions on that event.
- **Rationale**: Meets FR-012 and SC-004 at the scale in scope without the
  operational overhead of a dedicated queue/worker system; revisit only if event
  volume or send-time precision requirements grow materially.
- **Alternatives considered**: A dedicated job queue (BullMQ) — deferred; noted
  in plan.md's Primary Dependencies as the upgrade path if reminder volume
  grows, but not justified for the reminder cadence in spec.md's Assumptions.

## 7. Receipts

- **Decision**: A receipt is a server-rendered PDF generated at verification
  time, stored in object storage, and linked from the `Contribution` row; the
  in-app and SMS/WhatsApp receipt messages link to it rather than attaching it
  inline.
- **Rationale**: Keeps SMS/WhatsApp payloads small and avoids regenerating the
  PDF on every view.
- **Alternatives considered**: Generating the receipt on demand at view time —
  rejected, since it would need to reconstruct historical event/amount details
  correctly forever; storing the rendered artifact is simpler and matches how
  the audit trail (Principle III) should work — an immutable record of what was
  actually issued.
