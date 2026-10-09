# Production Deployment Guide

Welcome to the CampusOne! If you have purchased this software and want to deploy it to the internet so real users can access it, this guide will walk you through deploying to **Supabase** (Database), **Render** (Backend API), and **Vercel** (Frontend UI).

---

## Step 1: Clone the Source Code

You should have received access to a Git repository or a `.zip` file containing the source code.

```bash
git clone https://github.com/srsoumyax11/CMS.git
cd CMS
```

---

## Step 2: Database Setup (Supabase Cloud)

We use Supabase for the PostgreSQL database and file storage.

1. Go to [Supabase.com](https://supabase.com) and create an account/organization.
2. Click **New Project**, name it (e.g., `CAMPUSONE-PROD`), and generate a secure Database Password.
4. **Get Database Credentials**: 
   - In Supabase, go to the "Connect to your project" wizard.
   - Choose **ORM** to get the Direct Connection String.
   - It will look like this: `postgresql://postgres:[YOUR-PASSWORD]@.../postgres`
   - **CRITICAL STEP for Python:** You must add `+asyncpg` after `postgresql` so our high-performance backend can connect to it. Your final `DATABASE_URL` must look like this:
   ```
     postgresql+asyncpg://postgres:[YOUR-PASSWORD]@.../postgres
   ```
5. **Get Storage Credentials (URL and Key)**:
   - In the left sidebar, click the **Gear Icon ⚙️ (Project Settings)**, then click **API**.
   - Under **Project URL**, copy the URL. This will be your `SUPABASE_URL`.
   - Under **Project API Keys**, find the **Secret API key (service_role)**. This will be your `SUPABASE_KEY`. (Do NOT use the publishable anon key).
5. **Create Storage Bucket**: Go to `Storage` in the left sidebar, click **New Bucket**, and create a bucket named `avatars` (make it public).

---

## Step 3: Backend Setup (Render)

We use [Render.com](https://render.com) to host the Python FastAPI backend.

1. Go to Render, log in, and click **New -> Web Service**.
2. Connect your GitHub repository and select the `backend` folder as the Root Directory.
3. **Settings**:
   - Runtime: `Python 3`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `bash start.sh`
4. **Environment Variables**:
   Render has a "Secret Files" or bulk "Add from .env" feature. Copy the contents of your `.env.example` or use the block below to fill in your values in Render:
   ```ini
   DATABASE_URL="postgresql+asyncpg://postgres:[YOUR-PASSWORD]@.../postgres"
   SUPABASE_URL="https://[YOUR-PROJECT-ID].supabase.co"
   SUPABASE_KEY="sb_secret_your_service_role_key_here"
   JWT_SECRET_KEY="generate-a-secure-random-string-here"
   SUPERADMIN_EMAIL="admin@example.com"
   SUPERADMIN_PASSWORD="secure_admin_password_123"
   ```
5. Click **Deploy**. Render will run your migrations automatically and give you a public URL (e.g., `https://cms-backend.onrender.com`).

---

## Step 4: Frontend Setup (Vercel)

We use [Vercel.com](https://vercel.com) to host the React UI.

1. Go to Vercel, log in, and click **Add New -> Project**.
2. Connect your GitHub repository.
3. In the framework preset, select **Vite**.
4. Set the Root Directory to `frontend`.
5. **Environment Variables**:
   Copy and paste the block below into Vercel's environment variables section:
   ```ini
   VITE_API_URL="https://your-backend-url.onrender.com/api"
   ```
6. Click **Deploy**. Vercel will give you a public URL (e.g., `https://cms-frontend.vercel.app`).

---

## Step 6: Post-Deployment Configuration (The First Login)

Now that everything is live on the internet, it's time to set up the system.

1. Go to your Vercel frontend URL.
2. Log in using the `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD` you set in Render.
3. **Configure System Settings**:
   - Go to the **Admin Dashboard -> System Settings**.
   - Navigate to the **Email** tab.
   - Enter your actual SMTP credentials (e.g., SendGrid, AWS SES, or Gmail App Password) so the system can send real emails.
   - Save the settings.
4. **Onboard Staff**:
   - Go to **User Management**.
   - Create accounts for your core Faculty and Staff. Since you set up the SMTP settings in the previous step, they will immediately receive a welcome email with their password setup links!
5. **Open for Students**:
   - Students can now navigate to your Vercel URL and click **Register**. Their accounts will automatically wait in "Pending Approval" state until an Admin approves them.

**Congratulations! Your CMS is now fully live and operational in production!**
