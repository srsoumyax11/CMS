# College Management System: Architecture and Data Design

Document 1 of 3 | Version 1.0 | October 2026 | Status: planning, nothing built yet

## 1. Purpose and scope

This document explains how the College Management System (CMS) is built: the parts, how they connect, and how the core data is stored.

- Document 1 (this one): architecture and core data
- Document 2: roles, permissions and access control
- Document 3: every feature, the build plan and the master checklist

Scope: one college, web app first, mobile app in phase 2. Main roles: admin, faculty, student, parent, staff. Other roles (HOD, warden, security, placement officer) are created later from the admin panel with no code change.

How to use the checklists: tick a box only when the work is built, tested and merged. If it is only partly done, leave it unticked.

## 2. Key decisions

| Decision | Reason |
| --- | --- |
| Modular monolith | One codebase and one database with clear modules. Easier to build and host than microservices. |
| Role based access control (RBAC) | Every action has a permission code. A role is a bundle of codes. |
| Roles are data, not code | A new role like HOD is made in the admin panel by cloning FACULTY and adding permissions. |
| One role per user | Simple to reason about. Mixed access is solved with a new custom role. |
| Backend checks everything | The frontend only hides buttons. The API always checks. |
| Profile data is separate from login data | users holds login data. Profile tables hold role data. |
| Everything important is logged | audit\_logs records who did what and when. |

## 3. Recommended tech stack

| Layer | Choice | Note |
| --- | --- | --- |
| Frontend | Next.js (React) with Tailwind | One web app for all roles |
| Backend | Node.js with NestJS (Express also works) | NestJS guards map well to permission checks |
| Database | PostgreSQL | UUID keys, JSONB, strong relations |
| ORM | Prisma | Migrations and typed queries |
| Cache | Redis | Permission cache, rate limits, job queue |
| File storage | S3 compatible storage | Documents, templates, attachments |
| Background jobs | BullMQ | Emails, reminders, overdue checks |
| Mobile app | React Native or Flutter (phase 2) | Needed for silent mode on Android |
| Maps | MapLibre GL or Leaflet with OpenStreetMap | Campus data stored as GeoJSON |
| AI | LLM API with tool calling | Campus assistant |
| Hosting | AWS (ECS or EC2, RDS, S3) | Any cloud works |

These are suggestions. The rest of the documents do not depend on the exact stack.

## 4. Architecture

```
Web app / Mobile app
        |
   REST API (/api/v1)
        |
 Auth middleware -> Status check -> Permission guard -> Controller
        |
   Services (business rules, scope filters)
        |
 PostgreSQL | Redis | File storage | Queue workers
```

### 4.1 Modules

| Module | Responsibility |
| --- | --- |
| auth | Signup, login, tokens, 2FA, password reset |
| users | Account data, status, preferences |
| rbac | Roles, permissions, role\_permissions, guard |
| role\_applications | Apply for a role, admin review |
| academic | Courses, departments, subjects, class groups, terms |
| profiles | Student, faculty, staff, parent profiles |
| notice, complaint | Announcements and complaints |
| timetable, attendance | Class schedule and attendance |
| gate\_pass | Short and long gate passes |
| documents | Document types, requests, approvals, issue |
| placement | Placement notices and applications |
| notifications | In-app, email, push |
| settings | System settings and maintenance mode |
| map, ai | Campus map and AI assistant |
| audit | Action log |

### 4.2 Request lifecycle

1. Request arrives with an access token.
2. Auth middleware verifies the token and loads the user.
3. The status check confirms the user status allows this call.
4. The permission guard checks the permission code.
5. The service applies the scope (OWN, LINKED, DEPARTMENT, ALL) to the data.
6. The action runs inside a database transaction.
7. An audit log row is saved and notification events are queued.
8. The response is returned.

## 5. User lifecycle

