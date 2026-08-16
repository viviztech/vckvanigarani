# Feature Specification: Bearer & Hierarchy Register

**Feature Branch**: `001-bearer-hierarchy-register`

**Created**: 2026-08-13

**Status**: Draft

**Input**: User description: "Manage office bearers from state to district, block/municipality/town panchayat level: Organizer, Finance Secretary, Deputy Secretary at every level, plus State Secretary and State Deputy Secretary at state level. Each post can have multiple people holding it. State Secretary is assigned to 3 Parliament Constituencies; State Deputy Secretary is assigned to 1 Parliament Constituency (which comprises about 3 Assembly Constituencies). This is the foundation register other features (contribution events, news) target by post and jurisdiction."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Register a bearer and assign them to a post and territory (Priority: P1)

An admin (Super Admin, or a State/District/local admin acting within their own
jurisdiction) adds a new office bearer's profile and assigns them to a post — for
example, District Secretary for a specific district, or State Secretary for three
named Parliament Constituencies — so the bearer immediately shows up correctly
placed in the organization.

**Why this priority**: Nothing else in the platform works without an accurate
register of who holds which post where — contribution events and news both target
bearers by post and jurisdiction resolved here.

**Independent Test**: Can be fully tested by creating one bearer profile, assigning
them to one post and jurisdiction, and confirming they appear correctly filed under
that post and territory — delivers value on its own as a digital bearer register,
even before other features exist.

**Acceptance Scenarios**:

1. **Given** an empty register, **When** an admin creates a bearer profile and
   assigns them as District Finance Secretary for District X, **Then** the bearer
   appears as an active holder of that post for District X.
2. **Given** a post that already has one holder in a territory, **When** an admin
   assigns a second person to the same post and territory, **Then** both appear as
   active concurrent holders.
3. **Given** an admin assigning a State Secretary, **When** they select three
   Parliament Constituencies as the jurisdiction, **Then** the assignment is saved
   covering exactly those three constituencies.
4. **Given** an admin assigning a State Deputy Secretary, **When** they select one
   Parliament Constituency, **Then** the assignment automatically covers that
   constituency's Assembly Constituencies.
5. **Given** a bearer currently holding a post, **When** an admin ends their term and
   assigns a replacement, **Then** the original assignment is marked closed with an
   end date (not deleted) and the new assignment starts, both visible in the
   bearer's and the post's history.
6. **Given** Super Admin is creating a bearer, **When** they choose to place the
   bearer directly at District, Block, Municipality, or Town Panchayat level (not
   just State), **Then** the bearer is created and assigned at that level directly,
   without requiring the corresponding District or local admin to do it.
7. **Given** nobody has an account yet for a given phone number, **When** that
   number is used to request an OTP login, **Then** the system rejects the login —
   there is no bearer-facing sign-up; an admin must create the profile first.

---

### User Story 2 - Browse and search the bearer directory (Priority: P2)

An admin or a bearer looks up who holds a given post in a given territory — for
example, "who is the current Block Organizer for this block" or "list all State
Secretaries and their assigned Parliament Constituencies."

**Why this priority**: A register nobody can search is not useful day-to-day;
this is the primary way the organization actually uses the data entered in Story 1.

**Independent Test**: Can be fully tested by searching/filtering the directory by
post, level, and territory and confirming the results match what was assigned,
independent of whether contribution or news features exist yet.

**Acceptance Scenarios**:

1. **Given** bearers assigned across several districts, **When** a user filters the
   directory by District X, **Then** only bearers assigned within District X (and
   its blocks/municipalities/town panchayats) are shown.
2. **Given** a bearer holds posts at more than one point in history, **When** their
   profile is opened, **Then** both their current post(s) and past (closed)
   assignments are visible.
3. **Given** a District Admin for District X, **When** they search the directory,
   **Then** they cannot see or edit bearers assigned outside District X.

---

### User Story 3 - See where a post is unfilled (Priority: P3)

