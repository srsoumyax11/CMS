# Campus Management System (CMS) - Backend Architecture

## 1. System Overview
The CMS Backend is a modern, high-performance, asynchronous REST API designed for college administration. It is built using the following core technologies:

- **Framework**: FastAPI (Asynchronous, High-Performance)
- **Database**: PostgreSQL (Relational Database)
- **ORM**: SQLAlchemy 2.0 (Async Session)
- **Migrations**: Alembic
- **Storage**: Supabase Storage (for avatars, complaints, and notices)
- **Authentication**: JWT (JSON Web Tokens) with Argon2id password hashing
- **Language**: Python 3.12+

---

## 2. Directory Structure

The project follows a Domain-Driven Design (DDD) inspired layout grouped by technical concern:

```
app/
├── api/
│   ├── deps.py            # FastAPI Dependencies (DB, Auth, RBAC, Row-Level Checks)
│   └── routes/            # Route Handlers grouped by domain
├── core/
│   ├── config.py          # Environment Variables & Settings (Pydantic BaseSettings)
│   ├── database.py        # SQLAlchemy Async Engine and SessionMaker
│   ├── permissions.py     # Hardcoded string constants for RBAC assets/actions
│   ├── security.py        # Password hashing and JWT generation
│   └── storage.py         # Supabase client integration for bucket uploads
├── models/                # SQLAlchemy declarative ORM classes
│   ├── base.py
│   ├── academic.py        # Course, Branch metadata
│   ├── complaint.py       # Complaints, Status Logs
│   ├── notice.py          # Notices, Read Receipts
│   ├── outpass.py         # Outpasses, Status Logs
│   ├── profiles.py        # StudentProfile, FacultyProfile
│   ├── rbac.py            # Role, Permission, UserRole, Asset, Action
│   └── user.py            # Core User model
├── schemas/               # Pydantic schemas (Request / Response validation)
│   └── common.py          # Standardized APIResponse wrapper
└── main.py                # FastAPI app initialization, middleware, error handlers
```

---

## 3. The RBAC Engine (Role-Based Access Control)

The CMS features a dynamic, fully database-backed RBAC engine. It abstracts away hardcoded "if role == 'admin'" checks in favor of granular **Permissions**.

### The Capability Model
A `Permission` is a cross-product of an `Asset` (the resource) and an `Action` (the operation).
- **Asset**: `complaint`, `outpass`, `notice`, `student_profile`
- **Action**: `create`, `view`, `list`, `edit`, `delete`, `approve`, `reject`
- **Example Permission**: `outpass:approve`

### How It Works:
1. `Role` (e.g., "Student", "Faculty", "SuperAdmin") holds multiple `RolePermission` entries.
2. A `User` is assigned a `Role` via the `UserRole` table.
3. The `require_permission()` dependency in FastAPI checks if the user possesses the required capability string in their JWT-derived context.

---

## 4. Defense-in-Depth (IDOR Prevention)

While `require_permission` answers *"Can this user perform this action in general?"*, it **does not** answer *"Does this user own this specific record?"*. 

To prevent **Insecure Direct Object Reference (IDOR)** vulnerabilities, the architecture enforces explicit **Row-Level Ownership Checks** for any endpoint taking an `{id}` path parameter.

**Pattern Implementation:**
```python
@router.patch("/{id}/cancel")
async def cancel_outpass(
    id: UUID, 
    current_user: User = Depends(require_permission(Perms.OUTPASS_CANCEL))
):
    outpass = await get_outpass_from_db(id)
    
    # EXPLICIT ROW-LEVEL GUARD
    if outpass.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this outpass")
```

For more complex visibility rules (like Complaints, which can be `public` or `private`), specialized dependencies like `can_view_complaint_detail()` are used directly in the route body after the database fetch.

---

## 5. Transactional Guarantees

For endpoints that mutate state and simultaneously record audit logs (e.g., Complaint Status changes, Outpass Approvals), the system strictly uses explicit atomic transactions via `async with db.begin():`.

**Important Anti-Pattern Prevention:**
SQLAlchemy 2.0 AsyncSessions implicitly begin a transaction upon the first `SELECT` query (`autocommit=False`). Therefore, before opening a strict explicit transaction block, the implicit transaction must be closed.

**Correct Transaction Pattern:**
```python
stmt = select(Outpass).where(Outpass.id == id)
result = await db.execute(stmt) # Implicit transaction begins
outpass = result.scalar_one_or_none()

# ... logical checks ...

await db.commit() # End the implicit transaction safely
async with db.begin(): # Start a guaranteed atomic block for mutation
    outpass.status = OutpassStatus.approved
    log = OutpassStatusLog(outpass_id=outpass.id, status=OutpassStatus.approved)
    db.add(log)
```

---

## 6. Supabase Storage Subsystem

File uploads are handled seamlessly via Supabase buckets. To prevent path traversal attacks, directory enumeration, and accidental overwrites:
1. All files (avatars, complaints, notices) are renamed to random `UUIDv4` strings upon upload.
2. Only explicitly permitted MIME types (JPEG, PNG, WEBP, PDF) and file sizes (<10MB) are accepted by FastAPI before being pushed to the bucket.
3. **Private Buckets**: Complaint attachments reside in a private bucket and are served dynamically via expiring Signed URLs generated on-the-fly (`get_signed_url`), ensuring that even if a URL is leaked, it expires.

---

## 7. Dynamic Data Filtering & Computed Fields

Rather than storing transient or constantly expiring data directly in the database (e.g., whether an outpass is "overdue"), the architecture leverages:
1. **Pydantic `@computed_field`**: Dynamically calculates values on serialization based on the difference between `datetime.now(timezone.utc)` and `expected_return_time`.
2. **SQLAlchemy Manual Translation**: In list routes (`/api/admin/outpasses`), the boolean query parameter `?is_overdue=true` is manually translated into a complex SQLAlchemy `or_` / `and_` conditional tree to perform database-level filtering against the computed logic without slowing down queries with application-level filtering.
