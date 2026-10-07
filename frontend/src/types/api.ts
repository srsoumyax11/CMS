// ── Enums / Union Types ──────────────────────────────────────────────

export type AccountStatus = 'pending' | 'revision' | 'active' | 'suspended' | 'rejected';
export type UserType = 'student' | 'faculty' | 'admin' | 'user' | 'parent' | 'staff';

export type AcademicStatus = 'enrolled' | 'graduated' | 'dropped' | 'expelled';
export type EmploymentStatus = 'active' | 'on_leave' | 'resigned' | 'retired' | 'terminated';

export type ComplaintCategory =
  | 'electrical'
  | 'plumbing'
  | 'wifi'
  | 'cleanliness'
  | 'furniture'
  | 'security'
  | 'other';

export interface Department {
  id: string;
  name: string;
  code: string;
  department_type: 'academic' | 'administrative';
  is_active: boolean;
  hod_user_id: string | null;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  duration_years: number;
}

export interface CourseCreateRequest {
  name: string;
  code: string;
  is_active?: boolean;
  duration_years?: number;
}

export interface CourseUpdateRequest {
  name?: string;
  code?: string;
  is_active?: boolean;
  duration_years?: number;
}

export interface MetadataRole {
  id: string;
  name: string;
  description: string | null;
}

export interface DepartmentCreateRequest {
  name: string;
  code: string;
  department_type?: 'academic' | 'administrative';
  is_active?: boolean;
  hod_user_id?: string | null;
}

export interface DepartmentUpdateRequest {
  name?: string;
  code?: string;
  department_type?: 'academic' | 'administrative';
  is_active?: boolean;
  hod_user_id?: string | null;
}

export type ComplaintStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'cancelled';

export type ComplaintVisibility = 'public' | 'private';








// ── Auth ─────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  user_type: UserType;
  account_status: AccountStatus;
  academic_status?: AcademicStatus | null;
  employment_status?: EmploymentStatus | null;
}

export interface Requires2FAResponse {
  requires_2fa: boolean;
  session_token: string;
  email: string;
}

export type LoginResponseData = TokenResponse | Requires2FAResponse;

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  user_id: string;
  course_id: string;
  department_id: string;
  year: number;
}

export interface StudentCreateRequest {
  name: string;
  email: string;
  password?: string;
  registration_no: string;
  roll_no?: string;
  course_id: string;
  department_id: string;
  admission_year?: number;
  current_semester?: number;
  section?: string;
  year: number;
  hostel?: string;
}

export interface StudentProfileCreateRequest {
  course_id: string;
  department_id: string;
  branch_id?: string; // deprecated backwards compatibility
  year: number;
  hostel?: string;
  photo_url?: string | null;
}

export interface RegisterResponseData {
  user_id: string;
  status: string;
}

export interface UserResponse {
  id: string;
  email: string;
  user_id?: string | null;
  account_status: AccountStatus;
  status_note?: string | null;
  user_type: UserType;
  academic_status?: AcademicStatus | null;
  employment_status?: EmploymentStatus | null;
  name?: string | null;
  photo_url?: string | null;
  email_notifications: boolean;
  in_app_alerts: boolean;
  is_2fa_enabled: boolean;
  rbac_roles?: string[];
  permissions?: string[];
}

export interface UserPreferencesUpdateRequest {
  email_notifications?: boolean;
  in_app_alerts?: boolean;
}

export interface EmailUpdateRequest {
  new_email: string;
}

export interface EmailVerifyRequest {
  token: string;
}

export interface NameUpdateRequest {
  name: string;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

// ── Generic API Response ─────────────────────────────────────────────

export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error?: string | null;
}

// ── Metadata Aliases ──────────────────────────────────────────────────
/**
 * @deprecated Legacy alias. Use Department instead.
 */
export type Branch = Department;

// ── Complaints ───────────────────────────────────────────────────────

