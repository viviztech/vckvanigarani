---
description: "Task list template for feature implementation"
---

# Tasks: Bearer & Hierarchy Register

**Input**: Design documents from `/specs/001-bearer-hierarchy-register/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Not explicitly requested in spec.md, so no dedicated test tasks are
generated. `T038` runs the `quickstart.md` walkthrough as the end-to-end
validation gate instead.

**Organization**: Tasks are grouped by user story (spec.md priorities P1–P3) so
each story is independently implementable, testable, and demoable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3, per spec.md
- File paths are exact, per plan.md's three-part structure (`backend/`, `admin-web/`, `mobile/`)

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Create the three-part directory structure (`backend/`, `admin-web/`, `mobile/`) at the repository root per plan.md
- [x] T002 [P] Initialize the backend NestJS + TypeScript + Prisma project in `backend/` (`package.json`, `tsconfig.json`, `nest-cli.json`)
- [x] T003 [P] Initialize the admin-web React + TypeScript + Vite project in `admin-web/`
- [x] T004 [P] Initialize the mobile Flutter project in `mobile/` (`pubspec.yaml`, `lib/main.dart`)
- [x] T005 [P] Configure linting/formatting: ESLint + Prettier for `backend/` and `admin-web/`, `flutter analyze` config for `mobile/`
- [x] T006 Configure environment management for `backend/` (`.env.example` with `DATABASE_URL`, JWT secrets, SMS provider keys per research.md §5)

**Checkpoint**: Repos scaffolded, tooling in place.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T007 Define the Prisma schema for `Post`, `JurisdictionUnit`, `Bearer`, `Assignment`, `AssignmentJurisdiction`, `AdminScope`, `AuditLogEntry` in `backend/prisma/schema.prisma` per data-model.md
- [x] T008 Write the initial Prisma migration and enable the `pg_trgm` extension in `backend/prisma/migrations/` per research.md §7
- [x] T009 [P] Implement the `SmsProvider` interface and a mock implementation in `backend/src/modules/auth/sms-provider.ts` per research.md §5
- [x] T010 [P] Implement phone-OTP request/verify and JWT issuance in `backend/src/modules/auth/auth.controller.ts` and `auth.service.ts` per contracts/api.md Auth routes — `verify` MUST reject any phone with no matching `ACTIVE` Bearer (`404 BEARER_NOT_FOUND`) and no route in this module may create a Bearer (FR-015, FR-016)
- [x] T011 Implement `JurisdictionUnit` path/depth maintenance logic in `backend/src/modules/jurisdictions/jurisdiction-path.util.ts` per research.md §2
- [x] T012 Implement `ScopedToJurisdictionGuard` and its `@ScopedTo` decorator in `backend/src/common/guards/scoped-to-jurisdiction.guard.ts`, returning the `403 OUT_OF_SCOPE` shape from contracts/api.md, per research.md §4 and Constitution Principle V
- [x] T013 Implement the `AuditLogEntry` write helper in `backend/src/common/audit/audit-log.service.ts` per FR-014
- [x] T014 Wire module registration in `backend/src/app.module.ts` (posts, jurisdictions, bearers, assignments, auth)
- [x] T015 [P] Build the API client with token storage/refresh in `admin-web/src/services/api-client.ts`
- [x] T016 [P] Build the API client and OTP login screen (no sign-up screen — login only, per FR-015) with token storage/refresh in `mobile/lib/services/api_client.dart` and `mobile/lib/features/auth/`

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Register a bearer and assign them to a post and territory (Priority: P1) 🎯 MVP

**Goal**: An admin can create a bearer profile and assign them to a post and
jurisdiction — including the State Secretary (3 PCs) and State Deputy Secretary
(1 PC → its ACs) rules — and reassignment preserves full history.

**Independent Test**: quickstart.md steps 1–4 — create a bearer, assign them,
confirm concurrent holders and the PC/AC resolution rule, close and reassign,
confirm the closed assignment's history is intact.

### Implementation for User Story 1

- [x] T017 [P] [US1] Implement the Post module (`create`/`list`/`update`, SUPER_ADMIN only, including the `capabilities` field) in `backend/src/modules/posts/posts.controller.ts` and `posts.service.ts` per FR-001, FR-018, contracts/api.md Posts
- [x] T018 [P] [US1] Implement the Jurisdiction module (`create`/`list`/`update` with parent-type validation, SUPER_ADMIN only for writes) in `backend/src/modules/jurisdictions/jurisdictions.controller.ts` and `jurisdictions.service.ts` per FR-002, FR-003
- [x] T019 [P] [US1] Implement Bearer create/update in `backend/src/modules/bearers/bearers.controller.ts` and `bearers.service.ts` per FR-004
- [x] T020 [US1] Implement Assignment creation with the `jurisdiction_type_rule` validation (FR-008) in `backend/src/modules/assignments/assignments.service.ts` (depends on T017, T018, T019)
- [x] T021 [US1] Implement the assignment close endpoint (`status → CLOSED`, `end_date`, `closed_by`) in `backend/src/modules/assignments/assignments.controller.ts` per FR-007 (depends on T020)
- [x] T022 [US1] Wire `AuditLogEntry` writes into assignment create/close and post/jurisdiction changes (depends on T013, T020, T021)
- [x] T023 [P] [US1] Build the admin-web Post manager page in `admin-web/src/pages/posts/PostManager.tsx` (depends on T017)
- [x] T024 [P] [US1] Build the admin-web jurisdiction tree builder page in `admin-web/src/pages/jurisdictions/JurisdictionTree.tsx` (depends on T018)
- [x] T025 [US1] Build the admin-web bearer create + assign/reassign/close flow in `admin-web/src/pages/bearers/BearerForm.tsx`, with a jurisdiction-type/level picker so Super Admin can target State, District, Block, Municipality, Town Panchayat, or a constituency directly in one flow (FR-017) (depends on T023, T024, T021)
- [x] T026 [US1] Write the ECI/TN jurisdiction master-data seed script (States/Districts/Blocks/Municipalities/Town Panchayats/Parliament & Assembly Constituencies) in `backend/prisma/seed.ts` per spec.md Assumptions — this is this feature's structural "backfill" per the constitution's hierarchy-touching workflow gate

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Browse and search the bearer directory (Priority: P2)

**Goal**: Admins and bearers can search/filter the directory, see a bearer's
current and past assignments, and every admin's results are limited to their own
jurisdiction subtree.

**Independent Test**: quickstart.md step 5 — search as Super Admin, then as a
District Admin scoped elsewhere and confirm exclusion, then confirm an
out-of-scope write is rejected with `403 OUT_OF_SCOPE`.

### Implementation for User Story 2

- [x] T027 [P] [US2] Implement the bearer search endpoint using the `pg_trgm` index in `backend/src/modules/bearers/bearers.service.ts` per FR-009, SC-002 (depends on T008, T019)
- [x] T028 [US2] Implement `GET /bearers/:id` returning current + closed assignments in `backend/src/modules/bearers/bearers.controller.ts` (depends on T020, T021)
- [x] T029 [US2] Apply `ScopedToJurisdictionGuard` to the bearer list/detail/search routes per FR-010 (depends on T012, T027, T028)
- [x] T030 [P] [US2] Build the admin-web bearer directory search/filter UI in `admin-web/src/pages/bearers/Directory.tsx` (depends on T027)
- [x] T031 [P] [US2] Build the mobile read-only directory search screen in `mobile/lib/features/directory/directory_screen.dart` (depends on T027)
- [x] T032 [US2] Implement the mobile offline cache for the last directory query in `mobile/lib/features/directory/directory_cache.dart` per research.md §6 (depends on T031)

**Checkpoint**: User Stories 1 and 2 both functional independently.

---

## Phase 5: User Story 3 - See where a post is unfilled (Priority: P3)

**Goal**: An admin can select a post and see every jurisdiction unit with no
active holder, plus any unit covered by more than one holder.

**Independent Test**: quickstart.md step 6 — run the coverage report against
seeded Parliament Constituencies, confirm unfilled ones are listed, then create
an overlapping assignment and confirm it's flagged without being blocked.

### Implementation for User Story 3

- [x] T033 [US3] Implement `GET /reports/coverage` (`unfilled` + `overlapping`) in `backend/src/modules/assignments/coverage-report.service.ts` per FR-012, FR-013 (depends on T020)
- [x] T034 [US3] Apply `ScopedToJurisdictionGuard` to the coverage report route (depends on T012, T033)
- [x] T035 [P] [US3] Build the admin-web coverage-gap report page in `admin-web/src/pages/coverage/CoverageReport.tsx` (depends on T033)

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T036 [P] Add rate limiting to `POST /auth/otp/request` in `backend/src/modules/auth/`
- [x] T037 [P] Add request logging and a uniform error-response filter in `backend/src/common/filters/`
- [x] T038 Run the full `quickstart.md` walkthrough end-to-end against the seeded environment and record results
- [x] T039 [P] Write setup READMEs for `backend/`, `admin-web/`, and `mobile/`
- [x] T040 Review every route in contracts/api.md against `ScopedToJurisdictionGuard` coverage, confirming none was left unguarded, per Constitution Principle V

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup; blocks every user story.
- **User Story 1 (Phase 3)**: depends on Foundational only.
- **User Story 2 (Phase 4)**: depends on Foundational; reads data shaped by US1's
  Assignment/Bearer work (T019–T021) but does not require US1's UI.
- **User Story 3 (Phase 5)**: depends on Foundational and on Assignment creation
  (T020) from US1.
- **Polish (Phase 6)**: depends on whichever stories are in scope for the release.

### Parallel Opportunities

- T002–T005 (Setup) run in parallel — separate projects/tooling.
- T009, T010 and T015, T016 (Foundational) run in parallel — separate modules.
- T017, T018, T019 (US1 backend modules) run in parallel — separate files, no
  cross-dependency until T020.
- T023, T024 (US1 admin-web pages) run in parallel.
- T030, T031 (US2 UI) run in parallel — separate apps.
- T036, T037, T039 (Polish) run in parallel.

---

## Parallel Example: User Story 1

```text
# After Foundational (Phase 2) completes, launch together:
Task: "Implement the Post module in backend/src/modules/posts/"
Task: "Implement the Jurisdiction module in backend/src/modules/jurisdictions/"
Task: "Implement Bearer create/update in backend/src/modules/bearers/"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1).
2. **Stop and validate** with quickstart.md steps 1–4.
3. This alone is a usable digital bearer register — deployable before the
   directory search or coverage report exist.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → validate → this is the MVP.
3. US2 → validate → directory becomes searchable, scope enforcement provable.
4. US3 → validate → coverage-gap reporting available.
5. Polish → hardening pass, then this feature is ready for feature 002
   (Contribution & Events), which depends on the Bearer and Assignment data
   modeled here.

---

## Task Summary

- **Total tasks**: 40 (T001–T040)
- **Setup**: 6 (T001–T006)
- **Foundational**: 10 (T007–T016)
- **User Story 1 (P1)**: 10 (T017–T026)
- **User Story 2 (P2)**: 6 (T027–T032)
- **User Story 3 (P3)**: 3 (T033–T035)
- **Polish**: 5 (T036–T040)
- **Suggested MVP scope**: Setup + Foundational + User Story 1 (26 tasks)
