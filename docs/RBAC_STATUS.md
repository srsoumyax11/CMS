# CMS Codebase Status Report

## 1. Existing User Roles
Roles and user types are modeled through both a fixed Enum and a dynamic RBAC table system:

**User Types (`UserType` Enum)**
- `student`
- `faculty`
- `admin`

**System Roles (in `roles` table)**
- **SuperAdmin**: Unrestricted administrative access to all system modules.
- **Admin**: Administrative access excluding role management.
- **Student**: Default role for enrolled students.
- **Faculty**: Default role for active faculty members.

## 2. API Routes & Role Requirements
Authorization is handled dynamically via `require_permission(Perms.XYZ)`. Rather than checking for a strict "Role", endpoints check if the user's role grants them a specific action on a specific asset.

**Admin / System Settings**
- `POST /departments`, `PATCH /departments/{id}`: `department:manage`
- `GET /departments`: Public / Any Authenticated User
- `GET /roles`, `POST /roles`, `PATCH /roles/{id}`: `role:view`, `role:create`, `role:edit`
- `POST /roles/assign`: `role:approve`

**Users / Auth**
- `POST /auth/login`, `POST /auth/register`: Public
- `GET /users/me`, `PATCH /users/me`: Any Authenticated User (`Depends(get_current_user)`)

**Complaints**
- `POST /complaints`: `complaint:create`
- `GET /complaints/mine`: `complaint:view`
- `GET /complaints/all`: `complaint:list`
- `PATCH /complaints/{id}/status`: `complaint:resolve`
- `PATCH /complaints/{id}/assign`: `complaint:assign`

**Mess**
- `GET /mess/menu`: `mess:view`
- `POST /mess/menu`: `mess:manage`
- `POST /mess/feedback`, `POST /mess/optout`: `mess:feedback`

**Outpass**
- `POST /outpass`: `outpass:create`
- `GET /outpass/mine`: `outpass:view`
- `GET /outpass/all`: `outpass:list`
- `PATCH /outpass/{id}/approve`, `reject`, `depart`, `return`: `outpass:approve`

**Attendance & Timetable**
- `GET /timetable/mine`: `timetable:view`
- `POST /timetable`, `PATCH /timetable`: `timetable:manage`
- `POST /attendance/batch`: `attendance:mark`
- `GET /attendance/mine/stats`: `attendance:view`

**Notices**
- `POST /notices`: `notice:create`
- `GET /notices`: `notice:list`

## 3. Database Tables & Relationships
The database is heavily relational with UUID-based primary keys:

- **Users & Profiles:** `users` <- (1:1) -> `student_profiles`, `faculty_profiles`
- **Academic Hierarchy:** `courses` <- (1:M) -> `branches`
- **Departments:** `departments` (flat table, no relations to users currently)
- **RBAC:** `users` <- (M:M) -> `user_roles` -> `roles` <- (M:M) -> `role_permissions` -> `permissions` -> (`assets`, `actions`)
- **Modules:**
  - `complaints` <- (1:M) -> `complaint_status_logs`
  - `outpasses` <- (1:M) -> `outpass_status_logs`
  - `timetable_slots` <- (1:M) -> `attendance_records`
  - `mess_menus`, `mess_feedback`, `mess_opt_outs`
  - `notices`, `notice_reads`
  - `notifications`

## 4. Authentication and Authorization Workflow
- **Authentication (JWT):** Uses `OAuth2PasswordBearer`. Login route generates an Access Token using `jwt.encode` with HS256 and `bcrypt` for password hashing.
- **Middleware/Guards:** Handled via FastAPI `Depends`.
  - `get_current_user` extracts the JWT, verifies it, and fetches the `User`.
  - `require_permission(permission_string)` fetches the user's assigned roles via `user_roles`, joins them to `role_permissions` and `permissions` (Asset + Action), and checks if the user possesses the required permission. If they do not, it throws a `403 Forbidden`.

## 5. Module Status
- **Super Admin**: **Done** (Implemented via RBAC system roles).
- **Admin**: **Done** (Implemented via RBAC).
- **Faculty**: **Done** (Profile and role exist).
- **Student**: **Done** (Profile and role exist).
- **Department**: **Done** (Basic CRUD and Academic/Administrative types are implemented).
- **Access Control**: **Done** (Dynamic RBAC Engine is built).
- **Complaints**: **Done**.
- **Attendance**: **Done**.
- **Notices**: **Done**.
- **Mess**: **Done**.
- **Outpass**: **Done**.
- **Timetable**: **Done**.
- **Hostel**: **In Progress** (Mess and Outpass are done, but room allocation/hostel blocks are not started).
- **HOD**: **Not Started**.
- **Staff**: **Not Started**.
- **Infrastructure**: **Not Started**.
- **Rooms**: **Not Started**.

## 6. Missing Pieces for Role Hierarchy (Super Admin > Admin > HOD > Faculty/Staff > Student)
To support a scoped role hierarchy with department and room-level scoping, the following missing pieces are required:

1. **Department Scoping / Foreign Keys:**
   - The `users` (or profiles) need a foreign key linking them to a `Department` (`department_id`).
   - We need an `HOD` (Head of Department) flag or relationship. Either a role assignment (`UserRole = HOD`) or a direct relationship (`Department.owner_id = User.id`).

2. **Hierarchical Row-Level Security:**
   - Right now, permissions are binary (e.g., you either have `complaint:list` or you don't).
   - If an HOD queries complaints or faculty profiles, the query must be scoped: `where Department.id == current_user.department_id`.
   - The RBAC dependency needs to be aware of "scopes" (Global vs. Department-level).

3. **Staff Role & Profile:**
   - We have `student_profiles` and `faculty_profiles`, but no `staff_profiles` or `Staff` system role.

4. **Infrastructure / Rooms Hierarchy:**
   - Timetable slots currently use a raw `room` string.
   - We need a formal `Room` and `Infrastructure` model (e.g., `buildings` -> `rooms`) so that room allocations and access controls can be mapped formally.
