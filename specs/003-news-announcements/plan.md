# Implementation Plan: News & Announcements

**Branch**: `003-news-announcements` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-news-announcements/spec.md`

## Summary

Let Super Admin write, target, and publish news posts that reach the right
bearers' feeds and phones, and let bearers share them outward. Technical
approach: a `NewsPost` module in the existing NestJS/PostgreSQL backend, feed
queries evaluated live against a bearer's current jurisdiction (feature 001),
notification delivery reused from feature 002's shared notification service and
run as a batched job rather than inline with the publish request, and a native
share sheet on mobile.

## Technical Context

**Language/Version**: TypeScript 5.x (backend + admin-web, Node.js 20 LTS), Dart 3.x / Flutter 3.x (mobile) — same three projects as features 001–002

**Primary Dependencies**: Existing NestJS/Prisma/React/Flutter stack; `@nestjs/schedule`/queue infrastructure already added in feature 002 for the batched-notification job (research.md §1); a rich-text editor component for admin-web (e.g. Tiptap); Flutter's native `share_plus` plugin for Story 2

**Storage**: PostgreSQL — adds a `NewsPost` table and a `NewsPostJurisdiction` bridge table; no changes to existing tables

**Testing**: Jest + Supertest (backend), Vitest + React Testing Library (admin-web), `flutter_test` (mobile) — no money is touched, so the Constitution's mandatory-reconciliation-test gate does not apply here

**Target Platform**: same as features 001–002 — Linux server (API), evergreen browsers (admin-web), Android 8+ / iOS 14+ (mobile)

**Project Type**: Extension of the existing three-part web service + admin web app + mobile app

**Performance Goals**: published post visible in-feed and notified within 60 seconds (SC-001); compose-to-publish under 3 minutes (SC-003)

**Constraints**: Feed visibility MUST be computed against each bearer's *current* assignment at view time, never a snapshot taken at publish (FR-006); notification sends MUST be batched/queued, not synchronous with the publish request, so a statewide "everyone" post doesn't block the API (FR-010); only Super Admin may author/publish/unpublish (FR-001)

**Scale/Scope**: Same statewide bearer population as features 001–002; a single "everyone" publish may need to notify tens of thousands of bearers. In scope: post compose/draft/publish/edit/unpublish, jurisdiction-scoped targeting, in-app feed, push notification, external share. Out of scope per spec.md Assumptions: comments/likes, video attachments, non-Super-Admin authorship.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Configuration Over Hard-Coding | Targeting reuses feature 001's `JurisdictionUnit` trees as data references; no jurisdiction logic is duplicated or hardcoded here | PASS |
| II. Dual-Hierarchy Integrity | `NewsPost` targets reference existing `JurisdictionUnit` rows from either tree without creating a new hierarchy or merging the two | PASS |
| III. Financial Integrity & Auditability | Not applicable — this feature moves no money | N/A for this feature |
| IV. Privacy by Minimum Collection | No new personal data collected; posts are organizational content, not bearer data | PASS |
| V. Access Scoped to Jurisdiction | Authoring is Super-Admin-only (FR-001), enforced by the existing `AdminScope` check; feed *reads* are intentionally scoped the opposite way — a bearer sees only posts targeting their own current jurisdiction (FR-006), which is the same guard pattern applied to a read instead of a write | PASS |
| Platform constraints | FCM push + SMS/WhatsApp reuse feature 002's notification service (constitution-fixed) | PASS |

No violations requiring justification — Complexity Tracking table is empty.

**Post-Phase 1 re-check**: `data-model.md`'s `NewsPost` state machine
(`DRAFT`→`PUBLISHED`→optionally unpublished) and the live feed query in
`contracts/api.md` confirm FR-006 and FR-010 exactly as gated above. No
principle status changes after design.

## Project Structure

### Documentation (this feature)

```text
specs/003-news-announcements/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

No new top-level directories — extends the projects from features 001–002.

```text
backend/
├── src/
│   ├── modules/
│   │   └── news/                 # NewsPost CRUD, publish/unpublish, feed query
│   └── common/
│       └── notifications/        # reused from feature 002 — batched send for publish events
└── tests/

admin-web/
├── src/
│   └── pages/
│       └── news/                 # Composer (draft/publish), jurisdiction target picker
└── tests/

mobile/
├── lib/
│   └── features/
│       └── news/                 # Feed screen, post detail, native share
└── test/
```

**Structure Decision**: A single new backend module (`news`) reusing feature
002's notification service for delivery and feature 001's jurisdiction trees
for targeting — no new top-level project, no new shared infrastructure beyond
what already exists.

## Complexity Tracking

No Constitution Check violations — table intentionally empty.
