---
description: "Task list template for feature implementation"
---

# Tasks: News & Announcements

**Input**: Design documents from `/specs/003-news-announcements/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md. Assumes feature 001's `backend`/`admin-web`/`mobile` projects and auth, and feature 002's notification-send service and job infrastructure, already exist.

**Tests**: Not explicitly requested in spec.md, and this feature touches no
money, so the Constitution's mandatory reconciliation-test gate does not apply.
No dedicated test tasks are generated; `T021` runs `quickstart.md` as the
end-to-end validation gate.

**Organization**: Tasks are grouped by user story (spec.md priorities P1–P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3, per spec.md

---

## Phase 1: Setup

- [x] T001 [P] Add a rich-text editor dependency (e.g. Tiptap) to `admin-web/`
- [x] T002 [P] Add an HTML sanitization dependency (e.g. `sanitize-html`) to `backend/` per research.md §3
- [x] T003 [P] Add the `share_plus` dependency to `mobile/pubspec.yaml` per research.md §5

**Checkpoint**: Dependencies ready.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Define the `NewsPost` and `NewsPostJurisdiction` Prisma models in `backend/prisma/schema.prisma` per data-model.md
- [x] T005 Write the Prisma migration for the new tables in `backend/prisma/migrations/`
- [x] T006 Implement the live feed-resolution query as a reusable service method in `backend/src/modules/news/feed-query.service.ts` per data-model.md's Feed resolution query and research.md §1 (depends on T004)
- [x] T007 Wire the `news` module into `backend/src/app.module.ts`

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Super Admin publishes news, bearers see and are notified (Priority: P1) 🎯 MVP

**Goal**: Super Admin composes, targets, and publishes a post; every in-scope
bearer sees it in their feed and gets a push notification.

**Independent Test**: quickstart.md steps 1–3 — publish targeted and
"everyone" posts, confirm audience correctness, confirm authoring is
Super-Admin-only.

### Implementation for User Story 1

- [x] T008 [P] [US1] Implement `NewsPost` create/edit (`SUPER_ADMIN` only, defaults to `DRAFT`) in `backend/src/modules/news/news.controller.ts` and `news.service.ts` per FR-001, FR-002, FR-004
- [x] T009 [US1] Implement the retired-jurisdiction target validation (`422 RETIRED_JURISDICTION`) in `backend/src/modules/news/news.service.ts` per FR-009, research.md §6 (depends on T008)
- [x] T010 [US1] Implement `POST /news/:id/publish`, transitioning `DRAFT → PUBLISHED` and enqueuing the notification fan-out job, rejecting with `409 ALREADY_PUBLISHED` otherwise, in `backend/src/modules/news/news.service.ts` per FR-005, FR-010, research.md §2 (depends on T006, T008)
- [x] T011 [US1] Implement the chunked notification fan-out job, reusing feature 002's `notification.service`, in `backend/src/modules/news/fanout.job.ts` (depends on T010)
- [x] T012 [US1] Implement `GET /news/feed` and `GET /news/:id` using the feed-resolution service in `backend/src/modules/news/news.controller.ts` per FR-006 (depends on T006)
- [x] T013 [P] [US1] Build the admin-web post composer (title, rich-text body, target picker, draft/publish actions) in `admin-web/src/pages/news/PostComposer.tsx` (depends on T008, T010)
- [x] T014 [P] [US1] Build the mobile feed screen and post detail view in `mobile/lib/features/news/` (depends on T012)
- [ ] T015 [US1] Wire incoming push notifications to open the corresponding post detail screen in `mobile/lib/features/news/` (depends on T011, T014) — **blocked**: this app has no real push transport yet in any feature (`PUSH_PROVIDER=mock` throughout; no `firebase_messaging` dependency, no `google-services.json`/`GoogleService-Info.plist`). Wiring a notification tap to `PostDetailScreen` needs a real Firebase project's credentials, which — like the Razorpay account noted in `backend/README.md` — only a human can create. `deepLinkFor()` in `post_detail.dart` is ready to be the landing target once FCM exists.

**Checkpoint**: User Story 1 fully functional and independently testable.

---

## Phase 4: User Story 2 - Bearer shares a post outward (Priority: P2)

**Goal**: A bearer shares a published post to WhatsApp or another app in one tap.

**Independent Test**: quickstart.md step 4 — confirm the deep-link slug is
present on a published post and the native share sheet opens with the right
title/link.

### Implementation for User Story 2

- [x] T016 [US2] Add deep-link slug generation to `NewsPost` creation in `backend/src/modules/news/news.service.ts` (depends on T008)
- [x] T017 [P] [US2] Implement the native share action (`share_plus`) on the post detail screen in `mobile/lib/features/news/post_detail.dart` per FR-007, SC-005 (depends on T012, T016)

**Checkpoint**: User Stories 1 and 2 both functional independently.

---

## Phase 5: User Story 3 - Super Admin drafts a post ahead of time (Priority: P3)

**Goal**: A draft can be edited freely with zero notifications, then published
once, exactly as Story 1 describes.

**Independent Test**: quickstart.md step 5 — edit a draft twice, confirm no
fan-out job fires and no bearer sees it, then publish and confirm exactly one
fan-out job fires.

### Implementation for User Story 3

- [x] T018 [US3] Add an explicit check (and assertion in the quickstart run) that `PATCH /news/:id` never changes `status` or enqueues a fan-out job, in `backend/src/modules/news/news.service.ts` per FR-004 (depends on T008) — T008/T010 already implement the split; this task verifies it holds
- [x] T019 [P] [US3] Add a Drafts list view (`status = DRAFT`) to the admin-web composer in `admin-web/src/pages/news/Drafts.tsx` (depends on T008)

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T020 [P] Enforce HTML sanitization (allow-listed tags) on every `NewsPost` write in `backend/src/modules/news/sanitize.util.ts` per research.md §3
- [x] T021 Run the full `quickstart.md` walkthrough end-to-end and record results
- [x] T022 [P] Add cursor-based pagination to `GET /news/feed` in `backend/src/modules/news/news.controller.ts` for bearers with a long history of posts
- [x] T023 [P] Document the news module setup in `backend/README.md`, `admin-web/README.md`, and `mobile/README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup; blocks every user story.
- **User Story 1 (Phase 3)**: depends on Foundational only.
- **User Story 2 (Phase 4)**: depends on Foundational and on `NewsPost` creation
  existing (T008 from US1) for the deep-link slug.
