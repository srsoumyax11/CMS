<div align="center">
<img width="1365" height="372" alt="image" src="https://github.com/user-attachments/assets/4287d77d-c2e7-4e6f-9c96-30d55f1029fd" />

  
  ### A Modern, Enterprise-Grade University Content Management System & ERP.

  [![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
  [![React](https://img.shields.io/badge/React-18.2-61DAFB.svg?style=flat&logo=react)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
  [![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0_Async-red.svg?style=flat)](https://www.sqlalchemy.org)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1.svg?style=flat&logo=postgresql)](https://www.postgresql.org)
  [![Supabase](https://img.shields.io/badge/Supabase-Storage-3ECF8E.svg?style=flat&logo=supabase)](https://supabase.com)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

  <br />

  <p>
    <strong>CampusOne</strong> is a full-stack, role-based university Content Management System built with React, FastAPI, PostgreSQL, and Supabase. It streamlines university operations, academic infrastructure, student outpasses, complaint resolution, certificate requests, campus spatial navigation, and placement drives.
  </p>

  [Documentation](./docs) · [Architecture](./docs/ARCHITECTURE.md) · [Setup Guide](./docs/SETUP.md) · [API Specs](./docs/API.md) · [Report Bug](https://github.com/srsoumyax11/CMS/issues)

</div>

---

## ✨ Features & Capabilities

### 🔐 Advanced Multi-Tenant RBAC & Onboarding
- **Granular Permissions**: Asset-Action based permission matrix (`user`, `complaint`, `outpass`, `notice`, `document`, etc.).
- **Multi-Role System**: SuperAdmins, Admins, Faculty, Students, Non-Teaching Staff, and Parents.
- **Role Applications**: Automated onboarding workflow with admin review and auto-generated role profiles (`StudentProfile`, `FacultyProfile`, `StaffProfile`, `ParentProfile`).
- **Stateless Authentication**: JWT access and refresh token rotation with an active token revocation list.

### 🏢 Academic Infrastructure & Operations
- **Hierarchical Departments**: Supports nested organizational structures (e.g. *Faculty of Engineering $\rightarrow$ Computer Science $\rightarrow$ AI Labs*).
- **Academic Hub**: Manage degree programs, subjects, credit hours, active semesters/terms, class cohort groups, and holiday calendars.
- **Timetable & Attendance**: Interactive timetable schedules, class cancellations, room swaps, and automated student attendance tracking.

### 🚪 Digital Outpass & Gate Pass System
- **Approval State Machine**: Outing, Leave, and Emergency outpass requests with multi-stage approval (Warden $\rightarrow$ HOD).
- **QR Code Verification**: Cryptographically hashed QR code generation for instant gate security verification at campus exits.

### 📝 Complaint Management Engine
- **Evidence Attachment**: File upload for photo evidence via Supabase S3-compatible storage buckets.
- **Location Mapping**: Link complaints directly to specific campus buildings and room numbers.
- **Resolution Tracking**: Assign maintenance personnel, update priority levels, and log status transitions.

### 📄 Official Document & Certificate Engine
- **Certificate Workflow**: Request Bonafide certificates, NOCs, Fee Clearances, and Transcripts.
- **Approval Lifecycle**: Concurrent request limits, mandatory rejection feedback, and downloadable issued documents.

### 🗺️ Campus Spatial Map & Infrastructure
- **Interactive Spatial Studio**: Manage campus points of interest (POIs), buildings, rooms, and navigation paths.
- **Infrastructure Relational Model**: Track room capacities, floors, building types, and department assignments.

### 💼 Placement Portal & Notice Board
- **Recruitment Drives**: Announcement of upcoming company placement drives, CTC details, and eligibility criteria.
- **Application Tracker**: Resume URL submissions and status tracking.
- **Broadcast Announcements**: Target notices by degree course, department, academic year, or custom audience groups.

### 🤖 AI Assistant Integration
- **Contextual Assistance**: Integrated AI chatbot providing automated answers regarding campus rules, schedules, and queries.

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│               React 18 + TypeScript (Vite SPA)              │
│       Radix UI primitives · Tailwind CSS · TanStack Query   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP REST (Bearer JWT)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 FastAPI Async Backend (Python)              │
│       21 Route Controllers · UnitOfWork · Generic Repos     │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────┐┌──────────────────────────────┐
│  PostgreSQL Database        ││ Supabase Storage (S3 API)    │
│  40+ SQLAlchemy 2.0 Models  ││ Public/Private Buckets       │
│  Managed via Alembic        ││ (avatars, complaints, docs)  │
└─────────────────────────────┘└──────────────────────────────┘
```

👉 **[Read full Architecture Documentation](./docs/ARCHITECTURE.md)**

---

## 🛠️ Tech Stack

| Layer | Technologies |
| --- | --- |
| **Frontend UI** | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Lucide Icons |
| **State & Data Fetching** | TanStack React Query, Axios (with auth interceptors), React Context API |
| **Form Validation** | React Hook Form, Zod |
| **Backend API** | Python 3.10+, FastAPI, Pydantic v2 |
| **Database & ORM** | PostgreSQL 15+, SQLAlchemy 2.0 (Async), Alembic |
| **Authentication** | Custom JWT, Passlib (Bcrypt), Python-Jose, OTP Verification |
| **Storage & Caching** | Supabase Storage (S3 API), Redis |
| **DevOps & Containers** | Docker, Supabase CLI, Render, Vercel |

---

## 📂 Project Structure

```text
CMS/
 ├── backend/                 # Python FastAPI Backend
 │    ├── alembic/            # Database schema migration scripts
 │    ├── app/                # Application core logic
 │    │    ├── api/           # 21 REST Router Controllers & Dependencies
 │    │    ├── core/          # Security, Configs, Logging
 │    │    ├── models/        # 40+ SQLAlchemy 2.0 ORM Database Models
 │    │    ├── repositories/  # BaseRepository & UnitOfWork Layer
 │    │    ├── schemas/       # Pydantic v2 validation models
 │    │    └── services/      # Domain business logic services
 │    ├── scripts/            # Pre-start checks & bucket setup
 │    └── tests/              # Pytest unit & integration tests
 │
 ├── frontend/                # React UI (Vite + TypeScript)
 │    ├── src/
 │    │    ├── api/           # Axios API modules
 │    │    ├── components/    # Radix UI + shadcn components
 │    │    ├── context/       # Auth & Theme context providers
 │    │    ├── pages/         # Role-based page views
 │    │    └── types/         # TypeScript interface definitions
 │
 └── docs/                    # Complete Documentation Hub
      ├── ARCHITECTURE.md     # System architecture & patterns
      ├── PROJECT_STRUCTURE.md# Complete file & directory map
      ├── DATABASE.md         # Database ERD & 40+ Model inventory
      ├── API.md              # 21 REST API route inventory
      ├── SETUP.md            # Local development setup guide
      └── DEPLOYMENT.md       # Production cloud deployment guide
```

👉 **[View detailed Project Structure](./docs/PROJECT_STRUCTURE.md)**

---

## ⚡ Quick Start

### 1. Prerequisites
- **Git**
- **Node.js** (v18+)
- **Python** (v3.10+)
- **Docker Desktop** (Required for local Supabase Postgres)
- **Supabase CLI**: `npm install -g supabase`

### 2. Database Setup (Local Supabase Container)
```bash
cd backend
supabase start
```
*Local Mailpit (email monitor) will run at `http://localhost:54324/monitor`.*

### 3. Backend Setup (FastAPI)
```bash
cd backend
cp .env.example .env

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate      # Windows
# source venv/bin/activate   # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Verify DB connection & initialize storage buckets
python -m scripts.pre_start

# Run Alembic migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --port 8000
```
*API docs available at `http://localhost:8000/docs`.*

### 4. Frontend Setup (React)
```bash
cd frontend
npm install
npm run dev
```
*Frontend app running at `http://localhost:5173`.*

👉 **[Detailed Step-by-Step Setup Guide](./docs/SETUP.md)**

---

## 📚 Documentation Hub

| Document | Description |
| --- | --- |
| 🏗️ **[Architecture](./docs/ARCHITECTURE.md)** | Deep-dive into design patterns, UOW, security, and data flow |
| 📂 **[Project Structure](./docs/PROJECT_STRUCTURE.md)** | Comprehensive directory tree and module explanations |
| 🗄️ **[Database & ERD](./docs/DATABASE.md)** | ERD diagram, 40+ model inventory, and Alembic migration guide |
| 🔌 **[API Specification](./docs/API.md)** | Overview of all 21 REST API endpoint modules |
| ⚡ **[Local Setup Guide](./docs/SETUP.md)** | Step-by-step developer guide for local environment |
| 🚀 **[Deployment Guide](./docs/DEPLOYMENT.md)** | Production cloud deployment (Render + Vercel + Supabase) |
| 🔄 **[User Flow](./docs/userflow.md)** | User onboarding & role application workflow |
| ⚡ **[CLI Commands](./docs/common_commads.md)** | CLI cheat sheet for database resets, typechecks, and tests |

---

## 🚀 Production Deployment

CampusOne is container-ready and built to deploy seamlessly on cloud infrastructure:
- **Database & Storage**: Supabase Cloud
- **Backend API**: Render / Railway (Docker or Python Service)
- **Frontend UI**: Vercel / Netlify

👉 **[Production Deployment Guide](./docs/DEPLOYMENT.md)**

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](./LICENSE) for more information.
