# College Management System: Features, Build Plan and Master Checklist

Document 3 of 3 | Version 1.0 | October 2026 | Status: planning, nothing built yet

This document specifies each feature, then gives the build order, the testing plan and the master checklist. Permission codes come from document 2. Core tables come from document 1. Every box in this document starts unticked. Tick a box only when the work is built, tested and merged. Partly done means unticked.

## 1. Feature overview

| Feature | Main users | Phase |
| --- | --- | --- |
| Role application and approval | All new users, admin | 3 |
| Courses, departments, profiles | Admin, all roles | 3 |
| Notices | Admin, faculty, all roles | 4 |
| Complaints | All roles, admin, HOD | 4 |
| Timetable | Admin, HOD, faculty, students | 5 |
| Attendance | Faculty, students, parents | 5 |
| Gate pass (short and long) | Students, approvers, security | 6 |
| Documents (apply, approve, issue) | All roles, approvers | 6 |
| Placement | Placement officer, students | 6 |
| System settings and maintenance mode | Admin | 7 |
| Silent mode (per user) | All roles | 7 |
| Campus map | All roles | 8 |
| AI assistant | All roles | 8 |

## 2. Academic base data

These tables support timetable, attendance and placement.

| Table | Columns |
| --- | --- |
| class\_groups | id, course\_id, department\_id, year, section, status |
| subjects | id, code (unique), name, department\_id, credits, status |
| academic\_terms | id, name, start\_date, end\_date, is\_current |
| holidays | id, date, name, applies\_to (ALL or department\_id) |

student\_profiles.class\_group\_id links a student to a class group. Admin can set it during approval.

## 3. Notices

| Table | Columns |
| --- | --- |
| notices | id, title, body, category, audience (JSON: roles, departments, courses, years), pinned, publish\_at, expires\_at, status DRAFT or PUBLISHED or EXPIRED, created\_by |
| notice\_attachments | id, notice\_id, file\_url, name |
| notice\_reads | notice\_id, user\_id, read\_at |

Flow: author creates draft, publishes, system queues notifications for the audience, users read, notice expires on its date.

Permissions: notice.create, edit, delete, publish, view, list. Rule: a user with DEPARTMENT scope can only target their own department.

## 4. Complaints

| Table | Columns |
| --- | --- |
| complaints | id, user\_id, category, title, description, status OPEN or IN\_PROGRESS or RESOLVED or REJECTED or REOPENED, assigned\_to, resolution\_note, resolved\_by, resolved\_at, created\_at |
| complaint\_comments | id, complaint\_id, user\_id, body, created\_at |
| complaint\_attachments | id, complaint\_id, file\_url |

Flow: user creates, system routes by category (for example hostel to warden, academic to HOD), assignee comments and resolves with a note, user can reopen once within a set number of days.

Permissions: complain.create, view, list, resolve, delete. Rules: the creator always sees their own complaint. Resolve needs the code and the right scope. Delete is a soft delete and is logged.

## 5. Timetable

| Table | Columns |
| --- | --- |
| timetable\_slots | id, term\_id, class\_group\_id, subject\_id, faculty\_user\_id, room\_location\_id, day\_of\_week (1 to 7), start\_time, end\_time, status |
| timetable\_exceptions | id, slot\_id, date, type CANCELLED or SUBSTITUTE or EXTRA, substitute\_faculty\_id, note |

Rules:

- No clash allowed for the same faculty, the same room or the same class group at the same time. The service checks this on create and edit.
- Rooms come from map\_locations of type CLASSROOM or LAB, so the timetable and the map share one room list.
- Holidays and exceptions override the weekly slot for that date.
- Students see slots of their class group. Faculty see slots where they teach. HOD and admin see the department or all.

Permissions: timetable.list, create, edit, delete.

## 6. Attendance

| Table | Columns |
| --- | --- |
| attendance\_sessions | id, slot\_id, date, taken\_by, status OPEN or LOCKED, created\_at |
| attendance\_records | id, session\_id, student\_user\_id, status PRESENT or ABSENT or LATE or EXCUSED |

Flow: faculty opens today's slot, marks each student, saves. The session locks after a set time (setting: attendance.edit\_window\_hours). After lock, only a user with attendance.edit can change it, and the change is logged.

Rules:

- Only the assigned or substitute faculty can mark a slot.
- Percentage report per student and per subject.
- A shortage alert goes to the student and the linked parent when attendance falls below a limit (setting: attendance.min\_percent).
- Parents see only their linked student (LINKED scope).

Permissions: attendance.mark, view, list, edit, report.

