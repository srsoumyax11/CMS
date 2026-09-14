# Campus Management Platform - Backend Phase 1

This is the FastAPI backend skeleton for the campus management platform.

## Setup Instructions

1. **Prerequisites**
   - Python 3.10+
   - A running Postgres database (e.g., local Supabase instance).

2. **Environment Setup**
   Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

3. **Environment Variables**
   Copy `.env.example` to `.env` and fill in your actual Supabase PostgreSQL connection string, secret keys, and superadmin credentials:
   ```bash
   cp .env.example .env
   ```
   **Important:** Set `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` in your `.env`.

4. **Database Setup (One-Click)**
   Make sure your database (e.g. Supabase local instance) is running, then run the unified setup script. This script automatically applies all database migrations and seeds the required data (Courses, Branches, Roles, Permissions, and SuperAdmin):
   ```bash
   python scripts/setup.py
   ```
   *Note: If you left the default credentials in `.env.example`, your SuperAdmin account will be seeded as:*
   **Email:** `admin@example.com`
   **Password:** `supersecret123`

5. **Running the Server**
   Start the Uvicorn development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The API will be accessible at `http://127.0.0.1:8000`. Swagger UI is available at `http://127.0.0.1:8000/docs`.

---

## Documentation
- [Phase 1 Walkthrough](docs/phase1_walkthrough.md): Authentication, Supabase Storage, and Environment configurations.
- [Phase 2 Walkthrough](docs/phase2_walkthrough.md): RBAC Architecture, Seed Scripts, Admin Routes, and Dependency Caching.

---

## Testing the Endpoints (cURL)

### 1. Register a Student
*Note: Fetch actual course_id and branch_id UUIDs from `GET /api/metadata/courses` first.*
```bash
curl -X POST http://127.0.0.1:8000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
           "email": "student@example.com",
           "password": "securepassword123",
           "name": "John Doe",
           "course_id": "PUT_COURSE_UUID_HERE",
           "branch_id": "PUT_BRANCH_UUID_HERE",
           "year": 2024
         }'
```

### 2. Login (for Frontend JSON)
```bash
curl -X POST http://127.0.0.1:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
           "email": "student@example.com",
           "password": "securepassword123"
         }'
```

### 3. Refresh Token
```bash
# Use the refresh_token from the login response
curl -X POST http://127.0.0.1:8000/api/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{
           "refresh_token": "YOUR_REFRESH_TOKEN_HERE"
         }'
```