| Step | users.status | role\_id | Application status |
| --- | --- | --- | --- |
| Sign up | BASE | BASE | none |
| User applies for a role | PENDING | BASE | SUBMITTED |
| Admin asks for changes | REVISION | BASE | NEEDS\_REVISION |
| User resubmits | PENDING | BASE | SUBMITTED |
| Admin approves | ACTIVE | new role | APPROVED |
| Admin rejects | BASE | BASE | REJECTED |
| Disciplinary action | SUSPENDED | unchanged | none |
| Suspension lifted | ACTIVE | unchanged | none |

### 5.1 What each status can do

| Status | Allowed |
| --- | --- |
| BASE | Edit own account, apply for a role |
| PENDING | View own application |
| REVISION | Edit and resubmit the application |
| ACTIVE | Everything the role permits |
| SUSPENDED | Login and read the suspension note only |

### 5.2 Approval step by step

1. The user signs up and gets role BASE.
2. The user picks a role. The form shown depends on roles.profile\_type.
3. On submit, a role\_applications row is saved and the user becomes PENDING.
4. An admin with role\_application.review opens the application.
5. Approve runs one transaction: set users.role\_id, set status ACTIVE, create the profile row, mark the application APPROVED, send a notification.
6. Needs revision sets NEEDS\_REVISION with a review note. The user edits and resubmits.
7. Reject sets REJECTED with a note. The user returns to BASE and may apply again.

A pending role never gives access because role\_id stays BASE until approval.

### 5.3 Application form fields

| profile\_type | Fields |
| --- | --- |
| STUDENT | reg\_no, course, department, admission\_year, current\_year |
| FACULTY | faculty\_code, course, department, join\_year, designation |
| STAFF | staff\_code, department, join\_year, designation |
| PARENT | student email, relation, emergency name, phone, relation |

The form\_data column stores these as JSON. On approval the values are copied into the profile table.

## 6. Core data model

### 6.1 users

| Column | Type | Note |
| --- | --- | --- |
| id | UUID PK |  |
| name | varchar |  |
| email | varchar | unique |
| phone | varchar | unique |
| password\_hash | varchar | argon2 or bcrypt, never plain text |
| role\_id | UUID FK to roles | default BASE |
| status | ENUM | BASE, PENDING, ACTIVE, REVISION, SUSPENDED |
| status\_note | text | reason for revision or suspension |
| two\_factor\_enabled | boolean |  |
| two\_factor\_secret | varchar | encrypted, null when off |
| notification\_enabled | boolean | email and push messages |
| in\_app\_alert\_enabled | boolean | pop-up alerts inside the app |
| last\_login\_at | timestamp |  |
| created\_at, updated\_at, deleted\_at | timestamp | soft delete |

### 6.2 roles

| Column | Type | Note |
| --- | --- | --- |
| id | UUID PK |  |
| code | varchar | unique, for example ADMIN |
| name | varchar | display name |
| description | text |  |
| profile\_type | ENUM | NONE, STUDENT, FACULTY, STAFF, PARENT |
| is\_system | boolean | true means it cannot be deleted |
| is\_assignable | boolean | false for BASE |
| status | ENUM | ACTIVE, INACTIVE |

profile\_type decides which application form and which profile table a role uses. This is how HOD works: HOD has profile\_type FACULTY, so it uses the faculty form and faculty\_profiles with no extra tables.

| Code | profile\_type | System role | Assignable |
| --- | --- | --- | --- |
| BASE | NONE | yes | no |
| ADMIN | NONE | yes | no (given by seed or by another admin) |
| FACULTY | FACULTY | yes | yes |
| STUDENT | STUDENT | yes | yes |
| PARENT | PARENT | yes | yes |
| STAFF | STAFF | yes | yes |
| HOD (later) | FACULTY | no | by admin |
| WARDEN (later) | STAFF | no | by admin |
| SECURITY (later) | STAFF | no | by admin |

### 6.3 role\_applications

