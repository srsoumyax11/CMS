# Project Structure

This document explains the physical layout of the BPUT CMS codebase to help new developers navigate the repository.

```text
CMS/
├── .github/                    # GitHub configuration (Coming Soon)
├── docs/                       # Project documentation
│   ├── ARCHITECTURE.md         # System design
│   ├── DATABASE.md             # DB Schema and ER diagrams
│   ├── DEPLOYMENT.md           # Cloud production guide
│   ├── SETUP.md                # Local setup guide
│   └── PROJECT_STRUCTURE.md    # This file
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Full page views
│   │   ├── hooks/              # Custom React hooks
│   │   ├── context/            # React Context providers (Auth)
│   │   └── lib/                # API clients and utilities
│   ├── package.json
│   └── vite.config.ts
│
└── backend/                    # Python FastAPI application
    ├── alembic/                # Database migration scripts
    ├── app/
    │   ├── api/                # API router definitions
    │   ├── core/               # Security, config, and database setup
    │   ├── models/             # SQLAlchemy ORM models
    │   └── schemas/            # Pydantic validation schemas
    ├── scripts/
    │   └── pre_start.py        # CI/CD Pre-flight integrity checks
    ├── start.sh                # Production entrypoint script
    └── requirements.txt
```
