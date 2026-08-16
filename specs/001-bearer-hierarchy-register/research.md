# Phase 0 Research: Bearer & Hierarchy Register

No `NEEDS CLARIFICATION` markers remained in the Technical Context — the stack was
already fixed by the constitution's Platform & Compliance Constraints. This
research resolves the implementation-pattern decisions still open within that
stack.

## 1. Backend framework

- **Decision**: NestJS (TypeScript) over Django REST.
- **Rationale**: Constitution fixes the language family; within it, NestJS's
  dependency-injected Guards are the natural place to implement the mandatory
  server-side jurisdiction-scope check (Principle V) as a single reusable unit
  applied to every route, rather than repeated per-view logic.
- **Alternatives considered**: Django REST — mature admin scaffolding, but the
  admin console and mobile app are both TypeScript/Dart, and Django's
  permission-class pattern is a weaker fit for the tree-subtree check this feature
  needs on every request.

## 2. Jurisdiction tree storage

- **Decision**: Adjacency list (`parent_id` self-reference) plus a materialized
  `path` (ancestor id array) and `depth` column, recomputed on structural write.
- **Rationale**: Structural edits (add/rename/merge a unit) are rare and
  Super-Admin-only (FR-003, FR-011); subtree reads happen on nearly every request,
  both for the scope guard (Principle V) and the coverage report (FR-012).
  Materializing `path` turns "is X inside my subtree" into an indexed prefix check
  instead of a recursive query.
- **Alternatives considered**: Plain adjacency list with recursive CTEs per
  request — too slow to run on every single API call. Closure table — faster
  reads than adjacency-with-path in theory, but adds write-side complexity and
  storage overhead not justified given how infrequently the tree structure
  changes.

## 3. ORM

- **Decision**: Prisma.
- **Rationale**: Type-safe query builder pairs naturally with NestJS + TypeScript;
  schema migrations make the `path`/`depth` maintenance trigger logic explicit and
  reviewable.
- **Alternatives considered**: TypeORM — viable, but more boilerplate for the
  custom path-maintenance logic this feature needs.

## 4. Jurisdiction-scope enforcement

- **Decision**: A NestJS Guard (`ScopedToJurisdictionGuard`) paired with a route
  decorator, resolving the caller's own assignment jurisdiction and rejecting any
  request whose target record's `path` is not a descendant (or self) of the
  caller's scope. Applied before the handler runs, on every bearer/assignment/
  jurisdiction route.
- **Rationale**: Directly satisfies FR-010/FR-011 and Constitution Principle V's
  requirement that scope be enforced at the API/data layer, not by hiding UI
  elements.
- **Alternatives considered**: Per-query `WHERE` clause added ad hoc in each
  service method — rejected as easy to forget on a new endpoint; a single guard
  makes the check impossible to skip by omission.

## 5. Authentication

- **Decision**: Phone-number OTP (delivered through an `SmsProvider` interface,
  concrete implementation MSG91/Twilio) issuing short-lived JWT access tokens plus
  a refresh token, per the constitution's fixed login method.
- **Rationale**: Matches the constitution constraint; the `SmsProvider` interface
  keeps the OTP vendor swappable without touching auth logic.
- **Alternatives considered**: None — method is fixed by the constitution, only
  the provider abstraction was a genuine implementation choice.

## 6. Mobile directory caching

- **Decision**: The Flutter directory screen caches the most recent successful
  query result set locally (Hive), keyed by the filter used, and shows cached
  results with a "last updated" indicator when offline.
- **Rationale**: Rural/low-connectivity use is a named constraint; a read-only
  screen with no cache would simply fail for those users.
- **Alternatives considered**: No caching — rejected per the constraint above.
  Full offline write queue — out of scope, since this feature's mobile slice is
  read-only (assignment edits happen in admin-web).

## 7. Directory search

- **Decision**: PostgreSQL `pg_trgm` trigram index on bearer name/phone and
  jurisdiction/post name columns, queried through a single search endpoint.
- **Rationale**: Meets the 2-second search target at the ~10,000+ bearer scale in
  SC-002 without adding an external search service.
- **Alternatives considered**: Dedicated search engine (Elasticsearch/Meilisearch)
  — rejected as disproportionate to this scale; revisit only if the register
  grows well past ~100k records.
