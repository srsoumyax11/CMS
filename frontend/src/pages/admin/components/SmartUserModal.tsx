import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { GlobalProfileAvatar } from '@/components/shared/GlobalProfileAvatar';
import { 
  Loader2, 
  UserCog, 
  Pencil, 
  Eye, 
  ShieldCheck, 
  ShieldOff, 
  Mail, 
  Phone, 
  Calendar, 
  FileText,
  UserCheck,
  Building,
  GraduationCap,
  Briefcase,
  Award,
  HeartHandshake
} from 'lucide-react';
import type { Department, AccountStatus, UserManagementItem } from '@/types/api';

export type SmartModalMode = 'view' | 'edit';

interface SmartUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserManagementItem | any | null;
  departments: Department[];
  activeTab?: 'all' | 'student' | 'faculty' | 'staff' | 'parent' | 'admin';
  initialMode?: SmartModalMode;
  onSave: (payload: {
    userId: string;
    userData: {
      name?: string;
      account_status?: AccountStatus;
      user_type?: string;
      phone?: string;
      status_note?: string;
    };
    profileData?: any;
    profileType?: 'student' | 'faculty' | 'staff' | 'parent';
  }) => Promise<void>;
  isPending: boolean;
  onPhotoChange?: (userId: string, file: File | null) => Promise<void>;
}

