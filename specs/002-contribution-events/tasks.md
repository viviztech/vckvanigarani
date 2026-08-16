---
description: "Task list template for feature implementation"
---

# Tasks: Contribution & Events

**Input**: Design documents from `/specs/002-contribution-events/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md. Assumes feature 001's `backend`/`admin-web`/`mobile` projects, auth, and `ScopedToJurisdictionGuard` already exist.

**Tests**: Not explicitly requested in spec.md beyond the Constitution's mandatory
money-touching gate, so only that one dedicated test task (`T029`) is generated;
`T032` runs `quickstart.md` as the broader end-to-end validation gate.

**Organization**: Tasks are grouped by user story (spec.md priorities P1–P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3, per spec.md
- File paths extend feature 001's structure — no new top-level directories

---

## Phase 1: Setup

- [x] T001 [P] Add the Razorpay Node SDK and webhook-secret config to `backend/.env.example` and `backend/` dependencies
- [x] T002 [P] Add `@nestjs/schedule` to `backend/` for the reminder and reconciliation jobs (research.md §3, §6)
- [x] T003 [P] Add a PDF generation dependency to `backend/` for receipts (research.md §7)
- [x] T004 Document the local Razorpay test-mode account and webhook endpoint setup in `backend/README.md`

**Checkpoint**: Dependencies and local test-mode gateway ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Extend the Prisma schema with `Event` and `Contribution` models in `backend/prisma/schema.prisma` per data-model.md
- [x] T006 Write the Prisma migration for the new tables in `backend/prisma/migrations/`
- [x] T007 Implement Razorpay webhook signature verification in `backend/src/modules/contributions/webhook-signature.guard.ts`
- [x] T008 [P] Implement a shared notification-send helper (push via FCM + SMS/WhatsApp) in `backend/src/common/notifications/notification.service.ts`, reused by receipts (US1) and reminders (US3)
- [x] T009 [P] Implement the PDF receipt generator in `backend/src/modules/contributions/receipt.service.ts` per research.md §7
- [x] T010 Extend feature 001's `ScopedToJurisdictionGuard` (`backend/src/common/guards/scoped-to-jurisdiction.guard.ts`) to resolve scope from an active `FINANCE_VIEW`-capability Assignment when the caller has no `AdminScope` row, per data-model.md's Access resolution rule and research.md §5
- [x] T011 Wire the new `events`, `contributions`, `reports`, and `reminders` modules into `backend/src/app.module.ts`

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Super Admin opens an event, a bearer pays into it (Priority: P1) 🎯 MVP

**Goal**: Super Admin creates an event; bearers in scope see it and pay; a
Contribution is recorded only from a verified gateway confirmation, with a
receipt issued automatically.

**Independent Test**: quickstart.md steps 1–5 — create an event, pay, confirm
the Contribution stays `PENDING` until a simulated webhook verifies it,
confirm Super-Admin-only create/close, confirm closed-event rejection, confirm
a retried webhook doesn't double-record.

### Implementation for User Story 1

- [x] T012 [P] [US1] Implement Event create/close (`SUPER_ADMIN` only) in `backend/src/modules/events/events.controller.ts` and `events.service.ts` per FR-001, FR-002
- [x] T013 [P] [US1] Implement `GET /events` filtered to the caller's post/jurisdiction in `backend/src/modules/events/events.service.ts` per FR-003
- [x] T014 [US1] Implement `POST /events/:id/pay` — create a Razorpay Order and a `PENDING` Contribution with a server-generated idempotency key — in `backend/src/modules/contributions/contributions.service.ts` per FR-004, FR-006, research.md §1–2 (depends on T005, T012)
- [x] T015 [US1] Reject payment attempts on a closed event with `409 EVENT_CLOSED` in `backend/src/modules/contributions/contributions.controller.ts` per FR-007 (depends on T014)
- [x] T016 [US1] Implement `POST /webhooks/razorpay`, verifying the signature and transitioning the matching Contribution to `VERIFIED`/`FAILED` in `backend/src/modules/contributions/webhook.controller.ts` per FR-005, research.md §1–2 (depends on T007, T014)
- [x] T017 [US1] Implement the reconciliation job for Orders still `PENDING` past a grace period in `backend/src/modules/contributions/reconciliation.job.ts` per research.md §3 (depends on T016)
- [x] T018 [US1] Wire receipt generation and delivery into the verified-webhook path in `backend/src/modules/contributions/contributions.service.ts` per FR-008 (depends on T008, T009, T016)
- [x] T019 [US1] Implement `GET /contributions/me` in `backend/src/modules/contributions/contributions.controller.ts`
- [x] T020 [P] [US1] Build the admin-web event create/close page in `admin-web/src/pages/events/EventForm.tsx` (depends on T012)
- [x] T021 [P] [US1] Build the mobile events list and Pay flow (Razorpay Checkout) in `mobile/lib/features/events/` (depends on T013, T014)

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Admins and Finance Secretaries see the collection picture (Priority: P2)

**Goal**: A live, correctly scoped collection dashboard — Super Admin sees
everything, scoped admins see their subtree, and a bearer holding a
`FINANCE_VIEW`-granting post sees their own jurisdiction's figures without
needing admin credentials.

**Independent Test**: quickstart.md step 6 — verify dashboard totals against
known Contributions, verify District Admin scoping, verify Finance Secretary
capability-based access, verify CSV export matches on-screen figures.

### Implementation for User Story 2

- [x] T022 [US2] Implement `GET /events/:id/dashboard` as a live aggregate query (raised, target, by-post breakdown, paid/unpaid lists) in `backend/src/modules/reports/dashboard.service.ts` per FR-009, FR-010, research.md §4 (depends on T016)
- [x] T023 [US2] Apply the extended `ScopedToJurisdictionGuard` (T010) to the dashboard route per FR-011 (depends on T010, T022)
- [x] T024 [US2] Implement `GET /events/:id/dashboard/export` (CSV) in `backend/src/modules/reports/dashboard.controller.ts` per FR-013 (depends on T022)
- [x] T025 [P] [US2] Build the admin-web collection dashboard page in `admin-web/src/pages/dashboard/EventDashboard.tsx` (depends on T022)
- [x] T026 [P] [US2] Build the mobile read-only finance view for `FINANCE_VIEW`-capable bearers in `mobile/lib/features/finance/` (depends on T022, T023)

**Checkpoint**: User Stories 1 and 2 both functional independently.

---

## Phase 5: User Story 3 - Unpaid bearers get reminded before an event closes (Priority: P3)

**Goal**: Bearers with no verified Contribution on an event nearing its close
date get an automatic push + SMS/WhatsApp reminder.

**Independent Test**: quickstart.md step 7 — leave one bearer unpaid near an
event's close date, confirm they're reminded and a bearer who already paid is
excluded from that same run.

### Implementation for User Story 3

- [x] T027 [US3] Implement the daily reminder job (finds events near `close_date`, queues sends to unpaid in-scope bearers) in `backend/src/modules/reminders/reminder.job.ts` per FR-012, research.md §6 (depends on T008, T022)
- [x] T028 [US3] Query paid status at send time, not schedule time, so a bearer who pays moments before the job runs is excluded from that send in `backend/src/modules/reminders/reminder.job.ts` (depends on T027)

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T029 Write the mandatory reconciliation test against a mocked Razorpay webhook in `backend/tests/integration/webhook-reconciliation.spec.ts`, satisfying the Constitution's money-touching workflow gate
- [x] T030 [P] Add rate limiting and replay protection to `POST /webhooks/razorpay` in `backend/src/modules/contributions/`
- [x] T031 [P] Add a manual "refresh my payment status" affordance in `mobile/lib/features/events/` as a UX backstop alongside the automatic reconciliation job (research.md §3)
- [x] T032 Run the full `quickstart.md` walkthrough end-to-end against the seeded environment and record results
- [x] T033 [P] Document the Razorpay test-mode setup in `backend/README.md`, `admin-web/README.md`, and `mobile/README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup; blocks every user story.
- **User Story 1 (Phase 3)**: depends on Foundational only.
- **User Story 2 (Phase 4)**: depends on Foundational and on Contribution
  verification existing (T016 from US1) — the dashboard has nothing to
  aggregate otherwise.
