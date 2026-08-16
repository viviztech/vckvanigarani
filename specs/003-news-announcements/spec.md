# Feature Specification: News & Announcements

**Feature Branch**: `003-news-announcements`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "General news section: create a post and share the news to bearers. Target a post to everyone or a specific territory. Bearers see it in their feed, get a push notification, and can share it out to WhatsApp and other apps."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Super Admin publishes news, bearers see and are notified (Priority: P1)

Super Admin writes a news post — title, body, optional images — targets it to
everyone or a specific jurisdiction, and publishes it. Every bearer within that
target sees it in their in-app feed and gets a push notification.

**Why this priority**: This is the entire point of the feature — getting word
out from the organization to its bearers. Nothing else here has value without
this loop working.

**Independent Test**: Can be fully tested by publishing one post targeted to a
specific district and confirming it appears in the feed and triggers a
notification for bearers in that district, and not for bearers outside it.

**Acceptance Scenarios**:

1. **Given** Super Admin is composing a post, **When** they publish it targeted
   to a specific district, **Then** every bearer whose current assignment falls
   within that district sees it in their feed and receives a push notification.
2. **Given** the same post, **When** a bearer outside that district checks their
   feed, **Then** the post does not appear.
3. **Given** a post targeted to "everyone," **When** it's published, **Then**
   every active bearer sees it and is notified, regardless of jurisdiction.
4. **Given** a non-Super-Admin user, **When** they attempt to publish a post,
   **Then** the action is rejected.

---

### User Story 2 - Bearer shares a post outward (Priority: P2)

A bearer reading a post in their feed shares it to WhatsApp or another app in
one action.

**Why this priority**: Extends the organization's reach beyond the app itself,
but the feature is already useful without it — bearers can still read news.

**Independent Test**: Can be fully tested by opening a published post and using
the share action, confirming the target app receives the post's title and a way
to view the full post.

**Acceptance Scenarios**:

1. **Given** a bearer viewing a published post, **When** they tap Share, **Then**
   their device's native share sheet opens with the post's title and a link.

---

### User Story 3 - Super Admin drafts a post ahead of time (Priority: P3)

Super Admin prepares a post in advance and saves it as a draft, editing it
freely, then publishes it when ready — without any notification going out
before that final publish action.

**Why this priority**: A convenience for planning ahead; Story 1 already covers
immediate publishing, so the organization can operate without this.

**Independent Test**: Can be fully tested by saving a draft, editing it twice,
confirming no bearer sees it or is notified, then publishing it and confirming
the feed/notification behavior from Story 1 fires exactly once.

**Acceptance Scenarios**:

1. **Given** a saved draft, **When** it is edited any number of times, **Then**
   no bearer sees it in their feed and no notification is sent.
2. **Given** a draft, **When** Super Admin publishes it, **Then** it behaves
   exactly as in Story 1 — visible to its target, one notification sent.

### Edge Cases

- What happens when a bearer's post/jurisdiction assignment changes after a post
  was already published? Feed visibility MUST be evaluated against the bearer's
  *current* assignment each time they open the feed, not frozen at publish time
  — a bearer transferred out of the targeted district stops seeing it, and one
  newly transferred in does. The push notification already delivered before the
  change is not retracted.
- What happens when Super Admin tries to target a retired jurisdiction unit
  (feature 001's `RETIRED` status)? The composer MUST NOT allow selecting it.
- What happens when Super Admin needs to correct a published post? They MUST be
  able to edit it in place (correcting a typo doesn't re-notify) or unpublish it
  entirely, removing it from feeds going forward; already-sent notifications
  cannot be recalled.
- What happens when a post targets "everyone" in a state with tens of thousands
  of bearers? Notification delivery MUST be batched/queued rather than sent
  synchronously as part of the publish request, so publishing doesn't time out.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Only Super Admin MAY create, publish, edit, or unpublish a news
  post (v1 scope; opening authorship to State Admin is a documented future
  extension, not built now).
- **FR-002**: A news post MUST have a title, a body supporting basic rich text
  and images, and a target scope of either "everyone" or one or more specific
  jurisdiction units (reusing feature 001's jurisdiction trees).
- **FR-003**: A news post MUST exist in `DRAFT` or `PUBLISHED` state; only the
  transition to `PUBLISHED` triggers feed visibility and notifications.
- **FR-004**: Editing a `DRAFT` any number of times MUST NOT trigger a
  notification or make the post visible to any bearer.
- **FR-005**: On publish, every active bearer whose current assignment falls
  within the post's target scope MUST receive a push notification and see the
  post in their in-app feed.
- **FR-006**: Feed visibility MUST be evaluated against each bearer's current
  assignment at view time, not a fixed snapshot taken at publish time.
- **FR-007**: A bearer MUST be able to share a published post through their
  device's native share mechanism.
- **FR-008**: Super Admin MUST be able to edit a published post without
  re-triggering a notification, and MUST be able to unpublish it, which removes
  it from feeds going forward without recalling notifications already sent.
- **FR-009**: The post composer MUST NOT allow selecting a `RETIRED`
  jurisdiction unit as a target.
- **FR-010**: Notification delivery for a publish MUST be processed as a
  batched/queued job, not synchronously within the publish request.
- **FR-011**: System MUST record who authored, published, edited, or unpublished
  each post, and when, for audit review.

### Key Entities

- **NewsPost**: title, rich-text/image body, target scope (everyone or specific
  jurisdiction units), state (`DRAFT`/`PUBLISHED`), author, published-at
  timestamp, edit/unpublish history.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A published post appears in every in-scope bearer's feed within 60
  seconds of publish.
- **SC-002**: Push notification delivery succeeds for at least 95% of in-scope
  bearers with notifications enabled.
- **SC-003**: Super Admin can compose and publish a post in under 3 minutes.
- **SC-004**: In 100% of audit-sampled cases, a bearer's feed contains only
  posts whose target scope currently includes that bearer's assignment.
- **SC-005**: Sharing a post to an external app takes exactly one tap from the
  feed.

## Assumptions

- News authoring is Super-Admin-only in v1; the project plan documents opening
  it to State Admin as a later, config-only extension.
- Rich text supports basic formatting and images; video attachments are out of
  scope for v1.
- Feed audience is computed live against each bearer's current assignment
  (FR-006), consistent with how features 001 and 002 favor live computation over
  stored, potentially stale snapshots.
- This feature reuses feature 002's shared notification-send service (push +
  SMS/WhatsApp) rather than building a separate delivery mechanism, and reuses
  feature 001's jurisdiction trees for targeting — it adds no new hierarchy.
- Comments/likes on posts are out of scope for v1 (not requested; a plain feed
  is the reasonable default).