An admin reviewing the organization before a reshuffle or election cycle checks
which constituencies or local bodies currently have nobody holding a given post.

**Why this priority**: Valuable for planning and oversight, but the organization
can operate on Stories 1–2 alone while this is added.

**Independent Test**: Can be fully tested by selecting a post, comparing the full
list of jurisdiction units of the relevant type against active assignments, and
confirming the unfilled ones are listed — independent of the other stories once
Story 1's data exists.

**Acceptance Scenarios**:

1. **Given** a state with 39 Parliament Constituencies and State Secretaries
   assigned to only some of them, **When** an admin runs the coverage report for
   "State Secretary", **Then** every Parliament Constituency with no active State
   Secretary is listed.
2. **Given** every jurisdiction unit of a type has an active holder for a post,
   **When** the coverage report is run, **Then** it reports no gaps.

### Edge Cases

- What happens when an admin tries to assign a bearer to a jurisdiction outside
  their own scope (e.g., a District Admin assigning someone to a different
  district)? The system MUST reject the assignment.
- What happens when two different State Secretaries end up assigned to the same
  Parliament Constituency (overlapping coverage)? The system MUST allow it (useful
  during a handover) but MUST flag it as an overlap on the coverage report rather
  than silently hiding it.
- What happens when a jurisdiction unit (e.g., a Town Panchayat) is renamed or
  merged while it still has active assignments? Active assignments MUST be
  preserved and re-point to the updated unit record, not silently dropped.
- What happens when an admin searches for a bearer by a common name shared by
  multiple people? The system MUST show all matches with enough distinguishing
  detail (post, territory, phone) to tell them apart.
- What happens when a bearer profile is marked inactive/removed? Their past
  assignment history MUST remain visible in reports; they MUST stop appearing as
  a current holder of any post.
- What happens when someone tries to log in with a phone number that has no
  matching Bearer record? The system MUST reject the login with a message
  directing them to contact their admin — it MUST NOT create an account.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let a Super Admin define, edit, and deactivate Post
  titles (e.g., Organizer, Finance Secretary, Deputy Secretary, Secretary) and the
  levels each post is valid at, without requiring a software change.
- **FR-002**: System MUST maintain two independent jurisdiction hierarchies: an
  administrative tree (State → District → Block/Municipality/Town Panchayat) and an
  electoral tree (State → Parliament Constituency → Assembly Constituency).
- **FR-003**: System MUST let a Super Admin create and edit jurisdiction units in
  both trees (add/rename a district, block, municipality, town panchayat,
  parliament constituency, or assembly constituency).
- **FR-004**: System MUST let an authorized admin create a bearer profile capturing
  name, phone number, photo, address, membership number, ID proof reference, and
  status.
- **FR-005**: System MUST let an authorized admin assign a bearer to a post plus one
  or more jurisdiction units, recording a start date for the assignment.
- **FR-006**: System MUST allow a single post + jurisdiction combination to have
  more than one active bearer at the same time.
- **FR-007**: System MUST close an assignment by recording an end date rather than
  deleting it when a bearer is replaced or removed from a post, preserving full
  assignment history.
- **FR-008**: System MUST require a State Secretary assignment's jurisdiction to be
  one or more Parliament Constituencies, and a State Deputy Secretary assignment's
  jurisdiction to resolve from exactly one Parliament Constituency to its Assembly
  Constituencies.
- **FR-009**: System MUST let admins search and filter the bearer directory by post,
  level, and jurisdiction.
- **FR-010**: System MUST restrict each admin (State, District, Block/Municipality/
  Town Panchayat) to viewing and editing bearer and assignment records only within
  their own jurisdiction subtree; only Super Admin has cross-jurisdiction access.
- **FR-011**: System MUST restrict edits to Post definitions and jurisdiction-tree
  structure to Super Admin; scoped admins may only create/close assignments within
  their own jurisdiction using the existing structure.