- **User Story 3 (Phase 5)**: depends on Foundational and US1's create/publish
  split (T008, T010) — it verifies and surfaces behavior already built there.
- **Polish (Phase 6)**: depends on whichever stories are in scope for release.

### Parallel Opportunities

- T001–T003 (Setup) run in parallel.
- T008 and T013/T014 (US1 backend vs. UI) run in parallel once their shared
  dependency completes.
- T017, T019 (US2/US3 UI) run in parallel with each other.
- T020, T022, T023 (Polish) run in parallel.

---

## Parallel Example: User Story 1

```text
# After Foundational (Phase 2) completes:
Task: "Implement NewsPost create/edit in backend/src/modules/news/"
# ...then, once T008 and T010 land:
Task: "Build the admin-web post composer in admin-web/src/pages/news/"
Task: "Build the mobile feed screen in mobile/lib/features/news/"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1).
2. **Stop and validate** with quickstart.md steps 1–3 — this alone is a working
   publish-and-notify loop.

### Incremental Delivery

1. Setup + Foundational → foundation ready (reuses features 001–002).
2. US1 → validate → MVP: bearers see and are notified of targeted news.
3. US2 → validate → outward sharing extends organizational reach.
4. US3 → validate → drafting ahead becomes safe and notification-free.
5. Polish → sanitization hardening, pagination, docs — then all three features
   (001, 002, 003) are ready for a combined release.

---

## Task Summary

- **Total tasks**: 23 (T001–T023)
- **Setup**: 3 (T001–T003)
- **Foundational**: 4 (T004–T007)
- **User Story 1 (P1)**: 8 (T008–T015)
- **User Story 2 (P2)**: 2 (T016–T017)
- **User Story 3 (P3)**: 2 (T018–T019)
- **Polish**: 4 (T020–T023)
- **Suggested MVP scope**: Setup + Foundational + User Story 1 (15 tasks)
