# Implementation Plan: Contribution & Events

**Branch**: `002-contribution-events` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-contribution-events/spec.md`

## Summary

Let Super Admin open a fundraising event and let every bearer in its territory
pay into it, with every rupee traceable to a verified payment-gateway
transaction. Technical approach: extend the existing NestJS/PostgreSQL backend
from feature 001 with Event and Contribution modules, a Razorpay integration
that only records a Contribution from a verified webhook (never client-reported
success), a scheduled reminder job, and a collection dashboard whose access is
driven by feature 001's `AdminScope` guard plus its Post `capabilities` grant
(`FINANCE_VIEW`) — this is the feature that actually exercises that grant.

## Technical Context

**Language/Version**: TypeScript 5.x (backend + admin-web, Node.js 20 LTS), Dart 3.x / Flutter 3.x (mobile) — same three projects as feature 001, extended with new modules

**Primary Dependencies**: `razorpay` Node SDK + webhook signature verification (backend); Razorpay Checkout (mobile, via WebView or native SDK); `@nestjs/schedule` (or BullMQ if reminder volume grows) for the reminder job; existing Prisma/NestJS/React/Flutter stack from feature 001

**Storage**: PostgreSQL — adds `Event` and `Contribution` tables alongside feature 001's schema; no changes to feature 001's tables required

**Testing**: Jest + Supertest, including a mandatory reconciliation test against a mocked Razorpay webhook (Constitution "Development Workflow & Quality Gates" — any money-touching feature requires this before merge); Vitest + React Testing Library (admin-web); `flutter_test` (mobile)

**Target Platform**: same as feature 001 — Linux server (API), evergreen browsers (admin-web), Android 8+ / iOS 14+ (mobile)

**Project Type**: Extension of the existing three-part web service + admin web app + mobile app from feature 001 (no new top-level project)

**Performance Goals**: payment completion in under 2 minutes end-to-end (SC-001); dashboard reflects a verified payment within 10 seconds (SC-003)

**Constraints**: A `Contribution` row MUST only ever be created from a verified gateway webhook or a reconciled status check, never from the mobile client's own "payment succeeded" screen (Constitution Principle III); every payment attempt MUST carry an idempotency key; only Super Admin may create or close an `Event` (Principle III, FR-001/FR-002); dashboard totals MUST be computed from the ledger at query time, never a stored editable total (FR-010)

**Scale/Scope**: Same statewide bearer population as feature 001; multiple events may be open concurrently. In scope: event CRUD (Super Admin only), payment initiation + webhook verification + reconciliation job, automatic receipts, collection dashboard (admin-scoped and capability-scoped), reminder scheduler, CSV export. Out of scope per spec.md Assumptions: refunds/cancellations, installment plans.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Configuration Over Hard-Coding | Dashboard/finance-visibility access keys off feature 001's `Post.capabilities` (`FINANCE_VIEW`) grant, not a hardcoded "Finance Secretary" title check (FR-011) | PASS |
| II. Dual-Hierarchy Integrity | An `Event`'s applicable jurisdiction scope reuses feature 001's existing `JurisdictionUnit` trees as references — no new hierarchy, no merging of the administrative and electoral trees | PASS |
| III. Financial Integrity & Auditability | This is the principle this feature exists to satisfy: `Contribution` created only from a verified gateway webhook/reconciliation (FR-005), idempotency key per attempt (FR-006), only Super Admin creates/closes events (FR-001, FR-002), dashboard totals computed live from the ledger (FR-010) | PASS |
| IV. Privacy by Minimum Collection | Only the gateway transaction id, amount, and a receipt reference are stored; no card/UPI/bank credentials touch this system at all — they stay inside Razorpay's vault | PASS |
| V. Access Scoped to Jurisdiction | Dashboard and event-list endpoints reuse feature 001's `ScopedToJurisdictionGuard`; extended so a non-admin bearer holding a `FINANCE_VIEW`-granting post also passes the guard, scoped to their own assignment's jurisdiction (FR-011) | PASS |
| Platform constraints | Razorpay (constitution-fixed), FCM + SMS/WhatsApp for receipts and reminders (constitution-fixed) | PASS |
| Workflow gate: money-touching reconciliation test | `tasks.md` includes a mocked-webhook reconciliation test task before the payment flow is considered done | PASS (see tasks.md T0xx) |

No violations requiring justification — Complexity Tracking table is empty.

**Post-Phase 1 re-check**: `data-model.md`'s `Contribution.idempotency_key` and
`gateway_transaction_id` fields, and `contracts/api.md`'s webhook-only write path,
implement Principle III exactly as gated above. No principle status changes after
design.

## Project Structure

### Documentation (this feature)

```text
specs/002-contribution-events/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

This feature extends the same three projects feature 001 created — no new
top-level directories.

```text
backend/
├── src/
│   ├── modules/
│   │   ├── events/            # Event CRUD (Super Admin only)
│   │   ├── contributions/     # Payment initiation, webhook handler, reconciliation job
│   │   ├── reports/           # Collection dashboard queries (event totals, paid/unpaid)
│   │   └── reminders/         # Scheduled unpaid-bearer reminder job
│   └── common/
│       └── guards/            # ScopedToJurisdictionGuard (feature 001) extended for capability-based access
└── tests/
    ├── contract/
    ├── integration/
    │   └── webhook-reconciliation.spec.ts   # mandatory per Constitution money-touching gate
    └── unit/

admin-web/
├── src/
│   ├── pages/
│   │   ├── events/             # Event creation/close (Super Admin)
│   │   └── dashboard/          # Collection dashboard (admin- and capability-scoped)
│   └── services/
└── tests/

mobile/
├── lib/
│   └── features/
│       ├── events/             # Events list + Pay flow (Story 1)
│       └── finance/            # Read-only collection view for FINANCE_VIEW-capable bearers (Story 2)
└── test/
```

**Structure Decision**: No new top-level project — `events`, `contributions`,
`reports`, and `reminders` are new backend modules alongside feature 001's
`posts`/`jurisdictions`/`bearers`/`assignments`, reusing its guard and auth
layers. admin-web gets two new page groups; mobile gets the bearer-facing pay
flow plus a lightweight finance view for capability-holding bearers who are not
admins.

## Complexity Tracking

No Constitution Check violations — table intentionally empty.
