# RBAC Permission Matrix — Complete Reference

This document lists every **asset** (feature module) in the CMS, the **actions** available on each, what they actually control in the backend, and which system roles have them by default.

---

## 1. `student_profile` — Student Account Management

| Action | What It Controls | Student | Faculty | Admin | SuperAdmin |
|--------|-----------------|---------|---------|-------|------------|
| `view` | View a single student's profile details | ✅ | ✅ | ✅ | ✅ |
| `list` | List/search all student profiles | ❌ | ✅ | ✅ | ✅ |
| `create` | Create own student profile (onboarding) | ✅ | ❌ | ✅ | ✅ |
| `edit` | Edit own student profile details | ✅ | ❌ | ✅ | ✅ |
| `delete` | Delete/remove a student profile | ❌ | ❌ | ✅ | ✅ |
| `approve` | Approve a pending student account | ❌ | ❌ | ✅ | ✅ |
| `reject` | Reject a pending student account | ❌ | ❌ | ✅ | ✅ |

> **Purpose**: Controls who can manage student lifecycle — from onboarding to approval/rejection. Students can only view/edit their *own* profile. Admins can manage all.

---

## 2. `faculty_profile` — Faculty Account Management

| Action | What It Controls | Student | Faculty | Admin | SuperAdmin |
|--------|-----------------|---------|---------|-------|------------|
| `view` | View a single faculty member's profile | ✅ | ✅ | ✅ | ✅ |
| `list` | List/search all faculty profiles | ✅ | ❌ | ✅ | ✅ |
| `create` | Create a faculty profile | ❌ | ✅ | ✅ | ✅ |
| `edit` | Edit a faculty profile | ❌ | ✅ | ✅ | ✅ |
| `delete` | Delete/remove a faculty profile | ❌ | ❌ | ✅ | ✅ |
| `approve` | Approve a pending faculty account | ❌ | ❌ | ✅ | ✅ |
| `reject` | Reject a pending faculty account | ❌ | ❌ | ✅ | ✅ |

> **Purpose**: Same lifecycle as student but for faculty. Students can view/list faculty (to see their teachers). Faculty can view/edit their own.

---

## 3. `role` — RBAC Role Management

| Action | What It Controls | Student | Faculty | Admin | SuperAdmin |
|--------|-----------------|---------|---------|-------|------------|
| `view` | View role details and permissions | ❌ | ❌ | ✅ | ✅ |
| `list` | List all roles in the system | ❌ | ❌ | ✅ | ✅ |
| `create` | Create new custom roles | ❌ | ❌ | ❌ | ✅ |
| `edit` | Edit role permissions | ❌ | ❌ | ❌ | ✅ |
| `delete` | Delete custom roles | ❌ | ❌ | ❌ | ✅ |
| `approve` | Assign roles to users | ❌ | ❌ | ✅ | ✅ |
| `reject` | *(unused currently)* | ❌ | ❌ | ❌ | ✅ |

> **Purpose**: Controls the RBAC system itself. **Critical security boundary** — Admin can view/list roles and assign them, but only SuperAdmin can create/edit/delete roles to prevent privilege escalation.

---

## 4. `notice` — Announcements & Notices

| Action | What It Controls | Student | Faculty | Admin | SuperAdmin |
|--------|-----------------|---------|---------|-------|------------|
| `view` | Read a single notice | ✅ | ✅ | ✅ | ✅ |
| `list` | Browse all published notices | ✅ | ✅ | ✅ | ✅ |
| `create` | Post a new notice/announcement | ❌ | ✅ | ✅ | ✅ |
| `edit` | Edit an existing notice | ❌ | ❌ | ✅ | ✅ |
| `delete` | Delete a notice | ❌ | ❌ | ✅ | ✅ |
| `approve` | Approve a draft notice for publishing | ❌ | ❌ | ✅ | ✅ |
| `reject` | Reject a draft notice | ❌ | ❌ | ✅ | ✅ |

> **Purpose**: Manages the notice board. Students are read-only consumers. Faculty can create notices (e.g., class announcements). Admin controls the full lifecycle.

---

## 5. `complaint` — Grievance & Support Tickets