export interface ComplaintResponse {
  id: string;
  raised_by: string;
  category: ComplaintCategory;
  location_hostel: string;
  location_room: string | null;
  description: string;
  photo_url: string | null;
  visibility: ComplaintVisibility;
  status: ComplaintStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ComplaintListResponse {
  total: number;
  items: ComplaintResponse[];
}

export interface ComplaintCreateRequest {
  category: ComplaintCategory;
  location_hostel: string;
  location_room?: string | null;
  description: string;
  visibility?: ComplaintVisibility;
  photo?: File | null;
}

export interface ComplaintStatusUpdateRequest {
  status: ComplaintStatus;
  note?: string | null;
}

export interface ComplaintAssignRequest {
  assigned_to: string;
}

export interface RecurringIssueResponse {
  category: ComplaintCategory;
  location_hostel: string;
  count: number;
  window_days: number;
}

export interface AgeingComplaintResponse {
  id: string;
  category: ComplaintCategory;
  location_hostel: string;
  location_room: string | null;
  status: ComplaintStatus;
  created_at: string;
  age_days: number;
}

// ── Notices ──────────────────────────────────────────────────────────

export interface NoticeResponse {
  id: string;
  title: string;
  content: string;
  author_id: string;
  attachment_url: string | null;
  target_course_id: string | null;
  target_department_id: string | null;
  /** @deprecated use target_department_id */
  target_branch_id?: string | null;
  target_year: number | null;
  target_hostel: string | null;
  target_user_types: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoticeListResponse {
  total: number;
  items: NoticeResponse[];
}

export interface NoticeCreateRequest {
  title: string;
  content: string;
  target_course_id?: string | null;
  target_department_id?: string | null;
  target_branch_id?: string | null;
  target_year?: number | null;
  target_hostel?: string | null;
  target_user_types?: string | null;
  target_audience_group_id?: string | null;
  file?: File | null;
}

export interface NoticeUpdateRequest {
  title?: string | null;
  content?: string | null;
}











// ── Attendance ──────────────────────────────────────────────────────

export interface RosterStudent {
  student_id: string;
  name: string;
  roll_number: string;
}

export interface AttendanceRosterItem {
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
}

export interface AttendanceBatchRequest {
  slot_id: string;
  date: string;
  records: AttendanceRosterItem[];
}

export interface AttendanceStat {
  subject_name: string;
  total_classes: number;
  attended: number;
  percentage: number;
  present?: number;
  absent?: number;
  late?: number;
  excused?: number;
  total?: number;
}


// ── Admin: Students ──────────────────────────────────────────────────

export interface StudentItemResponse {
  id: string;
  user_id?: string | null;
  registration_no?: string | null;
  roll_no?: string | null;
  name: string;
  email: string;
  course_id?: string | null;
  course_name: string;
  department_id?: string | null;
  department_name: string;
  admission_year?: number;
  current_semester?: number;
  section?: string | null;
  year: number;
  hostel?: string | null;
  hostel_name?: string | null;
  room_id?: string | null;
  account_status: AccountStatus;
  academic_status?: AcademicStatus | null;
  status_note?: string | null;
}

export interface StudentStatusUpdateRequest {
  account_status?: AccountStatus | null;
  academic_status?: AcademicStatus | null;
  status_note?: string | null;
}

// ── Admin: Faculty & Admins ───────────────────────────────────────────────────

export interface AdminItemResponse {
  id: string;
  user_id: string;
  name: string;
  email: string;
  account_status: AccountStatus;
  status_note?: string | null;
}

export interface FacultyItemResponse {
  id: string;
  user_id: string;
  name: string;
  email: string;
  photo_url?: string | null;
  department_id: string;
  department_name: string;
  designation: string;
  is_hod: boolean;
  account_status: AccountStatus;
  employment_status: EmploymentStatus;
  status_note?: string | null;
}

export interface FacultyCreateRequest {
  name: string;
  email: string;
  password?: string;
  department_id: string;
  designation: string;
}

export interface FacultyUpdateRequest {
  name?: string;
  email?: string;
  user_id?: string;
  photo_url?: string;
  department_id?: string;
  designation?: string;
  account_status?: AccountStatus;
  employment_status?: EmploymentStatus;
}

// ── Roles & Permissions ─────────────────────────────────────────────

export interface RoleResponse {
  id: string;
  name: string;
  description?: string | null;
  is_system_role: boolean;
  assignment_count: number;
}

export interface RoleCreateRequest {
  name: string;
  description?: string | null;
  permission_ids: string[];
}

export interface RoleUpdateRequest {
  name: string;
  description?: string | null;
}

export interface UpdatePermissionsRequest {
  permission_ids: string[];
}

export interface AssignRoleRequest {
  user_id: string;
}

export interface ActionMatrixItem {
  id: string;
  code: string;
  granted: boolean;
}

export interface AssetMatrixItem {
  id: string;
  name: string;
  actions: ActionMatrixItem[];
}

export interface PermissionMatrixResponse {
  assets: AssetMatrixItem[];
}

export type RoleTemplatesResponse = Record<string, string[]>;

// ── Query Params ────────────────────────────────────────────────────

export interface PaginationParams {
  skip?: number;
  limit?: number;
}

export interface AnalyticsParams {
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface SystemSetting {
  key: string;
  value: string | null;
  category: string;
  data_type: string;
  is_public: boolean;
  description: string | null;
}

export interface SystemSettingUpdate {
  value: string;
}

export interface ComplaintListParams extends PaginationParams {
  status?: ComplaintStatus | null;
  category?: ComplaintCategory | null;
  hostel?: string | null;
}

export interface StudentListParams extends PaginationParams {
  status?: AccountStatus | null;
}

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  is_completed: boolean;
  action_url: string;
}

export interface OnboardingStatusResponse {
  completion_percentage: number;
  tasks: OnboardingTask[];
}



// ── Infrastructure (Buildings & Rooms) ───────────────────────────────
export type BuildingType = 'academic' | 'hostel' | 'administrative' | 'sports' | 'other';

export interface Building {
  id: string;
  name: string;
  code: string;
  building_type: BuildingType;
  total_floors: number;
  is_active: boolean;
  created_at: string;
}

export interface BuildingCreateRequest {
  name: string;
  code: string;
  building_type: BuildingType;
  total_floors: number;
  is_active?: boolean;
}

export interface Room {
  id: string;
  building_id: string;
  room_number: string;
  floor: number;
  capacity: number;
  room_type: string;
  is_active: boolean;
  building_name?: string;
}

export interface RoomCreateRequest {
  building_id: string;
  room_number: string;
  floor: number;
  capacity: number;
  room_type: string;
  is_active?: boolean;
}

// ── Facilities (Gate Logs & Fees) ────────────────────────────────────
export type VisitorStatus = 'entered' | 'exited';

export interface VisitorLog {
  id: string;
  visitor_name: string;
  purpose: string;
  contact_number: string | null;
  vehicle_number: string | null;
  host_user_id: string | null;
  entry_time: string;
  exit_time: string | null;
  status: VisitorStatus;
  logged_by: string;
}

export interface VisitorLogCreate {
  visitor_name: string;
  purpose: string;
  contact_number?: string | null;
  vehicle_number?: string | null;
  host_user_id?: string | null;
}

export interface VisitorLogListResponse {
  items: VisitorLog[];
}

export type FeeStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export interface FeeDue {
  id: string;
  student_id: string;
  description: string;
  total_amount: number;
  paid_amount: number;
  status: FeeStatus;
  due_date: string;
  student_name?: string;
}

// ── Hostel Allocations ────────────────────────────────────────────────
export type AllocationStatus = 'active' | 'vacated';

export interface HostelAllocation {
  id: string;
  student_id: string;
  room_id: string;
  status: AllocationStatus;
  allocated_at?: string;
  vacated_at: string | null;
  created_at: string;
  updated_at: string | null;
  student_name?: string;
  student_email?: string;
  room_number?: string;
  building_name?: string;
  building_id?: string;
  room_capacity?: number;
  occupied_count?: number;
}


export interface HostelAllocationCreate {
  student_id: string;
  room_id: string;
}
