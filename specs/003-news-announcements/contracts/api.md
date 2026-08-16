# API Contract: News & Announcements

REST, JSON. All routes require a bearer JWT (feature 001's auth).

## Posts (authoring)

| Method | Path | Body | Response | Scope |
|---|---|---|---|---|
| POST | `/news` | `{ title, body_html, target_everyone, jurisdiction_unit_ids[] }` | `NewsPost` (`status: DRAFT`) | SUPER_ADMIN only (FR-001) |
| PATCH | `/news/:id` | partial fields | `NewsPost` | SUPER_ADMIN only; never changes `status` (FR-004, FR-008) |
| POST | `/news/:id/publish` | — | `NewsPost` (`status: PUBLISHED`), enqueues notification fan-out (FR-005, FR-010) | SUPER_ADMIN only; rejected `409 ALREADY_PUBLISHED` if not currently `DRAFT` |
| POST | `/news/:id/unpublish` | — | `NewsPost` (`status: UNPUBLISHED`) | SUPER_ADMIN only (FR-008) |
| POST | `/news/:id/republish` | — | `NewsPost` (`status: PUBLISHED`), does **not** re-enqueue notifications | SUPER_ADMIN only |

## Feed (reading)

| Method | Path | Body | Response | Scope |
|---|---|---|---|---|
| GET | `/news/feed` | — | `NewsPost[]`, resolved live per data-model.md's Feed resolution query (FR-006) | any authenticated bearer, scoped to their own current assignments — no admin scope needed to read |
| GET | `/news/:id` | — | `NewsPost` full detail, `404` if not visible to the caller per the same feed rule | any authenticated bearer |

## Error shapes

```json
{ "statusCode": 403, "error": "NOT_SUPER_ADMIN", "message": "Only Super Admin can create or publish news posts" }
{ "statusCode": 409, "error": "ALREADY_PUBLISHED", "message": "This post is already published" }
{ "statusCode": 422, "error": "RETIRED_JURISDICTION", "message": "Cannot target a retired jurisdiction unit" }
```
