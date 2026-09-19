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

---

# Future Features: Strict Password Complexity & Strength Meter

## What This Is

Currently, the application allows simple passwords during account creation. To improve security, we need to enforce strict password complexity rules on both the frontend and backend. Additionally, providing visual feedback (a strength meter) during registration will improve user experience.

---

## Requirements

1. **Minimum Length:** At least 8 characters.
2. **Uppercase Letter:** At least 1 uppercase letter (A-Z).
3. **Lowercase Letter:** At least 1 lowercase letter (a-z).
4. **Number:** At least 1 number (0-9).
5. **Special Character:** At least 1 special character (e.g., `!@#$%^&*`).

---

## Backend Implementation Plan

1. **Location:** `app/schemas/auth.py`
2. **Implementation:** Update the `RegisterRequest` and `PasswordChangeRequest` Pydantic models.
3. **Validation logic:** Add a `@field_validator('password')` or use Pydantic's `StringConstraints` with a strict Regex pattern.
4. **Error Handling:** If validation fails, return a 422 Unprocessable Entity (or 400 Bad Request) with a clear, user-friendly error message indicating exactly which rules were not met.

Example Regex for validation:
```python
pattern = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
```

---

## Frontend Implementation Plan

1. **Locations:** 
   - `frontend/src/pages/auth/Register.tsx` (Account Creation)
   - Change Password component (when implemented)
2. **Strength Calculation Logic:**
   - Create a utility function to evaluate password strength dynamically on input change.
   - Score from 0 to 4 based on how many criteria are met.
     - **0-1 (Bad):** Red
     - **2 (Low):** Orange
     - **3 (Good):** Yellow
     - **4 (Strong):** Green
3. **UI Components:**
   - **Checklist:** A list of the 5 requirements below the password field. Display a ✅ (green) or ❌ (gray) next to each rule as the user types.
   - **Progress Bar:** A smooth, animated `div` (or shadcn/ui `<Progress />`) that fills up and changes color based on the score. Add CSS transitions (`transition-all duration-300 ease-in-out`) for smoothness.
   - **Text Feedback:** Display the strength word ("Bad", "Low", "Good", "Strong") dynamically alongside the bar.
