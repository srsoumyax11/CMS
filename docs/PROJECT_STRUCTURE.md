# 📂 CampusOne Project Structure

This document provides a complete directory map and explanation of the source code organization across the **CampusOne** repository.

```text
CMS/
├── backend/                  # Python FastAPI Backend
│   ├── alembic/              # Database migration scripts & configurations
│   ├── app/                  # Application core code
│   │   ├── api/              # API layer (Routes, Dependencies, Middleware)
│   │   │   ├── routes/       # 21 Domain Route Controllers
│   │   │   ├── deps.py       # FastAPI Dependencies (Auth, DB Session, RBAC Guards)
│   │   │   └── middleware.py # Custom HTTP Middlewares (IDOR, Request ID)
│   │   ├── core/             # Core configurations & security setup
│   │   │   ├── config.py     # Environment settings & Pydantic BaseSettings
│   │   │   ├── security.py   # Password hashing, JWT token creation/verification
│   │   │   └── logging.py    # Structured JSON logger configuration
│   │   ├── models/           # 40+ SQLAlchemy 2.0 ORM Database Models
│   │   ├── repositories/     # Generic BaseRepository & Domain Repositories + UnitOfWork
│   │   ├── schemas/          # Pydantic v2 Request/Response validation schemas
│   │   ├── services/         # Domain Business Logic Services
│   │   ├── templates/        # HTML Email Templates (Welcome, OTP, Outpass Alerts)
│   │   ├── utils/            # Helper utilities (Storage, Emailer, Magic File Checker)
│   │   └── main.py           # FastAPI Application Entry Point & Lifespan Hooks
│   ├── scripts/              # Pre-start scripts, bucket initializers, test scripts
│   ├── tests/                # Pytest unit & integration test suites
│   ├── alembic.ini           # Alembic configuration file
│   ├── pyproject.toml        # Python project metadata & tool configurations
│   └── requirements.txt      # Python dependencies manifest
│
├── frontend/                 # React 18 + Vite + TypeScript Frontend
│   ├── public/               # Static assets & public icons
│   ├── src/                  # React Application Source Code
│   │   ├── api/              # Axios API Client Modules (auth, admin, complaints, etc.)
│   │   ├── components/       # Reusable UI & Layout Components
│   │   │   ├── ui/           # Radix UI / shadcn base components (Button, Dialog, Table)
│   │   │   ├── layout/       # App Shell, Sidebar, Navbar, Footer
│   │   │   └── common/       # Stat Cards, Status Badges, Search Filters
│   │   ├── config/           # App Constants, Navigation Links, Route Paths
│   │   ├── context/          # React Contexts (AuthContext, ThemeContext)
│   │   ├── hooks/            # Custom React Hooks (useAuth, useDebounce, etc.)
│   │   ├── lib/              # Utility libraries (cn helper, axios client instance)
│   │   ├── pages/            # Page Views organized by role & feature
│   │   │   ├── admin/        # Admin Management Pages (Users, Academic, Infrastructure, Spatial)
│   │   │   ├── attendance/   # Attendance Marking & View Pages
│   │   │   ├── auth/         # Authentication Pages (Login, Register, OTP Verify, Reset)
│   │   │   ├── complaints/   # Complaint Submission & Admin Resolution Pages
│   │   │   ├── documents/    # Document Request & Verification Pages
│   │   │   ├── gate-passes/  # Outpass & Quick Gate Pass Management Pages
│   │   │   ├── map/          # Interactive Campus Spatial Map View
│   │   │   ├── notices/      # Broadcast Notice Board & Audience Group Manager
│   │   │   ├── placements/   # Placement Drives & Applications
│   │   │   ├── settings/     # System & User Preference Settings
│   │   │   ├── timetable/    # Timetable Schedules & Class Slots
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── StudentDashboard.tsx
│   │   │   ├── Landing.tsx
│   │   │   └── Profile.tsx
│   │   ├── schemas/          # Zod validation schemas for forms
│   │   ├── types/            # TypeScript interfaces & type definitions
│   │   ├── App.tsx           # Main App Component & Router Configuration
│   │   └── main.tsx          # React Root Mount Entry Point
│   ├── package.json          # Node.js dependencies & scripts
│   ├── tailwind.config.js    # Tailwind CSS design system configuration
│   └── vite.config.ts        # Vite dev server & build configuration
│
├── docs/                     # Project Documentation Hub
│   ├── ARCHITECTURE.md       # High-level architecture & design patterns
│   ├── PROJECT_STRUCTURE.md  # Detailed code directory map (You are here!)
│   ├── DATABASE.md           # Database ERD, 40+ Model inventory, Alembic guide
│   ├── API.md                # 21 REST API route inventory & authentication
│   ├── SETUP.md              # Local development setup step-by-step
│   ├── DEPLOYMENT.md         # Production deployment (Render + Vercel + Supabase)
│   ├── userflow.md           # User onboarding & role application workflow
│   ├── supabase_setup.md     # Supabase local container setup & bucket setup
│   └── common_commads.md     # Quick CLI cheat sheet for dev commands
│
└── README.md                 # Primary project overview & quick reference
```

---

## 🔍 Key Directory Descriptions

### Backend (`/backend`)
- **`app/api/routes/`**: Contains 21 domain-specific HTTP route controllers (`academic.py`, `admin.py`, `auth.py`, `complaints.py`, `gate_passes.py`, `documents.py`, `users.py`, etc.).
- **`app/models/`**: Houses all 40+ SQLAlchemy ORM model definitions (`user.py`, `profiles.py`, `rbac.py`, `academic.py`, `gate_pass.py`, `complaint.py`, `documents.py`, `map.py`, etc.).
- **`app/repositories/`**: Contains the generic `BaseRepository` class and specialized repositories (e.g. `UserRepository`, `ComplaintRepository`), along with the `UnitOfWork` manager.
- **`app/services/`**: Implements core business logic services (`AuthService`, `AcademicService`, `ComplaintService`, `GatePassService`, `DocumentService`, etc.).

### Frontend (`/frontend`)
- **`src/pages/`**: Holds top-level view components. Organized cleanly by domain (`admin/`, `auth/`, `complaints/`, `gate-passes/`, `documents/`, `timetable/`, etc.).
- **`src/api/`**: Encapsulates API call functions corresponding to backend routes, keeping components clean and UI-decoupled.
- **`src/components/ui/`**: Radix UI + shadcn primitive components (Modals, Tables, Input fields, Badges, Tabs, Selects).
- **`src/types/`**: Comprehensive TypeScript definitions mirroring backend data models and API response payloads.

---
