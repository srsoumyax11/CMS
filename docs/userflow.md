# User Onboarding & Role Application Flow

## 1. Account Creation & Email Verification
1. **User Sign Up**: User enters Name, Email Address, and Password on the Register page.
2. **OTP Verification**: System sends a 6-digit email OTP. User inputs the code.
3. **Account Initialized**:
   - User account is created in the `users` database table.
   - `user_type` is set to **`user`** (Base account, no specific role privileges).
   - `account_status` is set to **`pending`**.

---

## 2. Onboarding & Role Application Submission
4. **Onboarding Screen**: Upon first login, user lands on `/onboarding` (`/user` view) displaying a welcome message and role selection options (Student, Faculty, Staff, Parent).
5. **Form Submission**: User fills out the required role application details (e.g. Roll Number, Course, Department, Year for Students).

---

## 3. Application Data Storage (`role_applications` Table)
6. **Separate Table Storage**: 
   - Applications are stored in a dedicated table named **`role_applications`**.
   - Fields:
     - `user_id`: Reference to applicant (`users.id`).
     - `target_role`: Target role (`student`, `faculty`, `staff`, `parent`).
     - `application_data`: Form data stored as structured JSON.
     - `status`: Set to `pending` (or `revision` / `rejected`).

---

## 4. Admin Approval & Role Elevation
7. **Admin Review**: Administrators review pending applications in the Admin Dashboard queue.
8. **Approval Action**:
   - Application status updates to `approved`.
   - `users.user_type` is elevated to the target role (e.g. `student`).
   - `users.account_status` updates to `active`.
   - Role-specific profile table (`student_profiles`, `faculty_profiles`, `staff_profiles`, `parent_profiles`) is automatically created and populated.
9. **Access Granted**: User can now access their role-specific dashboard (`/student`, `/faculty`, etc.).

