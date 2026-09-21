# Supabase Local Development & Restart Guide

This guide walks you through setting up or freshly restarting your local Supabase database and storage buckets for backend development.

## 1. Environment Configuration

Before running any backend commands, ensure your environment variables are set up correctly:

1. Locate the `.env.example` file in the `backend/` directory.
2. Copy it to create your local `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Update the `.env` file with your local Supabase PostgreSQL connection string and secret keys. The `.env.example` contains the standard template for local Supabase.

## 2. Freshly Restarting the Database

If you ever need to completely wipe your local database and start fresh (e.g., if migrations get messy or you want to clear all test data):

1. **Stop the backend server** (Ctrl+C).
2. **Reset the Supabase database**:
   - If using the Supabase CLI: run `supabase db reset`.
   - If managing your own local Postgres instance: drop and recreate the `public` schema.
3. **Run Alembic Migrations**:
   The backend uses exactly two migrations during development. Run the upgrade command to generate the tables and seed the initial system data (Roles, Permissions, SuperAdmin):
   ```bash
   alembic upgrade head
   ```
4. **Restart the Server**:
   ```bash
   uvicorn app.main:app --reload
   ```

## 3. Storage Bucket Setup

The CMS relies on Supabase Storage for profile pictures, complaint images, and attachments. You must create these buckets manually in your local Supabase dashboard for uploads to work.

1. Open your local Supabase Studio dashboard (typically `http://localhost:54323`).
2. Navigate to **Storage** on the left sidebar.
3. Click **New Bucket**.
4. Create the following buckets:
   - `avatars` (Make this bucket **Public**)
   - `complaints` (Make this bucket **Public** if complaints are publicly viewable, or private depending on your security rules)
   - `documents` (Make this bucket **Private**)
5. Ensure you apply the appropriate **Storage Policies** (Rls) in Supabase Studio to allow authenticated users to `INSERT` and `SELECT` from these buckets.

Once the database is reset, migrations are run, and buckets are created, your local environment is fully prepared for development!