| Action | What It Controls | Student | Faculty | Admin | SuperAdmin |
|--------|-----------------|---------|---------|-------|------------|
| `view` | View complaint details (own or assigned) | ✅ | ✅ | ✅ | ✅ |
| `list` | List complaints (own for students, all for admins) | ✅ | ✅ | ✅ | ✅ |
| `create` | Submit a new complaint | ✅ | ❌ | ✅ | ✅ |
| `edit` | Edit a complaint's details | ❌ | ❌ | ✅ | ✅ |
| `delete` | Delete a complaint | ❌ | ❌ | ✅ | ✅ |
| `resolve` | Mark a complaint as resolved | ❌ | ✅ | ✅ | ✅ |
| `assign` | Assign a complaint to a faculty/staff member | ❌ | ✅ | ✅ | ✅ |
| `view_private` | View private/confidential complaint details | ❌ | ❌ | ✅ | ✅ |

> **Purpose**: Students file complaints; Faculty can triage (assign/resolve) them; Admin has full control including access to private details and deletion.

---

## 6. `outpass` — Leave/Exit Requests

| Action | What It Controls | Student | Faculty | Admin | SuperAdmin |
|--------|-----------------|---------|---------|-------|------------|
| `create` | Submit a new outpass request | ✅ | ❌ | ✅ | ✅ |
| `view` | View an outpass (own or managed) | ✅ | ✅ | ✅ | ✅ |
| `cancel` | Cancel own pending outpass | ✅ | ❌ | ✅ | ✅ |
| `list` | List all outpasses (own for students, all for faculty/admin) | ✅ | ✅ | ✅ | ✅ |
| `approve` | Approve a student's outpass request | ❌ | ✅ | ✅ | ✅ |
| `reject` | Reject a student's outpass request | ❌ | ✅ | ✅ | ✅ |

> **Purpose**: Students create and track their leave requests. Faculty/Admin approve or reject them. Students can cancel their own pending requests.

---

## 7. `timetable` — Class Schedule Management

| Action | What It Controls | Student | Faculty | Admin | SuperAdmin |
|--------|-----------------|---------|---------|-------|------------|
| `view` | View the timetable (classes, slots) | ✅ | ✅ | ✅ | ✅ |
| `manage` | Create/edit/delete timetable entries | ❌ | ❌ | ✅ | ✅ |

> **Purpose**: Everyone can view the timetable. Only Admin can manage (CRUD) timetable slots and schedules.

---

## 8. `attendance` — Student Attendance Tracking

| Action | What It Controls | Student | Faculty | Admin | SuperAdmin |
|--------|-----------------|---------|---------|-------|------------|
| `view` | View attendance records (own for students) | ✅ | ✅ | ✅ | ✅ |
| `mark` | Mark attendance for a class session | ❌ | ✅ | ✅ | ✅ |

> **Purpose**: Students can only view their own attendance stats. Faculty can mark attendance for their classes.

---

## 9. `mess` — Mess/Cafeteria Management

| Action | What It Controls | Student | Faculty | Admin | SuperAdmin |
|--------|-----------------|---------|---------|-------|------------|
| `view` | View today's menu and mess schedule | ✅ | ✅ | ✅ | ✅ |
| `feedback` | Submit/view/edit/delete mess feedback | ✅ | ✅ | ✅ | ✅ |
| `manage` | Create/edit/delete menus and mess configuration | ❌ | ❌ | ✅ | ✅ |

> **Purpose**: Everyone can view menus and leave feedback. Only Admin can manage the mess configuration and menu entries.

---

## Summary: Role Hierarchy

```
SuperAdmin ⊃ Admin ⊃ Faculty / Student
```

| Role | Scope | Key Restriction |
|------|-------|-----------------|
| **SuperAdmin** | All permissions on all assets | None — full system control |
| **Admin** | All permissions except `role:create`, `role:edit`, `role:delete` | Cannot escalate own privileges by creating/modifying roles |
| **Faculty** | View/action on their domain (complaints, outpasses, attendance) | Cannot manage accounts, roles, or system config |
| **Student** | Self-service only (own profile, own complaints, own outpasses) | Read-only on most assets, can create complaints/outpasses |
