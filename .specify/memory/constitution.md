<!--
Sync Impact Report
Version change: 1.0.0 → 1.1.0
Modified principles:
  - I. Configuration Over Hard-Coding — expanded to cover Post capability grants
    (e.g., finance visibility) as configuration, not a hardcoded title check
  - V. Access Scoped to Jurisdiction — expanded with the admin-provisioning rule:
    no bearer self-registration; OTP authenticates existing records only
Added sections: none (expansions only)
Removed sections: N/A
Deferred TODOs: none
Reason: clarified that Super Admin (and scoped admins) are the exclusive source of
new Bearer records — no public self-registration exists — and that a Post may
carry a data-driven capability grant (starting with finance visibility for
Finance Secretary posts) rather than the app special-casing a title string.
Templates checked for alignment:
  - specs/001-bearer-hierarchy-register/spec.md — updated (FR-015–FR-018, new
    acceptance scenario and edge case)
  - specs/001-bearer-hierarchy-register/plan.md — Constitution Check re-verified
  - specs/001-bearer-hierarchy-register/data-model.md — updated (Post.capabilities,
    admin-provisioned Bearer note)
  - specs/001-bearer-hierarchy-register/contracts/api.md — updated (OTP rejection,
    Post capabilities field)
  - specs/001-bearer-hierarchy-register/tasks.md — updated (T010, T017, T025)
  - specs/001-bearer-hierarchy-register/quickstart.md — updated (new validation steps)
  - .github/skills/*/SKILL.md — read constitution at runtime, no edits needed
-->

# Vanigar Ani Bearer Platform Constitution

## Core Principles

### I. Configuration Over Hard-Coding
Posts (Organizer, Secretary, Deputy Secretary, Finance Secretary, and any future
title), jurisdiction types (State, District, Block, Municipality, Town Panchayat,
Parliament Constituency, Assembly Constituency), and the rules mapping which posts
exist at which levels MUST be stored as editable data, not encoded in application
logic. Adding a post or restructuring a jurisdiction tree MUST NOT require a code
deployment. Any special capability a post grants its holder (for example, Finance
Secretary posts seeing finance-related data) MUST be a data-driven grant on the
Post record, not application code that checks a post's title string.
Rationale: the organization's bylaws define posts and territory, and they change on
their own schedule; coupling that structure to code guarantees the software drifts
out of date with the org it serves. The same applies to what a post can see or
do — a future post reorganization should not require a code change to preserve
who sees finance data.

### II. Dual-Hierarchy Integrity
The administrative ladder (State → District → Block/Municipality/Town Panchayat) and
the electoral ladder (State → Parliament Constituency → Assembly Constituency) MUST
be modeled as separate trees, cross-referenced only where a specific post's
jurisdiction rule requires it (e.g., State Secretary → 3 Parliament Constituencies).
Every bearer assignment MUST carry a start date and, when it ends, an end date;
assignments MUST be closed, never deleted, on reassignment.
Rationale: districts and constituencies do not align 1:1 in the real world, and who
held which post and when is itself an organizational record that must survive
reshuffles.

### III. Financial Integrity & Auditability
Every contribution record MUST be linked to a payment gateway transaction ID and
MUST NOT be created, edited, or marked paid by any means other than a verified
gateway callback/webhook. Only the Super Admin role MAY create or close a
contribution event. Any collection figure shown on a dashboard MUST be computed from
the contribution ledger at query time, never stored as a manually editable total.
Rationale: this platform moves member money for the organization's programmes; every
rupee collected must be traceable to a verifiable transaction, with no path for a
figure to be adjusted by hand.

### IV. Privacy by Minimum Collection
Only data required to operate a bearer's post, receive their payments, and deliver
notices to them MAY be collected (name, phone, address, membership number, ID proof,
payment records). Card, UPI, or bank credentials MUST NOT be stored outside the
payment gateway's own vault. All personal data handling MUST comply with India's
Digital Personal Data Protection Act, 2023, including a stated retention period and
a bearer's ability to view and request correction of their own record.
Rationale: the register holds identity and financial data for a large volunteer
base; collecting only what is needed limits what can ever be exposed.

### V. Access Scoped to Jurisdiction
Every admin role (State, District, Block/Municipality/Town Panchayat) MUST be able
to read or write bearer and reporting data only within its own jurisdiction subtree.
This MUST be enforced at the API/data layer, not by hiding UI elements alone.
Super Admin is the only role with cross-jurisdiction reach and the only role that
may create or close contribution events, and Super Admin MUST be able to create a
bearer directly at any level (State, District, Block, Municipality, Town
Panchayat, or constituency) without routing through a lower-level admin first.
There is no public or bearer-facing self-registration: every Bearer profile MUST
be created by an authorized admin, and phone-OTP login MUST succeed only for a
number that already matches an active Bearer record — an unrecognized number is
rejected, not silently turned into a new account.
Rationale: mirrors the real chain of authority in the organization and limits the
damage a compromised or misused account can do. Admin-only provisioning keeps the
register itself — not a public sign-up form — as the single source of truth for
who is actually a bearer.

## Platform & Compliance Constraints

- Bearer-facing mobile app: Flutter, targeting Android and iOS from one codebase.
- Admin console: React + TypeScript, for the bulk hierarchy edits and reports that
  are easier on a desktop browser.
- Backend API: Node.js/NestJS or Django REST over PostgreSQL, chosen for relational
  integrity across the two jurisdiction trees, assignments, and payments.
- Login: phone-number OTP; no password-only accounts.
- Payments: Razorpay, UPI-first, reconciled via webhook per Principle III.
- Notifications: Firebase Cloud Messaging for push, with SMS/WhatsApp fallback for
  OTP and payment receipts, since in-app push cannot be assumed reliable for every
  bearer's device or connectivity.
- Language: Tamil and English MUST both ship at general availability — Tamil is not
  a deferred, post-launch addition.

## Development Workflow & Quality Gates

- The Spec Kit flow (constitution → specify → plan → tasks → implement) governs all
  feature work; no feature skips directly to implementation.
- Every feature spec MUST state which role(s) and jurisdiction scope can trigger it
  before planning starts, per Principle V.
- Any feature touching money (events, contributions, receipts) MUST include a
  reconciliation test against a mocked gateway webhook before merge, per
  Principle III.
- Any feature touching the bearer hierarchy or post assignments MUST include a
  migration/backfill plan for existing assignment records, per Principle II.
- Complexity introduced beyond these principles MUST be justified in the relevant
  spec's Complexity Tracking section rather than silently added.

## Governance

This constitution supersedes ad hoc practice for the Vanigar Ani Bearer Platform.
Amendments require: a written proposal stating the change and its rationale, a
version bump under the policy below, and an update to any spec or template that
references the changed principle.

Versioning policy (semantic versioning):
- MAJOR: backward-incompatible removal or redefinition of a principle.
- MINOR: a new principle or materially expanded guidance is added.
- PATCH: wording, clarification, or non-semantic fixes.

Every `/speckit-plan` review and code review MUST verify compliance with this
constitution. An unresolved conflict blocks merge until it is either resolved in the
implementation or the constitution itself is amended.

**Version**: 1.1.0 | **Ratified**: 2026-08-13 | **Last Amended**: 2026-08-13
