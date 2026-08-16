# Phase 1 Data Model: News & Announcements

Derived from spec.md's Key Entities and research.md. Reuses `Bearer`,
`JurisdictionUnit`, and `AdminScope` from feature 001, and the notification
send helper from feature 002 unchanged.

## NewsPost

| Field | Type | Notes |
|---|---|---|
| id | uuid | |
| title | string | |
| body_html | text | sanitized HTML (research.md §3) |
| target_everyone | boolean | mutually exclusive with `target_jurisdiction_ids` below being non-empty |
| status | enum | `DRAFT, PUBLISHED, UNPUBLISHED` (research.md §4) |
| author_id | ref → Bearer | must hold `AdminScope.role = SUPER_ADMIN` at creation time (FR-001) |
| published_at | timestamp, nullable | set on first `DRAFT → PUBLISHED` transition only |
| updated_at | timestamp | |
| deep_link_slug | string, unique | for the share URL (research.md §5) |

**Validation**: exactly one of `target_everyone = true` or at least one row in
`NewsPostJurisdiction` (FR-002). No `jurisdiction_unit_id` in
`NewsPostJurisdiction` may reference a `RETIRED` unit (FR-009, research.md §6).
Only `SUPER_ADMIN` may write any field on this entity (FR-001).

**State transitions**: `DRAFT` → `PUBLISHED` (fires the notification fan-out
job, research.md §2 — the only transition that does). `PUBLISHED` ⇄
`UNPUBLISHED` (toggle; neither direction re-fires notifications, FR-008).
Editing `title`/`body_html` is allowed in any state and never itself changes
`status` or fires notifications (FR-004, FR-008).

## NewsPostJurisdiction (bridge)

| Field | Type | Notes |
|---|---|---|
| news_post_id | ref → NewsPost | |
| jurisdiction_unit_id | ref → JurisdictionUnit | from either of feature 001's trees |

**Validation**: composite unique on `(news_post_id, jurisdiction_unit_id)`.

## Feed resolution (query, not a stored entity)

For a given bearer, their feed is:

```text
SELECT * FROM NewsPost
WHERE status = 'PUBLISHED'
AND (
  target_everyone = true
  OR EXISTS (
    SELECT 1 FROM NewsPostJurisdiction npj
    JOIN JurisdictionUnit target ON target.id = npj.jurisdiction_unit_id
    JOIN JurisdictionUnit bearer_unit ON bearer_unit.id IN (<bearer's current ACTIVE assignment jurisdiction ids>)
    WHERE npj.news_post_id = NewsPost.id
    AND bearer_unit.path @> target.path  -- target is an ancestor of (or equal to) the bearer's unit
  )
)
ORDER BY published_at DESC
```

This is evaluated live on every feed request (research.md §1) — there is no
per-bearer feed row to keep in sync, which is what makes FR-006 hold
automatically as assignments change.

## Entity Relationships

```text
NewsPost 1───* NewsPostJurisdiction *───1 JurisdictionUnit   (feature 001, read-only reference)
NewsPost *───1 Bearer   (author_id, feature 001)
```
