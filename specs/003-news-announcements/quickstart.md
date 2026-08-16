# Quickstart: News & Announcements

Validates the feature end-to-end against spec.md's acceptance scenarios, using
[data-model.md](./data-model.md) and [contracts/api.md](./contracts/api.md).
Assumes feature 001 is seeded (bearers assigned across at least two districts)
and feature 002's notification service is configured.

## Validation walkthrough

1. **Story 1, scenarios 1–2 — targeted publish**
   - `POST /news` as SUPER_ADMIN targeting District X → `201`, `status: DRAFT`.
   - `POST /news/:id/publish` → `200`, `status: PUBLISHED`, fan-out job enqueued.
   - `GET /news/feed` as a bearer in District X → the post appears.
   - `GET /news/feed` as a bearer outside District X → the post does not appear.

2. **Story 1, scenario 3 — everyone**
   - `POST /news` with `target_everyone: true`, publish it.
   - `GET /news/feed` as bearers in two different districts → both see it.

3. **Story 1, scenario 4 — authoring is Super-Admin-only**
   - `POST /news` as a District Admin → `403 NOT_SUPER_ADMIN`.

4. **Story 2 — share**
   - `GET /news/:id` for a published post → response includes the deep-link
     slug; confirm the mobile share action opens the native share sheet with
     the post title and link (manual/UI check, not an API assertion).

5. **Story 3 — draft, edit, then publish**
   - `POST /news` (draft), `PATCH /news/:id` twice with different body text →
     confirm no notification fan-out job was enqueued after either edit and
     `GET /news/feed` shows nothing for any bearer.
   - `POST /news/:id/publish` → now visible per step 1's checks, and exactly one
     fan-out job was enqueued (not one per edit).

6. **Edge case — live feed re-evaluation**
   - Close the District-X-targeted post's audience bearer's assignment (feature
     001) and open a new one in a different district.
   - `GET /news/feed` for that bearer → the District X post no longer appears;
     `GET /news/feed` for a bearer newly assigned into District X (if any) →
     the post now appears for them too, confirming FR-006's live evaluation.

7. **Edge case — retired jurisdiction**
   - Retire a `JurisdictionUnit` (feature 001), then `POST /news` targeting it
     → `422 RETIRED_JURISDICTION`.

## Expected outcome

All seven steps pass, confirming FR-001 through FR-011 and SC-001 through
SC-005, and specifically that feed membership tracks a bearer's *current*
assignment rather than a stale snapshot.