- **FR-012**: System MUST generate a coverage report for a selected post, listing
  every jurisdiction unit of the relevant type with zero active bearers.
- **FR-013**: System MUST flag, on the coverage report, any jurisdiction unit
  covered by more than one active bearer of the same post (overlap), without
  blocking the assignment that caused it.
- **FR-014**: System MUST record who created or closed each assignment and when,
  for audit review.
- **FR-015**: System MUST NOT offer any public or bearer-facing self-registration
  flow. Every Bearer profile is created exclusively by an authorized admin
  (Super Admin or a scoped admin acting within their own jurisdiction).
- **FR-016**: Phone-OTP login MUST succeed only when the phone number matches an
  existing active Bearer record; login attempts from unrecognized numbers MUST be
  rejected rather than treated as a new signup.
- **FR-017**: Super Admin MUST be able to create a bearer and their first
  assignment directly at any jurisdiction level or type — State, District, Block,
  Municipality, Town Panchayat, Parliament Constituency, or Assembly Constituency
  — in one action, without requiring a lower-level admin to act first.
- **FR-018**: A Post definition MUST support an optional capability grant (for
  example, "finance visibility") that applies to whoever actively holds that
  post, scoped to their assignment's jurisdiction. This grant MUST be data on the
  Post record and configurable by Super Admin, not a hardcoded check against a
  post's title (e.g., the string "Finance Secretary").

### Key Entities

- **Bearer**: A person holding one or more posts — name, phone, photo, address,
  membership number, ID proof reference, active/inactive status.
- **Post**: A title such as Organizer, Secretary, Deputy Secretary, or Finance
  Secretary, plus the organizational levels it is valid at and any capability
  grant it carries (e.g., finance visibility). Editable by Super Admin.
- **Jurisdiction Unit**: One node in either the administrative tree (State,
  District, Block, Municipality, Town Panchayat) or the electoral tree (State,
  Parliament Constituency, Assembly Constituency), with a parent reference.
- **Assignment**: Links one Bearer to one Post, with a start date and optional end
  date, and covers one or more Jurisdiction Units.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can register a new bearer and complete their first post
  assignment in under 3 minutes.
- **SC-002**: Directory search returns results within 2 seconds across a statewide
  register of at least 10,000 bearers.
- **SC-003**: 100% of closed assignments retain a full, unaltered history record —
  zero historical assignments are lost when a bearer is reassigned, verified by
  audit sampling.
- **SC-004**: The coverage report identifies every unfilled jurisdiction for a
  selected post with zero false negatives against a manually verified sample.
- **SC-005**: In 100% of access-control test cases, a scoped admin (State,
  District, or local) cannot view or edit a bearer or assignment record outside
  their own jurisdiction subtree.

## Assumptions

- The initial post list is: Organizer, Finance Secretary, and Deputy Secretary at
  every level from District downward, plus Secretary, Deputy Secretary, and
  Finance Secretary at State level. The exact final list is an open decision from
  the project plan; because posts are configuration (not code), it can be adjusted
  after launch without rework.
- A person may hold more than one post at the same time (e.g., during a temporary
  officiating arrangement); the system allows this rather than blocking it.
- Authoritative District / Block / Municipality / Town Panchayat and Parliament /
  Assembly Constituency master data will be sourced externally (Election
  Commission of India and the Tamil Nadu local-body directory) and imported in
  bulk rather than typed in one at a time.
- "Removing" a bearer means marking their profile inactive, not deleting it, so
  historical assignment records are preserved.
- This register is a dependency for the Contribution & Events feature and the
  News feature, both of which will target bearers by the post and jurisdiction
  data captured here.
- Bearers do not self-register under any circumstance; every profile traces back
  to an admin action, which doubles as the audit trail for "who is actually a
  bearer" (FR-015).
- The finance-visibility capability grant (FR-018) is laid down on the Post
  record by this feature, but the finance data/screens it will control (e.g.,
  contribution ledgers) are out of scope here and belong to the Contribution &
  Events feature.
