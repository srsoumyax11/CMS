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
   Copy `.env.example` to `.env` and fill in your actual Supabase PostgreSQL connection string and a secret key:
   ```bash
   cp .env.example .env
   ```

4. **Database Migrations**
   Make sure your database is running, then generate and apply the initial migration:
   ```bash
   # Generate migration script
   alembic revision --autogenerate -m "Initial migration"
   
   # Apply migration to the database
   alembic upgrade head
   ```

5. **Running the Server**
   Start the Uvicorn development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The API will be accessible at `http://127.0.0.1:8000`. Swagger UI is available at `http://127.0.0.1:8000/docs`.

---

## Documentation
- [Phase 1 Walkthrough](docs/phase1_walkthrough.md): Detailed summary of Authentication, Supabase Storage integration, Data Validation, and Environment configurations.

---

## Testing the Endpoints (cURL)

### 1. Register a Student
```bash
curl -X POST http://127.0.0.1:8000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
           "email": "student@example.com",
           "password": "securepassword123",
           "name": "John Doe",
           "course": "B.Tech",
           "branch": "CSE",
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
