# Implementation Plan: Bearer & Hierarchy Register

**Branch**: `001-bearer-hierarchy-register` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-bearer-hierarchy-register/spec.md`

## Summary

Build the register that everything else in the Vanigar Ani Bearer Platform depends
on: configurable Posts (including data-driven capability grants like finance
visibility), two independent jurisdiction trees (administrative and electoral),
admin-provisioned bearer profiles — there is no bearer self-registration — and
post+jurisdiction assignments with full history. Technical approach: a
NestJS/PostgreSQL API that enforces jurisdiction-scoped access at the guard
level, a React admin console for structure and assignment management (where
Super Admin can add a bearer directly at any level), and a thin read-only
directory view in the Flutter bearer app.

## Technical Context

**Language/Version**: TypeScript 5.x (backend + admin web, Node.js 20 LTS), Dart 3.x / Flutter 3.x (mobile)

**Primary Dependencies**: NestJS, Prisma ORM, Passport-JWT; React 18 + Vite + TanStack Query for admin-web; Flutter + Riverpod + Dio for mobile

**Storage**: PostgreSQL 15+ — two jurisdiction trees, bearers, assignments, audit log (per Constitution "Platform & Compliance Constraints")

**Testing**: Jest + Supertest (backend contract/integration), Vitest + React Testing Library (admin-web), `flutter_test`/`integration_test` (mobile)

**Target Platform**: Linux server (API), evergreen browsers (admin-web), Android 8+ / iOS 14+ (mobile)

**Project Type**: Web service + admin web app + mobile app (three-part)

**Performance Goals**: Directory search returns within 2s at 10,000+ bearer records (spec SC-002); scope-check middleware adds no perceptible latency to CRUD/search endpoints

**Constraints**: Jurisdiction-scope access MUST be enforced server-side on every request, never by hiding UI alone (Constitution Principle V); mobile directory view MUST tolerate intermittent connectivity (cache last successful query)

**Scale/Scope**: Statewide register — assume up to ~50,000 bearers, ~40 Parliament Constituencies, ~230+ Assembly Constituencies, and several hundred District/Block/Municipality/Town Panchayat units (exact counts from the ECI/TN local-body import per spec Assumptions). In scope: Post management, both jurisdiction trees, bearer CRUD, assignment CRUD with history, directory search, coverage-gap report, scoped access control, audit log. Out of scope: contribution events (feature 002), news (feature 003).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Configuration Over Hard-Coding | Post and JurisdictionUnit are data rows managed through API + admin UI, not enums baked into code; Post's `capabilities` field (e.g. `FINANCE_VIEW`) is likewise data, not a hardcoded title check (FR-018) | PASS |
| II. Dual-Hierarchy Integrity | Administrative and electoral trees stored as separate `tree` values on one polymorphic table, cross-referenced only via a Post's jurisdiction rule (FR-008); assignments closed via `end_date`, never deleted (FR-007) | PASS |
| III. Financial Integrity & Auditability | Not applicable — this feature moves no money. Re-checked when feature 002 (contribution events) is planned | N/A for this feature |
| IV. Privacy by Minimum Collection | Bearer fields limited to those listed in FR-004; no payment credentials touched | PASS |
| V. Access Scoped to Jurisdiction | Enforced via a NestJS guard that resolves the caller's assignment scope and checks the target record's tree path server-side on every request (FR-010, FR-011) — not a UI-only restriction. No bearer self-registration route exists anywhere in the API (FR-015); OTP verify rejects unmatched phone numbers (FR-016); Super Admin's null scope matches any jurisdiction, satisfying direct creation at any level (FR-017) | PASS |
| Platform constraints | Backend NestJS/PostgreSQL, admin-web React, mobile Flutter — matches constitution stack | PASS |
| Workflow gate: hierarchy-touching migration plan | No pre-existing assignment data; the equivalent backfill is the one-time ECI/TN jurisdiction-tree import documented in `quickstart.md` | PASS |

No violations requiring justification — Complexity Tracking table is empty.

**Post-Phase 1 re-check**: `data-model.md`'s `AdminScope` entity and
`ScopedToJurisdictionGuard` pattern, and `contracts/api.md`'s uniform
`403 OUT_OF_SCOPE` response, implement Principle V exactly as gated above with no
new deviations. No principle status changes after design.

## Project Structure

### Documentation (this feature)

```text
specs/001-bearer-hierarchy-register/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── posts/            # Post CRUD (Super Admin only)
│   │   ├── jurisdictions/    # Two-tree CRUD + subtree queries
│   │   ├── bearers/          # Bearer profile CRUD + search
│   │   ├── assignments/      # Assignment create/close + coverage report
│   │   └── auth/             # Phone OTP + JWT
│   ├── common/
│   │   └── guards/           # ScopedToJurisdiction guard (Constitution Principle V)
│   └── main.ts
└── tests/
    ├── contract/              # Request/response shape per contracts/api.md
    ├── integration/           # Cross-module flows (assign → search → coverage)
    └── unit/

admin-web/
├── src/
│   ├── pages/
│   │   ├── posts/             # Post manager (Super Admin)
│   │   ├── jurisdictions/     # Tree builder (Super Admin)
│   │   ├── bearers/           # Directory, profile, assign/reassign
│   │   └── coverage/          # Coverage-gap report
│   ├── components/
│   └── services/              # API client, scoped by logged-in admin's role
└── tests/

mobile/
├── lib/
│   └── features/
│       └── directory/         # Read-only bearer/org directory search (Story 2)
└── test/
```

**Structure Decision**: Three-part structure matching the constitution's platform
constraints. `backend/` owns the Post/JurisdictionUnit/Bearer/Assignment domain and
the jurisdiction-scope guard required by Principle V. `admin-web/` is the primary
surface for Story 1 (assign) and Story 3 (coverage report) — structural and
assignment edits are desktop admin tasks. `mobile/` carries only the read-only
directory search slice of Story 2 for this feature; assignment editing stays off
the bearer-facing mobile app.

## Complexity Tracking

No Constitution Check violations — table intentionally empty.
