# Local Development Setup Guide

Follow this guide to set up the BPUT CMS project on your local machine for development from scratch.

### 1. Prerequisites

Ensure you have the following installed on your machine:

- **[Git](https://git-scm.com/downloads)**: Required for cloning the repository.
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**: Required to run the local Supabase database. Must be open and running in the background.
- **[Node.js](https://nodejs.org/en/download)** (v18+): Required for the frontend and installing Supabase CLI.
- **[Python](https://www.python.org/downloads/)** (v3.10+): Required for the backend API.
- **Supabase CLI**: Required for managing the local database. Once Node.js is installed, open your terminal and run:
  ```bash
  npm install -g supabase
  ```

### 2. Clone the Repository

```bash
git clone https://github.com/srsoumyax11/CMS.git
cd CMS
```

### 3. Database Setup (Supabase)

The database runs locally using Docker containers managed by the Supabase CLI.

```bash
# NOT MANDATORY
# Stop any dangling containers from other projects (if you have port conflicts)

docker ps -q | ForEach-Object { docker stop $_ }
```

```bash
cd backend

# Start the local Supabase environment (Postgres, Auth, Mailpit, etc.)
supabase start
```

*Note: You can view local outgoing emails in your browser at `http://localhost:54324/monitor`.*

### 4. Backend Setup (FastAPI)

Set up your Python virtual environment, configure environment variables, and install dependencies.

```bash
# Ensure you are in the backend directory
cd backend  

# IMPORTANT: Copy the environment variables template
cp ../.env.example .env
# (Then open .env and update any default values)
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate   # (On Windows)
# source venv/bin/activate # (On Mac/Linux)

# Install dependencies
pip install -r requirements.txt

# Run the pre-start script (Verifies DB connection and auto-creates Supabase buckets!)
python -m scripts.pre_start

# Run database migrations to create all tables (CRITICAL STEP)
alembic upgrade head

# Start the backend server
uvicorn app.main:app --reload --port 8000
```

*The API is now running at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.*

### 5. Frontend Setup (React/Vite)

Open a **new** terminal window to start the frontend.

```bash
# From the root CMS directory
cd frontend

# Install Node dependencies
npm install

# Start the development server
npm run dev
```

*The frontend is now running at `http://localhost:5173`.*

---

## 🧹 How to Wipe and Tear Everything Down

If you ever want to completely wipe the local database and stop all services so you can start completely fresh again:

```bash
cd backend

# Stop supabase and completely wipe the database volumes
supabase stop --no-backup
```

### 🏗️ Rebuilding from Scratch

After wiping the database, you can rebuild a brand new instance from scratch by running the following commands in your Python virtual environment:

```bash
# 1. Start the fresh database containers
supabase start

# 2. Re-create the schema and seed default data
alembic upgrade head

# 3. Create storage buckets and run pre-flight checks
python -m scripts.pre_start
```
