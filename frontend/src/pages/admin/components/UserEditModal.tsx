import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UserCog } from 'lucide-react';
import type { Department, AccountStatus } from '@/types/api';

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any | null;
  departments: Department[];
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
    profileType?: 'student' | 'faculty';
  }) => Promise<void>;
  isPending: boolean;
}

export function UserEditModal({
  isOpen,
  onClose,
  user,
  departments,
  onSave,
  isPending,
}: UserEditModalProps) {
  const [name, setName] = useState('');
  const [accountStatus, setAccountStatus] = useState<AccountStatus>('active');
  const [userType, setUserType] = useState<string>('student');
  const [phone, setPhone] = useState('');
  const [statusNote, setStatusNote] = useState('');

  // Student specific profile fields
  const [registrationNo, setRegistrationNo] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [academicStatus, setAcademicStatus] = useState('enrolled');

  // Faculty/Staff specific profile fields
  const [departmentId, setDepartmentId] = useState('');
  const [designation, setDesignation] = useState('');

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
    }
  }, [user]);

  if (!user) return null;

  const isStudent = user.user_type === 'student' || 'roll_no' in user || 'academic_status' in user;
  const isFacultyOrStaff = user.user_type === 'faculty' || user.user_type === 'staff' || 'designation' in user;

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
    let profileType: 'student' | 'faculty' | undefined = undefined;

    if (isStudent) {
      profileType = 'student';
      profileData = {
        registration_no: registrationNo || undefined,
        roll_no: rollNo || undefined,
        academic_status: academicStatus || undefined,
        department_id: departmentId || undefined,
      };
    } else if (isFacultyOrStaff) {
      profileType = 'faculty';
      profileData = {
        department_id: departmentId || undefined,
        designation: designation || undefined,
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <UserCog className="h-5 w-5 text-primary" />
            Edit User Profile ({user.email})
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Main Account Details */}
          <div className="space-y-3 border-b pb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Account Details
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-status">Account Status</Label>
                <Select
                  value={accountStatus}
                  onValueChange={(val) => setAccountStatus(val as AccountStatus)}
                >
                  <SelectTrigger id="edit-status">
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
                <Label htmlFor="edit-role">System Role / User Type</Label>
                <Select value={userType} onValueChange={(val) => setUserType(val)}>
                  <SelectTrigger id="edit-role">
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
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                />
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="edit-status-note">Status Audit Note</Label>
                <Textarea
                  id="edit-status-note"
                  rows={2}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Add note for account status change..."
                />
              </div>
            </div>
          </div>

          {/* Student Specific Profile Fields */}
          {isStudent && (
            <div className="space-y-3 border-b pb-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Student Profile Information
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-reg-no">Registration No</Label>
                  <Input
                    id="edit-reg-no"
                    value={registrationNo}
                    onChange={(e) => setRegistrationNo(e.target.value)}
                    placeholder="e.g. REG-2024-001"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-roll-no">Roll No</Label>
                  <Input
                    id="edit-roll-no"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    placeholder="e.g. CS202401"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-academic-status">Academic Status</Label>
                  <Select value={academicStatus} onValueChange={(val) => setAcademicStatus(val)}>
                    <SelectTrigger id="edit-academic-status">
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
                  <Label htmlFor="edit-student-dept">Department</Label>
                  <Select value={departmentId} onValueChange={(val) => setDepartmentId(val)}>
                    <SelectTrigger id="edit-student-dept">
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

          {/* Faculty / Staff Profile Fields */}
          {isFacultyOrStaff && (
            <div className="space-y-3 border-b pb-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Faculty / Staff Details
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-faculty-dept">Department</Label>
                  <Select value={departmentId} onValueChange={(val) => setDepartmentId(val)}>
                    <SelectTrigger id="edit-faculty-dept">
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

                <div className="space-y-1.5">
                  <Label htmlFor="edit-designation">Designation</Label>
                  <Input
                    id="edit-designation"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Associate Professor"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
