# Phase 2: RBAC & Admin Pipelines Walkthrough

## What changed?

### 1. Robust RBAC Architecture
We built out the entire RBAC schema: `Asset`, `Action`, `Permission`, `Role`, `RolePermission`, and `UserRole`.
We added `is_system_role` to prevent APIs from deleting standard roles (SuperAdmin, Student, Faculty).
All relationships were correctly wired up for optimal SQLAlchemy eager-loading.

### 2. Dependency Caching (FastAPI Magic)
We heavily leaned into FastAPI's native dependency injection for performance. The new `get_user_permissions` dependency evaluates exactly *once* per request, fetching and flattening the user's role-permissions into a Python `set`.
The `require_permission(Perms.YOUR_PERM)` wrapper uses this cached set to perform instantaneous `O(1)` lookups.
We explicitly captured this with a `StarletteHTTPException` global handler so that unauthorized hits return a clean 403 `APIResponse`.

### 3. The Seed Script (Idempotent & Atomic)
We built a highly robust `scripts/setup.py` and `scripts/seed_rbac.py` flow. It:
- Uses `INSERT ... ON CONFLICT DO NOTHING / UPDATE` upserts for complete idempotency.
- Wraps everything in an atomic transaction (`async with session.begin():`).
- Bootstraps the 3 core Roles, cross-products the Assets & Actions, binds the default permissions, and instantiates the SuperAdmin account from `.env`.

### 4. Admin & Role APIs
- **Roles**: `GET /api/roles`, `POST /api/roles`, `PATCH /api/roles/{id}/permissions`, `POST /api/roles/{id}/assign`
- **Matrix Endpoint**: `GET /api/roles/permission-matrix?role_id=...` perfectly maps out the `Asset x Action` grid for the frontend checkbox UI, computing the `granted: bool` on the backend exactly as architected.
- **Admin Users**: The full student listing (`skip/limit`), single GET, and approval patches. Creating and editing faculty accounts directly from the admin dashboard is also implemented.

### 5. The "Pre-Approval" State Trap
We solved the chicken-and-egg problem by adding `GET /api/auth/me`. This simple endpoint allows pending students to hit the server using just their JWT without running into the 403 wall, so the frontend can properly render their "Pending Approval" page.