## 7. Gate pass

| Table | Columns |
| --- | --- |
| gate\_passes | id, student\_user\_id, type SHORT or LONG, reason\_category (TEA, MARKET, MEDICAL, HOLIDAY, OTHER), reason, destination, out\_at, expected\_return\_at, from\_date, to\_date, status, approved\_by, review\_note, reviewed\_at, pass\_code, actual\_out\_at, actual\_return\_at, marked\_out\_by, marked\_in\_by, parent\_notified |

Status values: REQUESTED, APPROVED, REJECTED, CANCELLED, OUT, RETURNED, OVERDUE, EXPIRED.

| Type | Use | Dates | Approver permission |
| --- | --- | --- | --- |
| SHORT | Tea, market, a few hours | Same day, out time and return time | gate\_pass.approve\_short |
| LONG | Holiday or home visit | From date to date | gate\_pass.approve\_long |

Flow:

1. Student requests with gate\_pass.request\_short or request\_long.
2. Approvers with the matching approve code are notified.
3. Approve creates a pass\_code (and a QR code).
4. Security scans the code and marks exit (gate\_pass.mark\_exit). Status becomes OUT.
5. On return, security marks return. Status becomes RETURNED.
6. A background job marks late passes OVERDUE and notifies the approver and, for long passes, the parent.

Rules (all values are settings):

- Maximum short passes per week.
- No new pass while another pass is active or while the student is suspended.
- Long pass can require parent consent (gate\_pass.long\_requires\_parent\_consent).
- Unused approved passes expire at the end of the date range.

## 8. Documents

| Table | Columns |
| --- | --- |
| document\_types | id, code, name, description, template\_file\_url, fields\_schema (JSON), approval\_steps (JSON: ordered list of role codes), fee, status |
| document\_requests | id, type\_id, user\_id, form\_data (JSON), status SUBMITTED or IN\_REVIEW or NEEDS\_REVISION or APPROVED or REJECTED or ISSUED, current\_step, issued\_file\_url, verify\_code, issued\_at |
| document\_approvals | id, request\_id, step\_no, approver\_user\_id, decision, note, decided\_at |

Examples of types: bonafide certificate, no objection certificate, ID card request, transcript request.

Flow:

1. Admin creates a document type, uploads the template and sets the approval steps (document.create\_type, document.upload\_template).
2. User applies with the form (document.apply).
3. Step 1 approver reviews. The approver must have the role named in the step and the document.approve permission with the right scope.
4. After the last step, the system fills the template with the form data and creates a PDF (document.issue).
5. The PDF has a verify\_code and a QR link so anyone can check it is real.
6. The user downloads it. The request is marked ISSUED.

Rules: a request can be sent back for revision at any step. Each decision is logged. Only the owner and the approvers can see a request.

## 9. Placement

| Table | Columns |
| --- | --- |
| placement\_notices | id, company, title, description, job\_type, package\_text (optional), eligible\_course\_ids, eligible\_department\_ids, min\_cgpa, passout\_year, last\_date, drive\_date, status DRAFT or PUBLISHED or CLOSED, created\_by |
| placement\_applications | id, notice\_id, student\_user\_id, resume\_url, status APPLIED or SHORTLISTED or REJECTED or SELECTED, updated\_by |

Flow: officer creates and publishes, eligible students are notified, students apply, officer updates statuses, students see their own status.

Rules: the apply call checks eligibility (course, department, cgpa, year, last date). A student cannot apply twice. Permissions: placement.create, edit, delete, list, view, apply, view\_applicants.

## 10. System settings (college-wide)

System settings are for the whole system and only admin changes them. Examples: email setup and maintenance mode.

| Table | Columns |
| --- | --- |
| system\_settings | key (unique), value (JSON), group, is\_secret, is\_public, updated\_by, updated\_at |

| Group | Example keys |
| --- | --- |
| email | email.smtp\_host, email.smtp\_user, email.smtp\_password (secret, encrypted), email.from\_address |
| maintenance | maintenance.enabled, maintenance.message |
| security | security.require\_2fa\_roles, security.session\_minutes, security.password\_min\_length |
| academic | academic.current\_term\_id, attendance.min\_percent, attendance.edit\_window\_hours |
| gate\_pass | gate\_pass.max\_short\_per\_week, gate\_pass.long\_requires\_parent\_consent |
| features | silent\_mode.feature\_enabled, ai.enabled, ai.daily\_message\_limit, map.enabled |
| branding | college name, logo, contact details |

Rules:

