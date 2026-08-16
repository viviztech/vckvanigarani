# Quickstart: Bearer & Hierarchy Register

Validates the feature end-to-end against the acceptance scenarios in
[spec.md](./spec.md), using the entities in [data-model.md](./data-model.md) and
the endpoints in [contracts/api.md](./contracts/api.md).

## Prerequisites

- Backend running locally against a PostgreSQL instance with the `pg_trgm`
  extension enabled (research.md §7).
- Seed data loaded: at minimum the `STATE` root of both trees, one `DISTRICT`
  with one `BLOCK`, one `PARLIAMENT_CONSTITUENCY` with three
  `ASSEMBLY_CONSTITUENCY` children, and the initial Post list from spec.md's
  Assumptions (Organizer, Secretary, Deputy Secretary, Finance Secretary).
- One `SUPER_ADMIN` `AdminScope` row to authenticate as for setup steps.

## Validation walkthrough

1. **Story 1, scenario 1 — register and assign a bearer**
   - `POST /bearers` with a new bearer's profile → expect `201` and a `Bearer` with `status: ACTIVE`.
   - `POST /assignments` with that bearer's id, the seeded District's `BLOCK`
     Finance Secretary post, `jurisdiction_unit_ids: [<block id>]`, today's date.
   - `GET /bearers/:id` → the new assignment appears under `assignments` with `status: ACTIVE`.

2. **Story 1, scenario 2 — concurrent holders**
   - Repeat step 1 with a second bearer, same post and jurisdiction.
   - `GET /bearers?post_id=&jurisdiction_id=` → both bearers are returned as active holders.

3. **Story 1, scenarios 3–4 — state-level electoral jurisdiction**
   - `POST /assignments` for a State Secretary post with three `PARLIAMENT_CONSTITUENCY` ids → `201`.
   - `POST /assignments` for a State Deputy Secretary post with one `PARLIAMENT_CONSTITUENCY` id → `201`, and the response's resolved jurisdiction includes that constituency's `ASSEMBLY_CONSTITUENCY` children per FR-008.

4. **Story 1, scenario 5 — reassignment preserves history**
   - `POST /assignments/:id/close` on the bearer from step 1 with an `end_date`.
   - `POST /assignments` for a new bearer, same post/jurisdiction.
   - `GET /bearers/:id/assignments` for the original bearer → the closed assignment is still present with `status: CLOSED` and the recorded `end_date` (FR-007).

5. **Story 2 — directory search and scope**
   - `GET /bearers?query=<name>` as SUPER_ADMIN → matches returned within the 2s target (SC-002).
   - Authenticate as a `DISTRICT_ADMIN` scoped to a different district; repeat the
     same query → bearers outside that district's subtree are excluded (FR-010).
   - Attempt `POST /assignments` as that `DISTRICT_ADMIN` targeting a jurisdiction
     outside their district → expect `403 OUT_OF_SCOPE` (edge case 1).

6. **Story 3 — coverage report**
   - `GET /reports/coverage?post_id=<state secretary post id>` → every seeded
     `PARLIAMENT_CONSTITUENCY` with no active assignment appears under `unfilled`.
   - Assign two different bearers as State Secretary to the same constituency,
     re-run the report → that constituency appears under `overlapping` (FR-013)
     while the assignment itself still succeeds (edge case 2).

7. **FR-015/016 — no self-registration**
   - `POST /auth/otp/request` with a phone number that has no Bearer record →
     still `202` (doesn't reveal whether the number is registered).
   - `POST /auth/otp/verify` with that same number and a valid code → expect
     `404 BEARER_NOT_FOUND`, and confirm no Bearer row was created as a side effect.

8. **FR-017 — Super Admin creates at any level directly**
   - As SUPER_ADMIN, `POST /bearers` targeting a jurisdiction two levels below
     State (e.g. a Town Panchayat) in a single call, with no District or local
     admin action in between → `201`.

9. **FR-018 — Post capability grant**
   - `PATCH /posts/:id` on the seeded Finance Secretary post, setting
     `capabilities: ["FINANCE_VIEW"]` → `200`.
   - Assign a bearer to that post; `GET /bearers/:id` shows the assignment; the
     resolved capability is available for the Contribution & Events feature to
     consume later (this feature only proves the grant persists and resolves,
     per data-model.md's Capability resolution rule — no finance UI exists yet).

## Expected outcome

All nine steps pass without manual data cleanup between them (each uses distinct
bearers/assignments), confirming FR-001 through FR-018 and SC-001 through SC-005
are met by the implementation.
