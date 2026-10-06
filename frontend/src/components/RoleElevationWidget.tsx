import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { applicationsApi, type RoleApplicationData } from '@/api/applicationsApi';
import { metadataApi } from '@/api/metadataApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Users, UserCheck, Briefcase, CheckCircle2, Clock, AlertCircle, Send, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';

interface MetadataItem {
  id: string;
  name: string;
  code?: string;
}

export const RoleElevationWidget: React.FC = () => {
  const { user } = useAuth();
  const [appStatus, setAppStatus] = useState<RoleApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [selectedRole, setSelectedRole] = useState<'student' | 'parent' | 'faculty' | 'staff' | null>(null);

  // Form Fields
  const [courses, setCourses] = useState<MetadataItem[]>([]);
  const [departments, setDepartments] = useState<MetadataItem[]>([]);

  // Student fields
  const [rollNumber, setRollNumber] = useState('');
  const [courseId, setCourseId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [year, setYear] = useState('1');

  // Parent fields
  const [childStudentId, setChildStudentId] = useState('');
  const [relationshipType, setRelationshipType] = useState('Father');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Faculty / Staff fields
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('');

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await applicationsApi.getMyStatus();
      setAppStatus(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (selectedRole === 'student' || selectedRole === 'faculty' || selectedRole === 'staff') {
      metadataApi.getCourses().then((r) => setCourses(r.data.data || [])).catch(() => {});
      metadataApi.getDepartments().then((r) => setDepartments(r.data.data || [])).catch(() => {});
    }
  }, [selectedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    let payload: Record<string, any> = {};
    if (selectedRole === 'student') {
      if (!rollNumber || !courseId || !departmentId) {
        setError('Please fill out all required fields: Registration / Roll Number, Course, and Department.');
        setSubmitting(false);
        return;
      }
      const trimmedRoll = rollNumber.trim();
      const yr = parseInt(year) || 1;
      const admYear = new Date().getFullYear() - (yr - 1);
      payload = {
        registration_no: trimmedRoll,
        roll_no: trimmedRoll,
        user_id_str: trimmedRoll,
        course_id: courseId,
        department_id: departmentId,
        year: yr,
        admission_year: admYear,
        current_semester: (yr - 1) * 2 + 1,
        section: 'A',
      };
    } else if (selectedRole === 'parent') {
      if (!childStudentId) {
        setError("Please enter your child's Student ID or Roll Number.");
        setSubmitting(false);
        return;
      }
      payload = {
        student_id_str: childStudentId,
        relationship_type: relationshipType,
        emergency_contact: emergencyContact || null,
      };
    } else if (selectedRole === 'faculty') {
      if (!employeeId || !courseId || !departmentId || !designation) {
        setError('Please fill out Employee ID, Course, Department, and Designation.');
        setSubmitting(false);
        return;
      }
      payload = {
        employee_id: employeeId,
        course_id: courseId,
        department_id: departmentId,
        designation,
      };
    } else if (selectedRole === 'staff') {
      if (!employeeId || !designation) {
        setError('Please fill out Employee ID and Designation.');
        setSubmitting(false);
        return;
      }
      payload = {
        employee_id: employeeId,
        department_id: departmentId || null,
        designation,
      };
    }

    try {
      const res = await applicationsApi.apply(selectedRole, payload);
      setAppStatus(res.data);
      setSuccessMsg('Role request submitted successfully! We will notify you once reviewed by administration.');
      setSelectedRole(null);
    } catch (err: any) {
      const serverMsg = err.response?.data?.error || err.response?.data?.detail || err.response?.data?.message;
      setError(serverMsg || 'Failed to submit role request. Please check your data.');
    } finally {

      setSubmitting(false);
    }
  };

  // Guard 1: Admin Account State (Admins cannot apply or be demoted)
  if (user?.user_type === 'admin') {
    return (
      <Card className="shadow-sm border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Account Role</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            System administrative access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-foreground">Administrator Privileges Active</h4>
              <p className="text-sm text-muted-foreground">
                You hold administrative access over the platform. Role applications are restricted for admin accounts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Guard 2: Already Verified Domain Role (student, faculty, staff, parent)
  if (user && user.user_type !== 'user') {
    return (
      <Card className="shadow-sm border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Account Role</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Your active role on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/10 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-foreground">Role Verified & Active</h4>
              <p className="text-sm text-muted-foreground">
                Your account is registered as <strong className="capitalize text-foreground">{user.user_type}</strong> with full access enabled.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="shadow-sm border-border bg-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm">Loading role status...</p>
        </CardContent>
      </Card>
    );
  }

  // Active Pending Application State
  if (appStatus && appStatus.status === 'pending') {
    return (
      <Card className="shadow-sm border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Request Account Role</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            View the current status of your submitted campus role request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 rounded-xl border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/10 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-foreground">Application Under Review</h4>
                <p className="text-xs text-muted-foreground">
                  Target Role: <span className="font-semibold uppercase text-amber-600 dark:text-amber-400">{appStatus.target_role}</span>
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your application for the <strong className="capitalize text-foreground">{appStatus.target_role}</strong> role has been received and is currently being verified by Campus Administration.
            </p>
            <div className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Submitted on {new Date(appStatus.created_at).toLocaleDateString()}. You will receive a notification upon approval.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">Request Account Role</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Select your role on campus (Student, Parent, Faculty, or Staff) to unlock specialized domain features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Role Selection Cards */}
        {!selectedRole && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              onClick={() => setSelectedRole('student')}
              className="p-5 rounded-xl border border-border hover:border-primary/50 bg-card hover:bg-accent/40 text-left transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-foreground text-base">Student</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Register with your Roll Number, Department, and Course details.
              </p>
            </div>

            <div
              onClick={() => setSelectedRole('parent')}
              className="p-5 rounded-xl border border-border hover:border-primary/50 bg-card hover:bg-accent/40 text-left transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-foreground text-base">Parent</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Link your child's Roll Number to track academic progress and attendance.
              </p>
            </div>

            <div
              onClick={() => setSelectedRole('faculty')}
              className="p-5 rounded-xl border border-border hover:border-primary/50 bg-card hover:bg-accent/40 text-left transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-foreground text-base">Faculty</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Submit Employee ID and Department for teaching and academic access.
              </p>
            </div>

            <div
              onClick={() => setSelectedRole('staff')}
              className="p-5 rounded-xl border border-border hover:border-primary/50 bg-card hover:bg-accent/40 text-left transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-foreground text-base">Staff</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Apply for administrative and operational staff access.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Form per Role */}
        {selectedRole && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="flex items-center justify-between border-b pb-3 border-border">
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedRole(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold text-base text-foreground capitalize">
                  {selectedRole} Role Request
                </h3>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedRole(null)}>
                Change Role
              </Button>
            </div>

            {selectedRole === 'student' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">BPUT Registration No. / Roll Number *</Label>
                  <Input placeholder="e.g. 2101102034 or 23/CSE/042" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} required className="h-9" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Department *</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select Department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Course *</Label>
                    <Select value={courseId} onValueChange={setCourseId}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select Course" /></SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{(c as any).code ? `${(c as any).code} - ${c.name}` : c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Current Year *</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select Year" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {selectedRole === 'parent' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Child Student ID / Roll Number *</Label>
                  <Input placeholder="Enter student roll number or email" value={childStudentId} onChange={(e) => setChildStudentId(e.target.value)} required className="h-9" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Relationship</Label>
                    <Select value={relationshipType} onValueChange={setRelationshipType}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select Relationship" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Father">Father</SelectItem>
                        <SelectItem value="Mother">Mother</SelectItem>
                        <SelectItem value="Guardian">Guardian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Emergency Contact Number</Label>
                    <Input placeholder="+91 9876543210" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} className="h-9" />
                  </div>
                </div>
              </>
            )}

            {(selectedRole === 'faculty' || selectedRole === 'staff') && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Employee ID *</Label>
                  <Input placeholder="e.g. EMP-1092" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required className="h-9" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Department</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select Department" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRole === 'faculty' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Course *</Label>
                      <Select value={courseId} onValueChange={setCourseId}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Select Course" /></SelectTrigger>
                        <SelectContent>
                          {courses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Designation *</Label>
                  <Input placeholder="e.g. Assistant Professor / Lab Technician" value={designation} onChange={(e) => setDesignation(e.target.value)} required className="h-9" />
                </div>
              </>
            )}

            <div className="pt-2">
              <Button type="submit" disabled={submitting} className="w-full gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting Request...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Role Request
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

