# Feature Specification: Contribution & Events

**Feature Branch**: `002-contribution-events`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "Super admin creates events for collecting money for contribution for party-conducted events. Every bearer should have the option to pay the donation for the event online. Finance Secretary (a post from the Bearer & Hierarchy Register, feature 001) sees finance-related things for their own jurisdiction."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Super Admin opens an event, a bearer pays into it (Priority: P1)

Super Admin creates a fundraising event for a party-conducted programme. Every
bearer within the event's applicable territory sees it on their events screen and
can pay online; a receipt is issued automatically once the payment is verified.

**Why this priority**: This is the entire point of the feature — money moves from
bearer to organization, verifiably. Nothing else in this feature has value without
this loop working end to end.

**Independent Test**: Can be fully tested by creating one event as Super Admin,
paying into it as one bearer, and confirming a verified Contribution record and
receipt exist — delivers value on its own even before the dashboard or reminders
exist.

**Acceptance Scenarios**:

1. **Given** no events exist, **When** Super Admin creates an event with a title,
   purpose, and applicable territory, **Then** every bearer within that territory
   sees it on their events screen.
2. **Given** an open event, **When** a bearer taps Pay and completes a UPI payment,
   **Then** a Contribution record is created only after the payment gateway
   verifies the payment — not from the app's client-side success screen alone —
   and the bearer receives a receipt.
3. **Given** a non-Super-Admin user, **When** they attempt to create or close an
   event, **Then** the action is rejected.
4. **Given** an event has passed its close date, **When** a bearer attempts to
   pay, **Then** the payment is rejected, though the event and its final total
   remain visible.
5. **Given** a bearer's payment request times out on their device after the
   charge actually succeeded, **When** their app retries the same payment
   attempt, **Then** only one Contribution is recorded, not two.

---

### User Story 2 - Admins and Finance Secretaries see the collection picture (Priority: P2)

