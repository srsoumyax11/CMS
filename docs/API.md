# 🔌 CampusOne REST API Documentation

The CampusOne backend exposes a RESTful API powered by **FastAPI**. Interactive API documentation and OpenAPI specifications are automatically served by FastAPI when running the server locally.

- **Interactive Swagger UI**: `http://localhost:8000/docs`
- **ReDoc UI**: `http://localhost:8000/redoc`
- **OpenAPI Schema (JSON)**: `http://localhost:8000/openapi.json`
- **Base API Path**: `/api`

---

## 🔐 Authentication Format

All protected endpoints require a valid JWT Access Token passed in the `Authorization` HTTP header:

```http
Authorization: Bearer <your_jwt_access_token>
```

---

## 📦 API Route Inventory (21 Modules)

### 1. Authentication (`/api/auth`)
- `POST /api/auth/register`: User registration & account creation.
- `POST /api/auth/login`: Authenticate credentials & return JWT access + refresh tokens.
- `POST /api/auth/refresh`: Refresh expired access token using a valid refresh token.
- `POST /api/auth/logout`: Revoke active refresh token.
- `POST /api/auth/verify-email/request`: Request email verification OTP.
- `POST /api/auth/verify-email/confirm`: Confirm email OTP.
- `POST /api/auth/password-reset/request`: Request password reset OTP.
- `POST /api/auth/password-reset/confirm`: Confirm OTP and update password.

### 2. Users & Profile Management (`/api/users`)
- `GET /api/users/me`: Fetch profile details of currently logged-in user.
- `PUT /api/users/me`: Update profile details (Name, Phone, Bio).
- `POST /api/users/me/avatar`: Upload user profile avatar image to Supabase Storage.
- `PUT /api/users/me/password`: Change current user password.

### 3. System Administration (`/api/admin`)
- `GET /api/admin/users`: List all system users with filters (Role, Department, Status).
- `POST /api/admin/students`: Onboard new student account & profile.
- `POST /api/admin/faculty`: Onboard new faculty account & profile.
- `POST /api/admin/staff`: Onboard new staff account & profile.
- `PATCH /api/admin/users/{id}/status`: Toggle user account status (`active`, `suspended`).
- `DELETE /api/admin/users/{id}`: Delete user account.

### 4. RBAC Roles & Permissions (`/api/roles`)
- `GET /api/roles`: List all system roles.
- `POST /api/roles`: Create new custom role.
- `GET /api/roles/{id}/permissions`: Fetch permissions assigned to a role.
- `POST /api/roles/{id}/permissions`: Update permission matrix for a role.

### 5. Onboarding Applications (`/api/applications`)
- `POST /api/applications`: Submit role application during onboarding.
- `GET /api/applications/pending`: List pending role applications for admin review.
- `PATCH /api/applications/{id}/approve`: Approve role application & auto-generate profile.
- `PATCH /api/applications/{id}/reject`: Reject role application.

### 6. Academic Infrastructure (`/api/academic`)
- `GET /api/academic/departments`: List academic & administrative departments.
- `POST /api/academic/departments`: Create new department.
- `GET /api/academic/courses`: List degree courses.
- `POST /api/academic/courses`: Create new degree course.
- `GET /api/academic/terms`: List academic terms/semesters.
- `POST /api/academic/terms/{id}/set-current`: Set active academic semester.
- `GET /api/academic/subjects`: List subjects catalog.
- `POST /api/academic/subjects`: Add subject to catalog.
- `GET /api/academic/class-groups`: List class cohort groups.
- `GET /api/academic/holidays`: List holiday calendar events.

### 7. Timetable Management (`/api/timetable`)
- `GET /api/timetable/slots`: Fetch weekly class slots for a class group or faculty.
- `POST /api/timetable/slots`: Create new timetable slot.
- `PUT /api/timetable/slots/{id}`: Update timetable slot.
- `DELETE /api/timetable/slots/{id}`: Remove timetable slot.
- `POST /api/timetable/exceptions`: Schedule class cancellation or room swap.

