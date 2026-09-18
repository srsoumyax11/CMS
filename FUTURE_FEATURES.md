# Future Features: Role-Based Scope Enforcement

## What This Is

The RBAC system currently assigns permissions globally. A user with `notice:create` can create notices for the entire college. There is no way to restrict a faculty member to only managing notices for Block-A hostel.

This feature was partially designed but **intentionally deferred** because it added complexity before the core system was stable.

---

## What Was Removed & Why

| Removed | Location | Reason |
|---|---|---|
| `scope_type` column | `roles` table | Never enforced in code — was dead |
| `scope_id` column | `user_roles` table | Never enforced in code — was dead |
| `ScopeType` enum | `models/rbac.py` | Dead code |

The `deps.py` had a `# TODO: Add scope_id enforcement logic here` comment confirming this was always deferred.

---

## When You Need This

- A faculty warden should only approve outpasses for **their hostel**
- A department head should only post notices for **their department**
- A class teacher should only mark attendance for **their assigned sections**

---

## How to Re-Implement

### Step 1 — Restore the DB columns (new Alembic migration)
```sql
ALTER TABLE roles ADD COLUMN scope_type VARCHAR(50) NOT NULL DEFAULT 'college';
ALTER TABLE user_roles ADD COLUMN scope_id UUID NULL;
```
Restore `ScopeType` enum in `models/rbac.py`: `college`, `hostel`, `department`, `self`.

### Step 2 — Enforce in `deps.py`
Replace the `# TODO` stub. For scoped roles, pass context to route handlers:
```python
for user_role in current_user.user_roles:
    if user_role.role.scope_type == 'college':
        permissions.add(perm_str)
    else:
        permissions.add(f"{perm_str}:scope:{user_role.scope_id}")
```

### Step 3 — Route-level checks
```python
# Faculty approving an outpass
faculty_hostel_scopes = [ur.scope_id for ur in current_user.user_roles if ur.role.scope_type == 'hostel']
if student.hostel_id not in faculty_hostel_scopes:
    raise HTTPException(403, "Not authorized for this student's hostel")
```

### Step 4 — Frontend scope assignment UI
When assigning a role, show a conditional sub-selector:
- `hostel` scope → dropdown of hostels
- `department` scope → dropdown of departments
- `college` scope → no sub-selection needed

Use a hierarchical checkbox where selecting `college` auto-checks all sub-scopes below it.

---

## Key Design Decisions to Revisit

1. **Scope on Role vs. UserRole assignment?**
   - On UserRole is more flexible (same "Warden" role can be college-scoped for one person, hostel-scoped for another).

2. **Multiple scoped roles?** — Use the union of all scopes. Standard and safest approach.

3. **`self` scope** is best enforced directly in queries with `WHERE user_id = current_user.id`, not at middleware level. It is essentially row-level security.
