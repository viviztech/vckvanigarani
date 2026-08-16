# Phase 0 Research: News & Announcements

No `NEEDS CLARIFICATION` markers remained in the Technical Context.

## 1. Live feed query

- **Decision**: A bearer's feed is queried as: `PUBLISHED` posts where the
  target is "everyone," OR the target's `JurisdictionUnit.path` is an ancestor
  of (or equal to) the `path` of any `JurisdictionUnit` in the bearer's currently
  `ACTIVE` assignments (feature 001's materialized `path`).
- **Rationale**: Directly implements FR-006 (live, not snapshotted) by reusing
  feature 001's path-prefix mechanism (feature 001 research.md §2) instead of
  inventing a second targeting mechanism.
- **Alternatives considered**: Snapshotting the target audience's bearer ids at
  publish time — rejected, it's exactly what FR-006 prohibits and would show a
  transferred-out bearer a post that's no longer theirs.

## 2. Batched notification delivery

- **Decision**: Publishing a post enqueues a single "fan-out" job (reusing
  feature 002's `@nestjs/schedule`-based job infrastructure) that resolves the
  in-scope bearer list and sends push/SMS in chunks (e.g., 500 at a time),
  rather than looping synchronously inside the publish request.
- **Rationale**: Satisfies FR-010 and the "everyone" edge case — a statewide
  publish to tens of thousands of bearers must not block the API response or
  risk a request timeout.
- **Alternatives considered**: Synchronous send in the publish handler —
  rejected outright per FR-010. A dedicated message queue (BullMQ/SQS) — noted
  as the upgrade path if fan-out volume or latency requirements grow beyond what
  a scheduled chunked job comfortably handles, matching the same "revisit if it
  stops being enough" judgment made for feature 002's reminder job.

## 3. Rich text storage

- **Decision**: Store the post body as sanitized HTML (server-side sanitization
  on every write, allow-listing a small tag set: paragraphs, bold/italic,
  lists, links, images).
- **Rationale**: Simple to render identically in both admin-web (preview) and
  the Flutter feed (via an HTML-to-widget renderer), and easy to sanitize with a
  well-known library rather than trusting a custom rich-text JSON schema.
- **Alternatives considered**: Storing structured editor JSON (e.g., Tiptap's
  native format) — rejected as it would require a matching renderer on Flutter
  with no equivalent maturity to an HTML render path.

## 4. Post state machine

- **Decision**: `DRAFT → PUBLISHED → UNPUBLISHED`, a linear one-way progression;
  `PUBLISHED → UNPUBLISHED` is reversible back to `PUBLISHED` (re-publishing does
  **not** re-trigger notifications, only the original `DRAFT → PUBLISHED`
  transition does).
- **Rationale**: Matches FR-003, FR-004, and FR-008 (edit/unpublish without
  re-notifying) with the smallest state machine that satisfies them.
- **Alternatives considered**: A scheduled "publish at" future timestamp —
  not requested by spec.md and not needed for Story 3 (which only requires
  drafting ahead of a manual publish); noted as a natural, low-risk future
  extension rather than built now.

## 5. External share

- **Decision**: Each `NewsPost` gets a stable deep-link URL
  (`vanigarani://news/:id`, with a web fallback); Story 2's share action opens
  the OS native share sheet (Flutter `share_plus`) with the post title and that
  link.
- **Rationale**: Meets FR-007/SC-005 (one tap) using the platform's own share
  mechanism rather than building a custom one; matches how most consumer apps
  implement "share out."
- **Alternatives considered**: In-app-only sharing (copy link to clipboard) —
  weaker one-tap experience than the native share sheet; rejected.

## 6. Retired-jurisdiction guard on the target picker

- **Decision**: The `POST /news` and `PATCH /news/:id` target-selection
  validation rejects any `jurisdiction_unit_id` whose `status` is `RETIRED`
  (feature 001), reusing the same validation feature 001 applies to
  assignments.
- **Rationale**: Satisfies FR-009 without introducing a new validation
  mechanism — retired units are already a known state from feature 001.
- **Alternatives considered**: Filtering retired units out of the picker UI only
  — rejected as a UI-only control, the same class of gap Constitution Principle
  V's "not by hiding UI elements alone" reasoning warns against, even though
  this specific check isn't itself a Principle V case.