| Column | Type | Note |
| --- | --- | --- |
| id | UUID PK |  |
| user\_id | UUID FK |  |
| role\_id | UUID FK | role applied for |
| form\_data | JSONB | fields from section 5.3 |
| status | ENUM | SUBMITTED, NEEDS\_REVISION, APPROVED, REJECTED |
| review\_note | text |  |
| reviewed\_by | UUID FK to users |  |
| submitted\_at, reviewed\_at | timestamp |  |

### 6.4 Profile tables (created on approval)

| Table | Columns |
| --- | --- |
| student\_profiles | user\_id PK/FK, reg\_no (unique), course\_id, department\_id, class\_group\_id (nullable), admission\_year, current\_year, cgpa (nullable) |
| faculty\_profiles | user\_id PK/FK, faculty\_code (unique), course\_id, department\_id, join\_year, designation |
| staff\_profiles | user\_id PK/FK, staff\_code (unique), department\_id, join\_year, designation |
| parent\_profiles | user\_id PK/FK, student\_user\_id FK, relation, emergency\_name, emergency\_phone, emergency\_relation |

For parents, the student email is looked up to fill student\_user\_id. The link should be confirmed by an admin during review.

Staff has no course column because staff rarely belong to a course.

### 6.5 courses and departments

| Table | Columns |
| --- | --- |
| courses | id, code (unique), name, description, duration\_years, status ACTIVE or INACTIVE |
| departments | id, code (unique), name, description, type ACADEMIC or ADMINISTRATIVE, hod\_user\_id (nullable FK), status |

Example: BTECH, Bachelor in Technology, 4 years, ACTIVE. Example: CSE, Computer Science and Engineering, ACADEMIC.

departments.hod\_user\_id points to a user who holds the HOD role. The HOD permissions come from the role, and this column only says which department that person heads.

### 6.6 notifications and audit\_logs

| Table | Columns |
| --- | --- |
| notifications | id, user\_id, type, title, body, link, read\_at, created\_at |
| audit\_logs | id, user\_id, permission\_code, action, target\_type, target\_id, result (ALLOWED or DENIED), ip, created\_at |

Delivery rules: notification\_enabled controls email and push. in\_app\_alert\_enabled controls pop-ups. Critical items (suspension, security, emergency notices) are always shown inside the app.

## 7. Cross-cutting rules

| Area | Rule |
| --- | --- |
| IDs | UUID for every table |
| Timestamps | created\_at and updated\_at on all tables, deleted\_at where records must be kept |
| ENUMs | Stored as strings with a check constraint |
| API | Versioned under /api/v1. Same error shape everywhere: code, message, details |
| Passwords | argon2 or bcrypt, minimum length rule, reset by email link |
| Tokens | Short access token plus rotating refresh token |
| 2FA | TOTP app code, secret stored encrypted |
| Rate limits | Login, signup, password reset, AI messages |
| Files | Private bucket, access by short signed links |
| Backups | Daily database backup, tested restore |

## 8. Suggested folder structure

```
cms/
  apps/
    api/src/
      modules/ (auth, users, rbac, role-applications, academic,
                profiles, notice, complaint, timetable, attendance,
                gate-pass, documents, placement, notifications,
                settings, map, ai, audit)
      common/ (guards, decorators, filters, scope, utils)
      prisma/ (schema.prisma, migrations, seed.ts)
    web/src/ (app, components, features, lib)
    mobile/ (phase 2)
  packages/ (shared types, permission codes)
  docs/
```

Keep all permission codes in one shared file so the API and the web app use the same names.

## 9. Checklist for this document

Tick only when built, tested and merged.

- [ ] Tech stack confirmed
- [ ] Repository, folder structure and CI created
- [ ] Migrations for users, roles, role\_applications
- [ ] Migrations for profile tables, courses, departments
- [ ] Migrations for notifications and audit\_logs
- [ ] Seed script for system roles and the first admin
- [ ] Login with access token, refresh token and 2FA working
- [ ] Request pipeline (auth, status check, permission guard, audit) working
- [ ] Role application flow works end to end (apply, revise, approve, reject)
- [ ] Suspended users are blocked correctly
- [ ] Backup and restore tested