- **User Story 3 (Phase 5)**: depends on Foundational and on the dashboard's
  paid/unpaid query (T022 from US2).
- **Polish (Phase 6)**: depends on whichever stories are in scope for release.

### Parallel Opportunities

- T001–T003 (Setup) run in parallel.
- T008, T009 (Foundational) run in parallel — separate services.
- T012, T013 (US1 backend) run in parallel; T020, T021 (US1 UI) run in parallel.
- T025, T026 (US2 UI) run in parallel.
- T030, T031, T033 (Polish) run in parallel.

---

## Parallel Example: User Story 1

```text
# After Foundational (Phase 2) completes, launch together:
Task: "Implement Event create/close in backend/src/modules/events/"
Task: "Implement GET /events filtered to caller's scope in backend/src/modules/events/"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1).
2. **Stop and validate** with quickstart.md steps 1–5 — this alone is a working
   pay-into-an-event loop with verified, receipted contributions.

### Incremental Delivery

1. Setup + Foundational → foundation ready (reuses feature 001's guard/auth).
2. US1 → validate → MVP: bearers can pay, contributions are gateway-verified.
3. US2 → validate → collection visibility, including the Finance Secretary
   capability path this feature was largely built to support.
4. US3 → validate → automatic reminders close the loop on collection completeness.
5. Polish → the mandatory reconciliation test (T029) and hardening, then this
   feature is ready alongside feature 003 (News) for a combined release.

---

## Task Summary

- **Total tasks**: 33 (T001–T033)
- **Setup**: 4 (T001–T004)
- **Foundational**: 7 (T005–T011)
- **User Story 1 (P1)**: 10 (T012–T021)
- **User Story 2 (P2)**: 5 (T022–T026)
- **User Story 3 (P3)**: 2 (T027–T028)
- **Polish**: 5 (T029–T033)
- **Suggested MVP scope**: Setup + Foundational + User Story 1 (21 tasks)