### 8. Attendance Management (`/api/attendance`)
- `POST /api/attendance/sessions`: Start new attendance marking session.
- `POST /api/attendance/mark`: Submit batch student attendance records (`present`, `absent`, `late`).
- `GET /api/attendance/summary/student/{id}`: Calculate overall attendance percentage for a student.

### 9. Complaint Tracking (`/api/complaints`)
- `POST /api/complaints`: File new complaint with optional photo upload.
- `GET /api/complaints`: List complaints filtered by scope (Personal, Building, All).
- `GET /api/complaints/{id}`: Retrieve complaint details and status log history.
- `PATCH /api/complaints/{id}/status`: Update complaint status (`pending`, `in_progress`, `resolved`).
- `PATCH /api/complaints/{id}/assign`: Assign complaint to maintenance staff.

### 10. Digital Outpass & Gate Passes (`/api/gate-passes`)
- `POST /api/gate-passes`: Submit outpass request (Outing/Leave/Emergency).
- `GET /api/gate-passes/mine`: List my requested outpasses.
- `GET /api/gate-passes/pending`: List outpasses awaiting Warden/HOD approval.
- `PATCH /api/gate-passes/{id}/approve`: Approve outpass & generate QR code hash.
- `PATCH /api/gate-passes/{id}/reject`: Reject outpass with reason.
- `POST /api/gate-passes/verify-qr`: Scan & verify student outpass QR code at main gate.

### 11. Document Engine (`/api/documents`)
- `GET /api/documents/types`: List available certificate types.
- `POST /api/documents/requests`: Request official document (Bonafide, NOC, Character Cert).
- `GET /api/documents/requests/mine`: Track my requested documents.
- `PATCH /api/documents/requests/{id}/approve`: Approve document request.
- `PATCH /api/documents/requests/{id}/ready`: Mark document as ready for download.

### 12. Placement Portal (`/api/placements`)
- `GET /api/placements/notices`: View upcoming campus recruitment drives.
- `POST /api/placements/notices`: Post new placement drive announcement.
- `POST /api/placements/apply`: Submit job application with resume URL.
- `GET /api/placements/applications/mine`: View my submitted placement applications.

### 13. Hostel Management (`/api/hostels`)
- `GET /api/hostels`: List residential hostels.
- `POST /api/hostels`: Create new hostel building.
- `POST /api/hostels/allocate`: Allocate room to student.

### 14. Campus Spatial Map (`/api/map`)
- `GET /api/map/locations`: List spatial map points of interest (POIs).
- `POST /api/map/locations`: Add new POI location.
- `GET /api/map/paths`: Fetch shortest navigation path between two campus locations.

### 15. Broadcast Notice Board (`/api/notices`)
- `GET /api/notices`: Fetch active notice board announcements.
- `POST /api/notices`: Create & broadcast new notice.
- `DELETE /api/notices/{id}`: Delete announcement.

### 16. In-App Notifications (`/api/notifications`)
- `GET /api/notifications`: Fetch user notification feed.
- `PATCH /api/notifications/{id}/read`: Mark notification as read.
- `PATCH /api/notifications/read-all`: Mark all notifications as read.

### 17. User Silent Mode (`/api/silent`)
- `GET /api/silent/preferences`: Fetch silent mode settings & quiet hours.
- `PUT /api/silent/preferences`: Update quiet hours & notification preferences.

### 18. System Settings (`/api/settings`)
- `GET /api/settings`: Fetch system settings.
- `PUT /api/settings`: Update SMTP, maintenance mode, or academic year settings.

### 19. System Metadata (`/api/metadata`)
- `GET /api/metadata/enums`: Get dropdown options for roles, departments, statuses, priorities.

### 20. AI Assistant (`/api/ai`)
- `POST /api/ai/chat`: Send query to Campus AI Assistant and receive contextual response.

### 21. Health Check (`/api/health`)
- `GET /api/health`: Verify API runtime and PostgreSQL database connection status.

---