- Permissions: system\_setting.view and system\_setting.manage.
- Secret values are encrypted and never returned in full to the screen.
- Maintenance mode: when on, the API returns 503 with the message to everyone except ADMIN.
- Settings are cached in Redis and cleared when changed. Every change is logged with old and new value.

## 11. Silent mode (per user)

Silent mode is a personal preference, not a system setting. A user turns it on for themselves, and their phone goes silent during class hours. Admin cannot force it on. Admin can only switch the whole feature off with silent\_mode.feature\_enabled.

| Table | Columns |
| --- | --- |
| user\_silent\_settings | user\_id PK/FK, enabled, mode ENUM(SILENT, VIBRATE, DND), source ENUM(TIMETABLE, CUSTOM, BOTH), minutes\_before, minutes\_after, allow\_emergency, custom\_ranges (JSON), updated\_at |

Where class hours come from:

| User | Source |
| --- | --- |
| Student | timetable\_slots of their class group |
| Faculty | timetable\_slots where they teach |
| Staff, parent | custom\_ranges only |

The schedule is built from slots, minus holidays and cancelled classes, plus extra classes and substitutes.

API:

| Call | Purpose |
| --- | --- |
| GET /me/silent-settings and PUT /me/silent-settings | Read and change the preference |
| GET /me/silent-schedule?date= | Returns the merged time ranges for a day |
| GET /me/silent-calendar.ics?token= | Private calendar feed of class hours |

What can really happen on each device:

| Platform | Method |
| --- | --- |
| Web app | A browser cannot change the phone volume. It can only hide the app's own pop-up alerts during class hours |
| Android app | The user grants Do Not Disturb access once. The app syncs the schedule and switches the phone mode at start and end times using scheduled work |
| iPhone app | Apps cannot change the ringer. The user adds an automation or Focus that starts from the calendar feed above |

Platform limits change between OS versions, so check the current Android and iOS rules before building phase 7.

Rules: allow\_emergency lets emergency notices still alert. Sync the schedule daily and after any timetable change. If the sync fails, keep the last known schedule.

## 12. Campus map

| Table | Columns |
| --- | --- |
| map\_locations | id, code, name, type (BUILDING, CLASSROOM, LAB, HOSTEL, LIBRARY, CANTEEN, GATE, OFFICE, GROUND, PARKING, OTHER), parent\_id, floor, latitude, longitude, geometry (GeoJSON), description, image\_url, is\_public, status |
| map\_paths | id, from\_location\_id, to\_location\_id, distance\_m, path\_geojson, accessible |

Features:

- Map view with layers by type, search and a detail card for each place.
- Walking route between two places using the map\_paths graph (shortest path).
- Rooms link to the timetable, so a student can tap a class and see the room.
- Indoor floors can come later.

Build notes: draw the campus once as GeoJSON from OpenStreetMap or a satellite image, then keep it editable by admin. Permissions: map.view, map.edit, map.manage.

## 13. AI assistant

The AI assistant answers questions about the campus and the user's own college data, in a chat panel.

| Table | Columns |
| --- | --- |
| ai\_conversations | id, user\_id, title, created\_at |
| ai\_messages | id, conversation\_id, role, content, tool\_calls (JSON), created\_at |

How it works:

1. The user sends a message.
2. The backend sends it to the LLM API with a system prompt and a list of tools.
3. The model asks for a tool when needed. The backend runs the tool as the logged-in user, through the normal permission guard.
4. The tool result goes back to the model, which writes the answer.

Starting tools (read only):

| Tool | Purpose |
| --- | --- |
| search\_location | Find a place on the map |
| get\_route | Walking route between two places |
| get\_my\_timetable and get\_next\_class | The user's own schedule |
| search\_notices | Notices for the user |
| get\_gate\_pass\_status | The user's own passes |
| get\_document\_status | The user's own requests |

Rules:

- Every tool uses the user's permissions, so the AI can never show data the user cannot see.
- Phase 1 has no write actions. If writes are added later, the user must press a confirm button first.
- Do not send passwords, 2FA secrets or other people's data to the model. Send the minimum needed.
- Daily message limit per user from ai.daily\_message\_limit. Rate limit and cost alerts are required.
- Tool calls are logged to audit\_logs.
- Permissions: ai\_assistant.use and ai\_assistant.manage. Check the model provider's data terms before launch.

## 14. Build phases

The time shown is a rough guess for one developer working part time. Adjust after phase 1.