An admin, or anyone currently holding a post with finance visibility (see
feature 001's Post capability grant), opens the collection dashboard for an event
and sees the total raised against target, and who in their territory has and
hasn't paid.

**Why this priority**: Collecting money without being able to see where it stands
defeats the purpose of running an organized event; this is the second most
important capability after the payment loop itself.

**Independent Test**: Can be fully tested by making a few payments under Story 1,
then opening the dashboard and confirming the totals and paid/unpaid list match
those payments exactly, scoped correctly per viewer.

**Acceptance Scenarios**:

1. **Given** several bearers have paid into an event, **When** Super Admin opens
   its dashboard, **Then** the total raised, target, and a paid/unpaid list by
   post and territory are all shown, computed from the Contribution ledger itself
   — not a stored total anyone could hand-edit.
2. **Given** a District Admin, **When** they open the same event's dashboard,
   **Then** they see only bearers and figures within their own district.
3. **Given** a bearer who is not an admin but currently holds a post with the
   finance-visibility capability (e.g., a Block Finance Secretary), **When** they
   open the dashboard, **Then** they see the figures for their own post's
   jurisdiction without needing separate admin credentials.
4. **Given** an admin, **When** they export the paid/unpaid list, **Then** they
   receive a spreadsheet matching what's on screen.

---

### User Story 3 - Unpaid bearers get reminded before an event closes (Priority: P3)

Bearers who haven't paid into an event they're eligible for get an automatic
reminder before it closes.

**Why this priority**: Improves collection completeness but the event still
functions and can be run manually (an admin nudging people) without this.

**Independent Test**: Can be fully tested by leaving one bearer unpaid on an event
approaching its close date and confirming they receive a reminder while paid
bearers do not.

**Acceptance Scenarios**:

1. **Given** an event nearing its close date, **When** the reminder schedule
   fires, **Then** every unpaid bearer within the event's territory receives a
   push notification and SMS/WhatsApp message; paid bearers do not.
2. **Given** a bearer who paid moments before a scheduled reminder, **When** the
   reminder fires, **Then** they are excluded from that send.

### Edge Cases

- What happens when the payment gateway's webhook never arrives after a bearer
  completes payment on their device (network drop)? The system MUST reconcile via
  a periodic status check against the gateway rather than relying solely on the
  webhook, so a genuinely successful payment isn't lost.
- What happens when a bearer wants to contribute more than once to the same event
  (e.g., topping up)? The system MUST allow it and sum all verified contributions
  for that bearer on that event — it MUST NOT treat a second payment as an error.
- What happens when Super Admin changes an event's target amount after
  contributions already exist? Existing contributions remain valid and unchanged;
  the dashboard recalculates against the new target.
- What happens when a bearer's post assignment (e.g., Finance Secretary) is
  closed? Their finance-visibility access for that jurisdiction ends immediately,
  matching feature 001's rule that capabilities derive only from active
  assignments.
- What happens if two payment attempts for the same bearer/event race each other
  (double-submit from a slow UI)? Each is treated as its own contribution attempt
  guarded by an idempotency key, so a genuine retry of the same attempt cannot
  double-charge, while two deliberate separate payments both succeed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Only Super Admin MAY create a contribution event, with title,
  purpose, optional banner, optional target amount, optional suggested amount per
  post, applicable jurisdiction scope, and open/close dates.
- **FR-002**: Only Super Admin MAY close an event.
- **FR-003**: System MUST show every bearer the events applicable to their post
  and jurisdiction on an events screen.
- **FR-004**: System MUST let a bearer pay toward an open event through the
  payment gateway (UPI, card, or netbanking).
- **FR-005**: System MUST create a Contribution record only from a verified
  payment-gateway confirmation (webhook or reconciled status check), never from
  the client app's reported success alone.
- **FR-006**: System MUST apply an idempotency key per payment attempt so a
  retried client request cannot create a duplicate successful Contribution for
  the same attempt.
- **FR-007**: System MUST reject new payment attempts against an event after its
  close date while continuing to display the event and its final total.
- **FR-008**: System MUST automatically generate and deliver a receipt (in-app
  and SMS/WhatsApp) once a Contribution is verified.
- **FR-009**: System MUST provide a collection dashboard per event showing total
  raised vs. target and a paid/unpaid list broken down by post and jurisdiction.
- **FR-010**: Dashboard totals MUST be computed from the Contribution ledger at
  query time; no stored total may be manually edited.
- **FR-011**: Dashboard visibility MUST be restricted to: Super Admin (all events,
  all jurisdictions); scoped admins (their own jurisdiction subtree); and any
  bearer whose currently active post carries the finance-visibility capability
  (feature 001 FR-018), scoped to that assignment's jurisdiction, independent of
  whether they hold an admin role at all.
- **FR-012**: System MUST send an automatic reminder (push and SMS/WhatsApp) to
  unpaid bearers within an event's scope on a schedule that completes before the
  event's close date.
- **FR-013**: System MUST let admins export an event's paid/unpaid list.
- **FR-014**: System MUST allow multiple verified contributions from the same
  bearer to the same event, summing them for reporting purposes.
- **FR-015**: System MUST record who created or closed each event, for audit
  review.

### Key Entities

- **Event**: A fundraising drive — title, purpose, banner, optional target
  amount, optional suggested amount per post, applicable jurisdiction scope,
  open/close dates, status, created by.
- **Contribution**: One bearer's payment toward one event — amount, payment
  gateway transaction id, idempotency key, verification status, receipt
  reference, verified-at timestamp. Multiple Contributions may exist per
  bearer/event pair.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A bearer can complete a payment for an open event in under 2
  minutes from opening the app.
- **SC-002**: 100% of recorded Contributions trace to a verified payment-gateway
  transaction; zero contributions exist without one, confirmed by audit sampling.
- **SC-003**: A newly verified payment is reflected on the collection dashboard
  within 10 seconds.
- **SC-004**: Reminder messages successfully reach at least 95% of unpaid,
  in-scope bearers before an event's close date.
- **SC-005**: In 100% of test cases, a bearer holding an active finance-visibility
  post can view their jurisdiction's collection figures without separate admin
  credentials.

## Assumptions

- The payment gateway is Razorpay (per the project constitution's platform
  constraints), with UPI as the default payment method alongside card and
  netbanking.
- A "suggested amount per post" set on an event is advisory only; the system does
  not block a bearer from paying more or less than the suggestion in v1.
- Refunds and payment cancellations are out of scope for v1; any refund is
  handled manually outside the app and is a candidate for a future feature.
- Reminder cadence (e.g., mid-period and 24 hours before close) is configurable
  by Super Admin per event, defaulting to a sensible built-in schedule if left
  unset.
- This feature depends on feature 001 (Bearer & Hierarchy Register) for Bearer,
  Post, Assignment, and AdminScope data, and specifically on the Post
  capability-grant mechanism (feature 001 FR-018) to determine finance-visibility
  access for Finance Secretary and any future finance-facing post.
