Viewed permissions.ts:1-97
Listed directory models

Here is a comprehensive breakdown of all **Assets & Domain Entities** configured in the **CampusOne (CMS)**, categorized by domain:

---

### 1. User & Identity Assets
| Asset / Entity | Description & Key Attributes |
|---|---|
| **User** (`users`) | Primary identity record storing login credentials, global status (`pending`, `active`, `suspended`), avatar, and assigned system role. |
| **Role Application** | Onboarding applications submitted by new registrants requesting `student`, `faculty`, `staff`, or `parent` access. |
| **Student Profile** (`student_profiles`) | Academic profile containing Roll Number, Degree Course, Department, Admission Year, Hostel, and assigned Room. |
| **Faculty Profile** (`faculty_profiles`) | Faculty details including Employee ID, Academic Designation, Department, and Specialization. |
| **Staff Profile** (`staff_profiles`) | Non-teaching staff details including Employee ID, Department, and Job Function. |
| **Parent Link** (`parent_link_requests`) | Guardian-to-Student relationship link managing safety telemetry consent and outpass notifications. |

---

### 2. Access Control & Audience Assets
| Asset / Entity | Description & Key Attributes |
|---|---|
| **Role** (`roles`) | System RBAC roles (`SuperAdmin`, `Admin`, `Faculty`, `Student`, `Staff`, `Parent`). |
| **Permission** (`permissions`) | Granular action permissions (formatted as `asset:action`, e.g., `outpass:approve`, `notice:create`). |
| **Audience Group** (`audience_groups`) | Dynamic filter groups for segmenting users (e.g., *B.Tech CSE Batch 2024*, *Hostel A Residents*). |

---

### 3. Academic & Attendance Assets
| Asset / Entity | Description & Key Attributes |
|---|---|
| **Department** (`departments`) | Academic departments (Computer Science, Mechanical, Civil, Electrical, MBA, etc.). |
| **Course** (`courses`) | Degree programs (B.Tech, M.Tech, MCA, MBA). |
| **Timetable Slot** (`timetable_slots`) | Class schedule slots (Subject, Day of Week, Start/End Time, Faculty ID, Room Number). |
| **Attendance Record** (`attendance_records`) | Daily student attendance logs (`present`, `absent`, `late`) with automated batch processing. |

---

### 4. Campus Safety, Outpass & Complaints Assets
| Asset / Entity | Description & Key Attributes |
|---|---|
| **Outpass** (`outpasses`) | Extended leave and outing requests with approval state machine (`pending` → `approved` → `active` → `completed` / `overdue`). |
| **Quick Gate Pass** (`quick_gate_passes`) | Short-duration campus exit passes (tea/casual breaks) verified via live QR scanning. |
| **Gate Log** (`gate_pass_logs`) | Real-time scan audit trail recorded at main campus security gates. |
| **Complaint** (`complaints`) | Facility grievances (Electrical, Plumbing, Wi-Fi, Cleanliness) with `public` or `private` visibility settings. |
| **Visitor Log** (`visitor_logs`) | Entry/exit logs for campus guests, contractors, and visiting parents. |

---

### 5. Hostel & Infrastructure Assets
| Asset / Entity | Description & Key Attributes |
|---|---|
| **Building** (`buildings`) | Physical campus buildings (Academic Blocks, Boys Hostels, Girls Hostels, Sports Complex). |
| **Room** (`rooms`) | Individual rooms within buildings (Floor, Room Number, Capacity, Occupancy status). |
| **Hostel Allocation** (`hostel_allocations`) | Student room assignment records synced directly with `StudentProfile.room_id`. |

---

### 6. Mess & Operations Assets
| Asset / Entity | Description & Key Attributes |
|---|---|
| **Mess Menu** (`mess_menus`) | Scheduled weekly meal plans (Breakfast, Lunch, Snacks, Dinner). |
| **Digital Meal Pass** (`mess_passes`) | QR code pass for single-meal verification at mess counters. |
| **Mess Feedback** (`mess_feedback`) | Student ratings and qualitative reviews on food quality. |

---

### 7. Communication, Certificates & Finance Assets
| Asset / Entity | Description & Key Attributes |
|---|---|
| **Notice** (`notices`) | Broadcast announcements with optional targeting by Course, Department, Year, or Audience Group. |
| **Notification** (`notifications`) | In-app notification alerts for approvals, pass updates, and reminders. |
| **Document Request** (`document_requests`) | Official certificate requests (Fee Clearance, Character Certificate, Bonafide). |
| **Fee Due** (`fee_dues`) | Tuition, hostel, and mess fee dues with automated status state machine (`pending`, `partial`, `paid`, `overdue`). |
| **System Setting** (`system_settings`) | System-wide configuration variables (academic terms, maintenance mode settings). |

Viewed index.html:1-22