| Phase | Name | Scope | Rough time |
| --- | --- | --- | --- |
| 0 | Foundation | Repo, CI, database, environments, base app | 1 week |
| 1 | Auth and users | Signup, login, tokens, 2FA, reset, preferences | 2 weeks |
| 2 | RBAC | Roles, permissions, guard, cache, role admin UI, audit | 2 to 3 weeks |
| 3 | Onboarding | Courses, departments, role applications, profiles | 2 to 3 weeks |
| 4 | Communication | Notifications, notices, complaints | 2 weeks |
| 5 | Academics | Subjects, class groups, timetable, attendance | 3 weeks |
| 6 | Campus services | Gate pass, documents, placement | 4 weeks |
| 7 | Settings and silent mode | System settings, maintenance, silent mode, calendar feed, mobile sync | 3 weeks |
| 8 | Map and AI | Map data, routes, assistant | 3 to 4 weeks |
| 9 | Hardening and launch | Security review, load test, backups, pilot, training | 2 to 3 weeks |

Build each phase in this order: tables, permissions, API, tests, screens, then update this checklist.

## 15. Testing plan

| Type | What it covers |
| --- | --- |
| Unit tests | Permission engine, scope filters, clash checks, eligibility rules |
| Integration tests | Each endpoint with each role (allow and deny) |
| Flow tests | Apply role to approval, gate pass request to return, document apply to issue |
| Security tests | Changing ids in URLs, expired tokens, suspended users, injection, file access |
| Load test | Login, timetable, attendance marking at class change time |
| User testing | A small pilot with one department before the whole college |

Definition of done for any item: code merged, tests passing, permission guard in place, audit log written, documented, deployed to staging and checked by hand.

## 16. Launch and operations

- Three environments: dev, staging, production.
- Secrets in a secret manager, never in the repo.
- Database migrations run by the pipeline. Rollback plan written.
- Daily backups, restore tested every month.
- Logs, error alerts and uptime monitoring.
- Admin guide and short role-wise user guides.
- Privacy rules for student data: keep only what is needed, restrict exports, set a retention period.

## 17. Master checklist

All items are unticked. Tick only when done as defined in section 15.

### Phase 0: Foundation

- [ ] Repository, branches and CI pipeline
- [ ] Dev and staging environments
- [ ] Database, ORM and migration setup
- [ ] Base API and web app running

### Phase 1: Auth and users

- [ ] Signup and login
- [ ] Access and refresh tokens
- [ ] Password reset by email
- [ ] 2FA setup and login
- [ ] Notification and in-app alert preferences
- [ ] Login rate limiting

### Phase 2: RBAC

- [ ] Roles and permissions tables and seed
- [ ] Permission guard, scopes and cache
- [ ] Role list, editor and clone screens
- [ ] Audit logs and audit view
- [ ] HOD role created and tested

### Phase 3: Onboarding

- [ ] Courses and departments screens
- [ ] Role application forms for student, faculty, staff and parent
- [ ] Admin review: approve, revise, reject
- [ ] Profile tables created on approval
- [ ] Suspend and restore users

### Phase 4: Communication

- [ ] Notification service (in-app and email)
- [ ] Notices with targeting and read tracking
- [ ] Complaints with routing, comments and resolve

### Phase 5: Academics

- [ ] Subjects, class groups, terms, holidays
- [ ] Timetable with clash checks and exceptions
- [ ] Attendance marking, locking and reports
- [ ] Shortage alerts to student and parent

### Phase 6: Campus services

- [ ] Short gate pass flow
- [ ] Long gate pass flow
- [ ] Gate scan screen for security
- [ ] Overdue job and alerts
- [ ] Document types, templates and approval steps
- [ ] Document apply, approve and PDF issue with verify code
- [ ] Placement notices, eligibility and applications

### Phase 7: Settings and silent mode

- [ ] System settings screen with secret handling
- [ ] Maintenance mode
- [ ] Silent settings API and schedule API
- [ ] Calendar feed
- [ ] Android app silent mode sync
- [ ] iPhone automation guide
- [ ] Web fallback that hides in-app alerts

### Phase 8: Map and AI

- [ ] Campus GeoJSON and location screens
- [ ] Map view, search and detail cards
- [ ] Walking routes
- [ ] AI chat panel and conversation storage
- [ ] AI tools with permission checks
- [ ] AI limits, logging and cost alerts

### Phase 9: Hardening and launch

- [ ] Route coverage and role matrix tests passing
- [ ] Security review
- [ ] Load test
- [ ] Backup and restore drill
- [ ] Monitoring and alerts
- [ ] Admin guide and user guides
- [ ] Pilot with one department
- [ ] Production launch
