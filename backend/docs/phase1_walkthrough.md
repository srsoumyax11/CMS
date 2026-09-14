# Phase 1: Authentication & Storage Walkthrough

## What was built
1. **Configured Supabase Environment:** We added the `supabase` python SDK and configured it with local docker credentials (`SUPABASE_URL` and `SUPABASE_KEY`).
2. **Database & Data Validation**: 
   - Cleaned the database and migrated a fresh schema.
   - Built DB models for Users (authentication), StudentProfiles, and FacultyProfiles with UUIDs.
   - Created Enums for strict validation of Course (B.Tech, M.Tech, etc.) and Branch directly in the database.
3. **Authentication Framework**: 
   - Implemented secure JWT authentication (Access & Refresh tokens) using modern `pwdlib` and `PyJWT`.
   - Built the `/api/auth/register`, `/api/auth/login`, and `/api/auth/refresh` JSON endpoints.
   - Added a dedicated `/api/auth/token` standard OAuth2 endpoint so Swagger UI integration works perfectly.
4. **Authenticated Endpoint (`/api/users/me/photo`)**: 
   - Built a new router specifically for authenticated user operations. The photo upload endpoint requires a valid JWT `Bearer` token.
5. **Storage Logic**: 
   - The API accepts a `multipart/form-data` upload (image), sends it directly to the local Supabase `avatars` bucket, and fetches the permanent, secure public URL.
6. **Database Update**: 
   - The backend automatically associates the generated Supabase URL with the logged-in user's profile.
7. **Environment Toggle**:
   - Created robust Global Exception Handlers that toggle verbosity based on `ENVIRONMENT="dev"|"prod"`.

## How the new flow works for the Frontend:
1. User hits `POST /api/auth/register` (without a photo).
2. User hits `POST /api/auth/login` to get their `access_token`.
3. User hits `POST /api/users/me/photo` with `Authorization: Bearer <access_token>` and the `photo` file payload.
4. The backend returns a `200 OK` with the new Supabase URL, and the profile is instantly updated!