export function SmartUserModal({
  isOpen,
  onClose,
  user,
  departments,
  activeTab = 'all',
  initialMode = 'view',
  onSave,
  isPending,
  onPhotoChange,
}: SmartUserModalProps) {
  const [mode, setMode] = useState<SmartModalMode>(initialMode);

  // Core Form states
  const [name, setName] = useState('');
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('active');
  const [userType, setUserType] = useState<string>('student');
  const [phone, setPhone] = useState('');
  const [statusNote, setStatusNote] = useState('');

  // Student specific profile fields
  const [registrationNo, setRegistrationNo] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [academicStatus, setAcademicStatus] = useState('enrolled');

  // Faculty/Staff profile fields
  const [departmentId, setDepartmentId] = useState('');
  const [designation, setDesignation] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  // Parent profile fields
  const [relationshipType, setRelationshipType] = useState('Parent');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAccountStatus((user.account_status as AccountStatus) || 'active');
      setUserType(user.user_type || 'student');
      setPhone(user.phone || '');
      setStatusNote(user.status_note || '');

      setRegistrationNo(user.registration_no || '');
      setRollNo(user.roll_no || '');
      setAcademicStatus(user.academic_status || 'enrolled');

      setDepartmentId(user.department_id || '');
      setDesignation(user.designation || '');
      setEmployeeId(user.employee_id || '');

      setRelationshipType(user.relationship_type || 'Parent');
      setEmergencyName(user.emergency_name || '');
      setEmergencyPhone(user.emergency_phone || '');
    }
  }, [user]);

  if (!user) return null;

  const isAllTab = activeTab === 'all';
  
  // Tab-sensitive visibility logic: "All Users" tab strictly shows universal attributes ONLY.
  const showStudentCard = !isAllTab && (activeTab === 'student' || (!activeTab && user.user_type === 'student'));
  const showFacultyCard = !isAllTab && (activeTab === 'faculty' || (!activeTab && user.user_type === 'faculty'));
  const showStaffCard = !isAllTab && (activeTab === 'staff' || (!activeTab && user.user_type === 'staff'));
  const showParentCard = !isAllTab && (activeTab === 'parent' || (!activeTab && user.user_type === 'parent'));

  const formattedDate = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : '—';

  const userDept = departments.find((d) => d.id === (departmentId || user.department_id));

  const handleImageUpdate = async (file: File | null) => {
    if (onPhotoChange && user?.id) {
      await onPhotoChange(user.id, file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const userData: any = {
      name,
      account_status: accountStatus,
      user_type: userType,
      phone: phone || undefined,
      status_note: statusNote || undefined,
    };

    let profileData: any = null;
    let profileType: 'student' | 'faculty' | 'staff' | 'parent' | undefined = undefined;

    if (showStudentCard) {
      profileType = 'student';
      profileData = {
        registration_no: registrationNo || undefined,
        roll_no: rollNo || undefined,
        academic_status: academicStatus || undefined,
        department_id: departmentId || undefined,
      };
    } else if (showFacultyCard || showStaffCard) {
      profileType = showFacultyCard ? 'faculty' : 'staff';
      profileData = {
        department_id: departmentId || undefined,
        designation: designation || undefined,
        employee_id: employeeId || undefined,
      };
    } else if (showParentCard) {
      profileType = 'parent';
      profileData = {
        relationship_type: relationshipType || undefined,
        emergency_name: emergencyName || undefined,
        emergency_phone: emergencyPhone || undefined,
      };
    }

    await onSave({
      userId: user.id,
      userData,
      profileData,
      profileType,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6">
        {/* Modal Header */}
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <GlobalProfileAvatar
                src={user.photo_url}
                name={name || user.email}
                email={user.email}
                size="lg"
                editable={true}
                onImageChange={handleImageUpdate}
              />
              <div className="space-y-0.5">
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>{name || 'Unnamed User'}</span>
                  <Badge variant="outline" className="capitalize text-xs font-medium px-2 py-0.5 bg-muted/50 border-border">
                    {userType}
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3 text-muted-foreground/70" />
                  <span>{user.email}</span>
                </p>
              </div>
            </div>

            {/* Mode Switcher Button */}
            {mode === 'view' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMode('edit')}
                className="gap-1.5 text-xs h-8 shadow-2xs font-medium"
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                Edit Profile
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMode('view')}
                className="gap-1.5 text-xs h-8 font-medium"
              >
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                View Details
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* ── VIEW MODE CONTENT ── */}
        {mode === 'view' && (
          <div className="space-y-4 pt-3">
            {/* Identity & Contact Card */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Identity & Contact Information
              </h4>
              <div className="grid grid-cols-2 gap-y-3.5 gap-x-6">
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Full Name</span>
                  <span className="text-sm font-semibold text-foreground">{name || '—'}</span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Email Address</span>
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5 truncate">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Phone Number</span>
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                    <span>{phone || 'Not provided'}</span>
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">System Role</span>
                  <span className="text-xs font-semibold text-foreground capitalize">{userType}</span>
                </div>
              </div>
            </div>

            {/* Account Controls & Security Card */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                <UserCog className="h-4 w-4 text-primary" />
                Account Governance & Security
              </h4>
              <div className="grid grid-cols-2 gap-y-3.5 gap-x-6">
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Account Status</span>
                  <StatusBadge status={accountStatus} type="account" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">2FA Status</span>
                  {user.is_2fa_enabled ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs gap-1 px-2 py-0.5 font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" /> Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-muted/60 text-muted-foreground border-border text-xs gap-1 px-2 py-0.5 font-normal">
                      <ShieldOff className="h-3.5 w-3.5" /> Disabled
                    </Badge>
                  )}
                </div>
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Registration Date</span>
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                    <span>{formattedDate}</span>
                  </span>
                </div>
                {statusNote && (
                  <div className="col-span-2 bg-muted/40 p-3 rounded-lg border border-border space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary" /> Moderation / Audit Note:
                    </span>
                    <p className="text-xs text-foreground font-normal italic leading-relaxed">{statusNote}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Student Academic Profile Card */}
            {showStudentCard && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Student Academic Profile
                </h4>
                <div className="grid grid-cols-2 gap-y-3.5 gap-x-6">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Registration No</span>
                    <span className="text-xs font-mono font-semibold text-foreground">{registrationNo || user.registration_no || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Roll No</span>
                    <span className="text-xs font-mono font-semibold text-foreground">{rollNo || user.roll_no || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Department</span>
                    <span className="text-xs font-medium text-foreground">{userDept ? `${userDept.code} - ${userDept.name}` : (user.department_name || '—')}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Academic Status</span>
                    <StatusBadge status={academicStatus || user.academic_status} type="academic" />
                  </div>
                </div>
              </div>
            )}

            {/* Faculty Professional Profile Card */}
            {showFacultyCard && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                  <Building className="h-4 w-4 text-primary" />
                  Faculty Professional Profile
                </h4>
                <div className="grid grid-cols-2 gap-y-3.5 gap-x-6">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Employee ID</span>
                    <span className="text-xs font-mono font-semibold text-foreground">{employeeId || user.employee_id || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Designation</span>
                    <span className="text-xs font-semibold text-foreground">{designation || user.designation || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Department</span>
                    <span className="text-xs font-medium text-foreground">{userDept ? `${userDept.code} - ${userDept.name}` : (user.department_name || '—')}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Employment Status</span>
                    <Badge variant="outline" className="capitalize text-xs font-medium px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      {user.employment_status || 'Active'}
                    </Badge>
                  </div>
                  {user.is_hod && (
                    <div className="col-span-2 pt-1">
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs gap-1 px-2.5 py-1 font-semibold">
                        <Award className="h-3.5 w-3.5 text-amber-600" /> Head of Department (HOD)
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Staff Professional Profile Card */}
            {showStaffCard && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Staff Administrative Assignment
                </h4>
                <div className="grid grid-cols-2 gap-y-3.5 gap-x-6">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Employee ID</span>
                    <span className="text-xs font-mono font-semibold text-foreground">{employeeId || user.employee_id || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Designation</span>
                    <span className="text-xs font-semibold text-foreground">{designation || user.designation || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Department / Division</span>
                    <span className="text-xs font-medium text-foreground">{userDept ? `${userDept.code} - ${userDept.name}` : (user.department_name || 'General Administration')}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">Employment Status</span>
                    <Badge variant="outline" className="capitalize text-xs font-medium px-2 py-0.5 bg-blue-500/10 text-blue-600 border-blue-500/20">
                      {user.employment_status || 'Active'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Parent & Guardian Relationship Card */}
            {showParentCard && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                  <HeartHandshake className="h-4 w-4 text-primary" />
                  Parent & Guardian Details
                </h4>
                <div className="grid grid-cols-2 gap-y-3.5 gap-x-6">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Relationship Type</span>
                    <span className="text-xs font-semibold text-foreground capitalize">{user.relationship_type || relationshipType || 'Parent'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Associated Student</span>
                    <span className="text-xs font-semibold text-foreground">{user.associated_student_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Student Reg No</span>
                    <span className="text-xs font-mono font-medium text-foreground">{user.associated_student_reg_no || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Emergency Contact</span>
                    <span className="text-xs font-medium text-foreground">{user.emergency_name || 'Not provided'}</span>
                  </div>
                  {user.emergency_phone && (
                    <div className="col-span-2">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-0.5">Emergency Phone</span>
                      <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                        <span>{user.emergency_phone}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-border">
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto text-xs">
                Close
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── EDIT MODE CONTENT ── */}
        {mode === 'edit' && (
          <form onSubmit={handleSubmit} className="space-y-5 pt-3">
            {/* Account Details Form */}
            <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">
                Edit Core Account Attributes
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="edit-name" className="text-xs font-medium">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-status" className="text-xs font-medium">Account Status</Label>
                  <Select
                    value={accountStatus}
                    onValueChange={(val) => setAccountStatus(val as AccountStatus)}
                  >
                    <SelectTrigger id="edit-status" className="h-9 text-xs">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="revision">Revision Required</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-role" className="text-xs font-medium">System Role / User Type</Label>
                  <Select value={userType} onValueChange={(val) => setUserType(val)}>
                    <SelectTrigger id="edit-role" className="h-9 text-xs">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="edit-phone" className="text-xs font-medium">Phone Number</Label>
                  <Input
                    id="edit-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor="edit-status-note" className="text-xs font-medium">Status Audit / Moderation Note</Label>
                  <Textarea
                    id="edit-status-note"
                    rows={2}
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Add audit note for account status change..."
                    className="text-xs resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Student Specific Profile Form */}
            {showStudentCard && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">
                  Student Academic Profile
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-reg-no" className="text-xs font-medium">Registration No</Label>
                    <Input
                      id="edit-reg-no"
                      value={registrationNo}
                      onChange={(e) => setRegistrationNo(e.target.value)}
                      placeholder="e.g. REG-2024-001"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-roll-no" className="text-xs font-medium">Roll No</Label>
                    <Input
                      id="edit-roll-no"
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      placeholder="e.g. CS202401"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-academic-status" className="text-xs font-medium">Academic Status</Label>
                    <Select value={academicStatus} onValueChange={(val) => setAcademicStatus(val)}>
                      <SelectTrigger id="edit-academic-status" className="h-9 text-xs">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enrolled">Enrolled</SelectItem>
                        <SelectItem value="graduated">Graduated</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                        <SelectItem value="expelled">Expelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-student-dept" className="text-xs font-medium">Department</Label>
                    <Select value={departmentId} onValueChange={(val) => setDepartmentId(val)}>
                      <SelectTrigger id="edit-student-dept" className="h-9 text-xs">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.code} - {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Faculty / Staff Profile Form */}
            {(showFacultyCard || showStaffCard) && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">
                  {showFacultyCard ? 'Faculty Professional Assignment' : 'Staff Administrative Assignment'}
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-emp-id" className="text-xs font-medium">Employee ID</Label>
                    <Input
                      id="edit-emp-id"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="e.g. EMP-001"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-designation" className="text-xs font-medium">Designation</Label>
                    <Input
                      id="edit-designation"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Associate Professor"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="edit-faculty-dept" className="text-xs font-medium">Department</Label>
                    <Select value={departmentId} onValueChange={(val) => setDepartmentId(val)}>
                      <SelectTrigger id="edit-faculty-dept" className="h-9 text-xs">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.code} - {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Parent Profile Form */}
            {showParentCard && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-4 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">
                  Parent / Guardian Details
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-rel-type" className="text-xs font-medium">Relationship Type</Label>
                    <Select value={relationshipType} onValueChange={(val) => setRelationshipType(val)}>
                      <SelectTrigger id="edit-rel-type" className="h-9 text-xs">
                        <SelectValue placeholder="Select Relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Father">Father</SelectItem>
                        <SelectItem value="Mother">Mother</SelectItem>
                        <SelectItem value="Guardian">Guardian</SelectItem>
                        <SelectItem value="Parent">Parent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-emergency-name" className="text-xs font-medium">Emergency Contact Name</Label>
                    <Input
                      id="edit-emergency-name"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="Full Name"
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="edit-emergency-phone" className="text-xs font-medium">Emergency Contact Phone</Label>
                    <Input
                      id="edit-emergency-phone"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setMode('view')} disabled={isPending} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="text-xs">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
