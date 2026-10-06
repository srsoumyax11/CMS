# System Architecture & API Gap Closure Plan

This document establishes the architecture, data models, validation rules, endpoint designs, and phase-by-phase execution plan for closing current API gaps and introducing Audience Groups to the CMS notification system.

---

## 🎯 Executive Summary & Principles
All designs follow strict software engineering best practices:
- **DRY (Don't Repeat Yourself)**: Reusable query scoping dependencies, generic repository patterns, centralized permission constants.
- **KISS (Keep It Simple, Stupid)**: Flat independent saved groups without complex tree hierarchies, straightforward state machines for document requests.
- **SOLID / High Cohesion**: Repository-Service-Controller layer separation, decoupled notifications, single-responsibility permission guards.
- **Auditability**: Explicit tracking of who modified or approved records, and timestamps for all state mutations.

---

## 🏗️ Phase 1: Core Lifecycle & Functional Parity (Items 1 – 4)

### 1. Document & Certificate Requests (End-to-End)
#### Sub-Phases:
- [x] **1.1 Database Schema & Migration**:
  - Table: `document_requests`
    - `id`: `UUID` (PK)
    - `student_id`: `UUID` (FK $\rightarrow$ `users.id`, `ondelete="CASCADE"`)
    - `document_type`: `Enum` (`'bonafide'`, `'noc'`, `'fee_clearance'`, `'character_certificate'`, `'transcript'`, `'other'`)
    - `purpose`: `Text` (Required explanation from student)
    - `status`: `Enum` (`'pending'`, `'approved'`, `'rejected'`, `'ready'`)
    - `urgency`: `Enum` (`'normal'`, `'urgent'`)
    - `processed_by`: `UUID` (FK $\rightarrow$ `users.id`, nullable)
    - `processed_at`: `DateTime` (nullable)
    - `rejection_reason`: `Text` (nullable)
    - `attachment_url`: `String` (nullable)
    - `issued_file_url`: `String` (nullable)
    - `created_at`, `updated_at`: `DateTime`
- [x] **1.2 Repository & Service Layer**:
  - Enforced max 3 concurrent pending requests per student.
  - State machine transition guards (`pending` $\rightarrow$ `approved` | `rejected` | `ready`).
  - Mandatory rejection reason ($\ge 5$ chars) on rejection.
- [x] **1.3 API Routes & RBAC Registration**:
  - Asset: `document`, Actions: `create`, `view`, `list`, `approve`, `reject`, `manage`.
  - Student: `POST /api/documents/requests`, `GET /api/documents/requests/mine`, `GET /api/documents/requests/{id}/download`.
  - Admin/Staff: `GET /api/admin/documents/requests`, `PATCH /api/admin/documents/requests/{id}/approve`, `PATCH /api/admin/documents/requests/{id}/reject`, `PATCH /api/admin/documents/requests/{id}/ready`.
- [x] **1.4 Verification & Testing**:
  - Validated via `tests/test_documents.py` (passed 100%).

---

### 2. Rooms & Infrastructure Relational Model
#### Sub-Phases:
- [x] **2.1 Database Schema & Migration**:
  - Table: `buildings` (`id`, `name`, `code` unique, `building_type`, `total_floors`, `is_active`, timestamps)
  - Table: `rooms` (`id`, `building_id` FK, `room_number`, `floor`, `room_type`, `capacity`, `department_id` FK nullable, `is_active`, timestamps; unique constraint on `(building_id, room_number)`).
- [x] **2.2 Relational Hookups Across System**:
  - `timetable_slots.room_id` $\rightarrow$ FK `rooms.id`.
  - `complaints.building_id`, `complaints.room_id` $\rightarrow$ FKs `buildings.id`, `rooms.id`.
  - `student_profiles.room_id` $\rightarrow$ FK `rooms.id`.
- [x] **2.3 API Endpoints & Repositories**:
  - `GET /api/infrastructure/buildings`, `POST /api/infrastructure/buildings`, `PATCH /api/infrastructure/buildings/{id}`.
  - `GET /api/infrastructure/rooms`, `POST /api/infrastructure/rooms`, `PATCH /api/infrastructure/rooms/{id}`.
- [x] **2.4 Verification**:
  - Validated building creation, room creation, department linkage, uniqueness constraints, and room filtering via `tests/test_infrastructure.py`.

---

### 3. Non-Teaching Staff Role & Lifecycle
#### Sub-Phases:
- [x] **3.1 Enum & Schema Migration**:
  - Add `'staff'` to PostgreSQL `user_type_enum`.
  - Table: `staff_profiles` (`id`, `user_id` FK unique, `department_id` FK nullable, `designation`, `employment_status`, `joining_date`, timestamps).
- [x] **3.2 RBAC Integration**:
  - Asset: `staff_profile`, Actions: `create`, `list`, `view`, `edit`, `delete`.
- [x] **3.3 Service & Admin Endpoints**:
  - `POST /api/admin/staff` (Create staff user account + staff profile).
  - `GET /api/admin/staff` (List with filters).
  - `GET /api/admin/staff/{id}` (Single-record view).
  - `PATCH /api/admin/staff/{id}` (Edit profile).
  - `PATCH /api/admin/staff/{id}/status` (Update account and employment status).
- [x] **3.4 Verification**:
  - Verify staff onboarding and profile lifecycle transitions.

---

### 4. Faculty Management Parity with Student Management
#### Sub-Phases:
- [x] **4.1 Schema & Schema Validation Review**:
  - Inspect `faculty_profiles` and ensure update schema supports designation, course, department, status note.
- [x] **4.2 Service Layer & Endpoints**:
  - `GET /api/admin/faculty/{id}` (Single record with user account + faculty profile details).
  - `PATCH /api/admin/faculty/{id}` (Edit faculty details).
  - `PATCH /api/admin/faculty/{id}/status` (Update account/employment status + status note).
- [x] **4.3 Verification**:
  - Test single faculty retrieve, edit, and status change endpoints.

---

## 📢 Phase 2: Audience Groups & Notification System Expansion

### 🎯 Feature Concept
Audience Groups allow authorized personnel (Admins, HODs, Coordinators) to create reusable, saved target audiences for notices and notifications without picking course, department, year, and hostel separately every time.

**Key Architecture: Independent Snapshot Model (Option 1: Relational Membership Table Confirmed)**
1. An audience group is defined with a set of filter rules (course, department, year, section, hostel, user_types).
2. Upon creation (or explicit re-sync), the filter runs once and populates the `audience_group_members` relational table.
3. The member list is an independent snapshot! Individual members can be manually added or removed (like a WhatsApp group) without altering the filter rules.
4. Filter re-application (`/sync`) is an **explicit, separate action**, never automatic, because it could overwrite manual adjustments.
5. All groups are flat saved groups (e.g., *"BTech CSE all students"*, *"BTech CSE 1st year"*, *"BTech CSE 1st year Section A"*); no nested tree complexity.

#### Sub-Phases:
- [x] **2.1 Database Schema & Migration (Option 1)**:
  - Create `audience_groups` and relational `audience_group_members` tables.
  - Add `target_audience_group_id` foreign key to `notices` table.
- [x] **2.2 RBAC Asset & Permission Registration**:
  - Register asset `audience_group` and actions (`create`, `list`, `view`, `edit`, `delete`, `sync`).
- [x] **2.3 Repository & Dynamic Evaluation Service**:
  - Implement initial filter-based user query resolver.
  - Implement manual add/remove member mutations.
  - Implement explicit filter sync with discrepancy detection (`matches_filter` boolean).
- [x] **2.4 API Routes & Notice Query Integration**:
  - Expose `/api/audience-groups` CRUD, member management, and sync endpoints.
  - Integrate audience group membership into notice feed filtering.
- [x] **2.5 Verification & Testing**:
  - Comprehensive unit and integration tests verifying creation, manual member manipulation, sync diffing, and notice targeting.

### 📦 Data Models

#### 1. `audience_groups`
* `id`: `UUID` (PK)
* `name`: `String(255)` (not null, e.g. "CSE 1st Year Sec A")
* `description`: `Text` (nullable)
* `filter_rules`: `JSONB` (stores filter criteria: `{ "course_id": "...", "department_id": "...", "year": 1, "section": "A", "hostel": "...", "user_types": ["student"] }`)
* `created_by`: `UUID` (FK $\rightarrow$ `users.id`, `ondelete="SET NULL"`)
* `members_updated_at`: `DateTime` (timestamp of when member list was last modified manually or via sync)
* `filter_applied_at`: `DateTime` (timestamp of when the filter was last evaluated)
* `created_at`, `updated_at`: `DateTime`

#### 2. `audience_group_members`
* `id`: `UUID` (PK)
* `group_id`: `UUID` (FK $\rightarrow$ `audience_groups.id`, `ondelete="CASCADE"`)
* `user_id`: `UUID` (FK $\rightarrow$ `users.id`, `ondelete="CASCADE"`)
* `membership_source`: `Enum` (`'filter'`, `'manual'`) — tracks how user entered the group
* `added_by`: `UUID` (FK $\rightarrow$ `users.id`, nullable)
* `added_at`: `DateTime` (default `now`)
* *Constraints*: Unique constraint on `(group_id, user_id)`.
* *Integrity rule*: Deleting an audience group cascades to its memberships, but **never** deletes the user accounts!

#### 3. Notice Model Integration
* `notices.target_audience_group_id`: `UUID` (FK $\rightarrow$ `audience_groups.id`, `ondelete="SET NULL"`, nullable).
* When a notice has `target_audience_group_id` set, the user feed checks:
  `user_id IN (SELECT user_id FROM audience_group_members WHERE group_id = notice.target_audience_group_id)`.
* If `target_audience_group_id` is null, the existing individual filter parameters apply.

### 🧠 Profile Shift & Data Integrity Analysis (Requirement 7)
> **Problem**: What happens when a user's course, department, or year changes after they are already a member of a group that was built from those exact filters?

#### Options Evaluated:
1. **Option 1: Automatic silent removal from the group on profile change.**
   - *Why rejected*: Violates the core requirement that the member list is independent of the filter. It would lead to silent side-effects where a user intentionally kept in a group (e.g. an elective student, a class rep, or a student finishing a backlogged subject) gets mysteriously dropped when an admin edits their student profile.
2. **Option 2: Retain membership unconditionally with zero visibility.**
   - *Why rejected*: While safe against unwanted deletions, the group owner has no visibility into members who no longer match the group's declared criteria.
3. **Option 3: Retain membership + Flag Filter Discrepancies (Recommended & Planned):**
   - The user **stays in the group** until manually removed or until the group owner explicitly runs a Filter Sync.
   - When querying group members (`GET /api/audience-groups/{id}/members`), the API dynamically computes a boolean `matches_filter: bool`.
   - If a student transferred from CSE to ECE, their record in the group displays `matches_filter: false` alongside their current department.
   - When the group owner triggers `POST /api/audience-groups/{id}/sync`, the system returns a preview diff or applies the refresh with an audit log showing: *"X members added, Y stale members removed"*.
   - **Rationale**: Respects the manual snapshot guarantee while preserving administrative clarity and preventing blind data decay.

### 🌐 Endpoints & RBAC Permissions
* **Permission naming**: Asset: `audience_group`, Actions: `create`, `list`, `view`, `edit`, `delete`, `sync`.
  * `audience_group:create`
  * `audience_group:list`
  * `audience_group:view`
  * `audience_group:edit`
  * `audience_group:delete`
  * `audience_group:sync`

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `POST` | `/api/audience-groups` | `audience_group:create` | Create group, store filter rules, and execute filter once to populate members |
| `GET` | `/api/audience-groups` | `audience_group:list` | List saved audience groups with member counts and timestamps |
| `GET` | `/api/audience-groups/{id}` | `audience_group:view` | Fetch group details and filter configuration |
| `GET` | `/api/audience-groups/{id}/members` | `audience_group:view` | Paginated list of members with `membership_source` and `matches_filter` flag |
| `PATCH` | `/api/audience-groups/{id}` | `audience_group:edit` | Update group name, description, or filter rules (without mutating members) |
| `POST` | `/api/audience-groups/{id}/members` | `audience_group:edit` | Manually add a user or batch of users to the group |
| `DELETE` | `/api/audience-groups/{id}/members/{user_id}` | `audience_group:edit` | Manually remove a specific user from the group |
| `POST` | `/api/audience-groups/{id}/sync` | `audience_group:sync` | Explicitly re-evaluate filter rules and refresh the member list |
| `DELETE` | `/api/audience-groups/{id}` | `audience_group:delete` | Delete group (cascades to memberships, leaves users intact) |

---

## 🔒 Phase 3: Correctness, Guardrails & Scoping (Items 5 & 6)

### 5. HOD Assignment Guardrails
#### Sub-Phases:
- [x] **5.1 Validation Logic in `metadata_service.py`**:
  - In `update_department(dept_id, data)`:
    - If `hod_user_id` provided:
      1. Check candidate exists and has `account_status == "active"`.
      2. Verify user has `user_type == "faculty"` and active `faculty_profile`.
      3. Verify `faculty_profile.department_id == dept_id`.
    - If validation fails, raise `HTTP 422 Unprocessable Entity` ("HOD must be an active faculty member belonging to this department").
- [x] **5.2 Testing**:
  - Test valid HOD assignment, cross-department rejection, student assignment rejection, and unassigning HOD.

---

### 6. Role-Scoped Department Visibility Enforcement
#### Sub-Phases:
- [x] **6.1 Scoping Dependency**:
  - Create `get_department_scope(current_user, permissions) -> Optional[UUID]`.
  - Returns `None` for Admin/SuperAdmin.
  - Returns user's department for HODs and lower roles.
- [x] **6.2 Enforce Scoping in Repositories/Services**:
  - Complaints list: Scope to department for non-admins.
  - Outpasses list: Scope to student's department for faculty/HOD.
  - Student list: Scope to department for HOD.
  - Faculty list: Scope to department for HOD.
- [x] **6.3 Testing & Audit Verification**:
  - Verify admin sees all, HOD sees only their department, student sees only their own.

---

## ⚙️ Phase 4: Lifecycle, Facilities & Polish (Items 7 – 10)

### 7. Account Recovery & Token Invalidation
- [x] **7.1 Password Reset Flow**:
  - `POST /api/auth/forgot-password` (Generate OTP, send email).
  - `POST /api/auth/reset-password` (Verify OTP, update password hash).
- [x] **7.2 Refresh Token Revocation**:
  - Table: `revoked_tokens` (`id`, `token_jti`, `expires_at`, `revoked_at`).
  - `POST /api/auth/logout` (Revoke token).
  - `POST /api/auth/refresh` (Check revocation before issuing new tokens).

---

### 8. Fees & Dues + Gate & Visitor Logs (Minimal Pragmatic Models)
- [x] **8.1 Fee & Dues Status**:
  - Table: `fee_dues` (`student_id`, `fee_type`, `amount_due`, `amount_paid`, `status`, `due_date`, `receipt_number`).
  - Endpoints: `GET /api/fees/mine`, `GET /api/admin/fees`, `POST /api/admin/fees/collect`.
- [x] **8.2 Gate & Visitor Logs**:
  - Table: `visitor_logs` (`visitor_name`, `phone`, `purpose`, `person_to_visit_id`, `vehicle_number`, `entry_time`, `exit_time`, `gate_name`, `recorded_by`).
  - Endpoints: `POST /api/gate/visitors/check-in`, `PATCH /api/gate/visitors/{id}/check-out`, `GET /api/gate/visitors`.

---

### 9. Hostel Room Allocation
- [x] **9.1 Allocation Model & Guardrails**:
  - Table: `hostel_allocations` (`student_id`, `room_id`, `bed_number`, `allocated_at`, `vacated_at`, `allocated_by`).
  - Guardrail: Validate room belongs to a `'hostel'` building and current occupancy < capacity.
- [x] **9.2 Endpoints**:
  - `POST /api/admin/hostel/allocations`, `PATCH /api/admin/hostel/allocations/{id}/vacate`, `GET /api/hostel/mine`.

---

### 10. Swagger Docs Tag Cleanup
- [x] **10.1 Cleanup `backend/app/main.py`**:
  - Remove empty duplicate tags (`"Complaints (Student/Public)"`, `"Complaints (Admin/Faculty)"`, `"Admin Outpasses"`, `"Mess (Student/Public)"`, `"Mess (Admin)"`).
  - Align with actual router tag declarations.