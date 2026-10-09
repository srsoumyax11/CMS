import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { applicationsApi, type RoleApplicationData } from '@/api/applicationsApi';
import { metadataApi } from '@/api/metadataApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Users,
  UserCheck,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  RefreshCw,
  FileCheck,
  Building2,
  Calendar,
  Hash,
} from 'lucide-react';

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

  const [idChecking, setIdChecking] = useState(false);
  const [idAvailable, setIdAvailable] = useState<boolean | null>(null);
  const [idCheckMessage, setIdCheckMessage] = useState('');

  const handleIdentifierCheck = async (role: string, value: string) => {
    if (!value || value.length < 3) {
      setIdAvailable(null);
      setIdCheckMessage('');
      return;
    }
    setIdChecking(true);
    try {
      const res = await applicationsApi.checkIdentifier(role, value);
      setIdAvailable(res.data?.available ?? true);
      setIdCheckMessage((res as any).message || '');
    } catch {
      setIdAvailable(null);
    } finally {
      setIdChecking(false);
    }
  };

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
      const extractItems = (r: any): MetadataItem[] => {
        const payload = r?.data?.data;
        if (Array.isArray(payload)) return payload;
        if (payload && Array.isArray(payload.items)) return payload.items;
        if (Array.isArray(r?.data)) return r.data;
        return [];
      };

      metadataApi.getCourses().then((r) => setCourses(extractItems(r))).catch(() => {});
      metadataApi.getDepartments().then((r) => setDepartments(extractItems(r))).catch(() => {});
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
      if (idAvailable === false) {
        setError('This Registration / Roll Number is already registered.');
        setSubmitting(false);
        return;
      }
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
      if (idAvailable === false) {
        setError('This Employee ID is already registered.');
        setSubmitting(false);
        return;
      }
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
      if (idAvailable === false) {
        setError('This Employee ID is already registered.');
        setSubmitting(false);
        return;
      }
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
      setSuccessMsg('Role verification request submitted successfully! Administration will review your request.');
      setSelectedRole(null);
    } catch (err: any) {
      const serverMsg = err.response?.data?.error || err.response?.data?.detail || err.response?.data?.message;
      setError(serverMsg || 'Failed to submit role request. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // GUARD 1: Admin Account State
  // --------------------------------------------------------------------------
  if (user?.user_type === 'admin') {
    return (
      <Card className="shadow-card border-border bg-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-blue-600 to-indigo-600" />
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10">
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-xl bg-primary text-primary-foreground shadow-sm shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold tracking-tight text-foreground">
                    Administrator Privileges Active
                  </h3>
                  <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 uppercase text-[10px] tracking-wider font-semibold">
                    Superuser Access
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                  You hold full administrative system governance over BPUT CMS. Role elevation requests are unnecessary and restricted for administrator accounts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-card border border-border px-3.5 py-2 rounded-lg shadow-sm shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>System Access: Unrestricted</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // GUARD 2: Already Verified Domain Role (Student, Faculty, Staff, Parent)
  // --------------------------------------------------------------------------
  if (user && user.user_type !== 'user') {
    return (
      <Card className="shadow-card border-border bg-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20">
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold tracking-tight text-foreground">
                    Institutional Role Verified
                  </h3>
                  <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 capitalize text-xs font-semibold">
                    {user.user_type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                  Your account is registered as an active <strong className="capitalize text-foreground">{user.user_type}</strong>. All workspace features, academic tools, and domain portals are enabled.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-lg shrink-0">
              <FileCheck className="w-4 h-4" />
              <span>Verification Status: Active</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <Card className="shadow-card border-border bg-card">
        <CardContent className="py-16 text-center text-muted-foreground space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm font-medium">Fetching application status...</p>
        </CardContent>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // ACTIVE PENDING / SUBMITTED APPLICATION STATE
  // --------------------------------------------------------------------------
  const normalizedStatus = (appStatus?.status || '').toLowerCase();
  const isPendingStatus = normalizedStatus === 'pending' || normalizedStatus === 'submitted';

  if (appStatus && isPendingStatus) {
    const regId =
      appStatus.application_data?.registration_no ||
      appStatus.application_data?.employee_id ||
      appStatus.application_data?.student_id_str ||
      'Submitted';

    return (
      <Card className="shadow-card border-border bg-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
        <CardHeader className="p-6 sm:p-8 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                  Verification Status
                </CardTitle>
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 uppercase text-[10px] tracking-wider font-semibold">
                  Under Review
                </Badge>
              </div>
              <CardDescription className="text-sm text-muted-foreground">
                Your institutional role elevation request is in progress.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/50 border border-border px-3 py-1.5 rounded-md self-start sm:self-auto">
              <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>Submitted: {new Date(appStatus.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 pb-8 space-y-6">
          {/* Status Timeline / Steps */}
          <div className="p-6 rounded-2xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-950/10 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-amber-500/15 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Application Under Review</h4>
                  <p className="text-xs text-muted-foreground">
                    Target Role:{' '}
                    <span className="font-semibold uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                      {appStatus.target_role}
                    </span>
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStatus}
                className="gap-2 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 self-start md:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Check Update
              </Button>
            </div>

            {/* Workflow Progress Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-card border border-emerald-500/30 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  ✓
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">1. Application Sent</p>
                  <p className="text-[11px] text-muted-foreground">Request registered</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 animate-pulse">
                  2
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">2. Admin Verification</p>
                  <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">In Progress</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-card/60 border border-border opacity-70 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">3. Access Unlocked</p>
                  <p className="text-[11px] text-muted-foreground">Pending Approval</p>
                </div>
              </div>
            </div>

            {/* Details Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-card border border-border/80 text-xs">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Identifier / ID</span>
                  <span className="font-mono font-bold text-foreground">{regId}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Requested Role</span>
                  <span className="font-semibold text-foreground uppercase">{appStatus.target_role}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Submission Date</span>
                  <span className="font-semibold text-foreground">{new Date(appStatus.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Campus Administration will verify your records shortly. You will be notified automatically upon approval.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // STATE 5: REVISION REQUESTED / REJECTED APPLICATION STATE
  // --------------------------------------------------------------------------
  if (appStatus && (normalizedStatus === 'rejected' || normalizedStatus === 'revision')) {
    return (
      <Card className="shadow-card border-border bg-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-rose-500 to-destructive" />
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="p-6 rounded-2xl border border-destructive/30 bg-destructive/5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-destructive/15 text-destructive shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {normalizedStatus === 'revision' ? 'Revision Requested by Admin' : 'Role Request Declined'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Target Role: <span className="font-semibold uppercase text-destructive">{appStatus.target_role}</span>
                </p>
              </div>
            </div>

            {appStatus.admin_notes && (
              <div className="p-4 rounded-xl bg-card border border-destructive/20 text-xs space-y-1">
                <span className="font-bold text-destructive uppercase tracking-wider text-[10px]">Administrator Feedback:</span>
                <p className="text-foreground leading-relaxed">{appStatus.admin_notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Please review the feedback above and submit an updated application.
              </p>
              <Button size="sm" onClick={() => setAppStatus(null)} className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" /> Re-apply Role
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --------------------------------------------------------------------------
  // STATE 6: ROLE SELECTION & REGISTRATION FORM (Default View)
  // --------------------------------------------------------------------------
  return (
    <Card className="shadow-card border-border bg-card overflow-hidden transition-all duration-300">
      <div className="h-1.5 bg-gradient-to-r from-primary via-blue-600 to-indigo-600" />
      <CardHeader className="p-6 sm:p-8 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 px-2.5 py-0.5 text-[11px] font-semibold">
                <Sparkles className="w-3 h-3" /> Campus Access Engine
              </Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground pt-1">
              Verify & Elevate Account Role
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              Select your institutional role on campus (Student, Parent, Faculty, or Staff) to verify your credentials and unlock domain-specific modules.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6 sm:px-8 pb-8 space-y-6">
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm flex items-center gap-3 animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 rounded-xl text-sm flex items-center gap-3 animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ----------------------------------------------------------------------
            ROLE SELECTION CARDS GRID
           ---------------------------------------------------------------------- */}
        {!selectedRole && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Student Card */}
            <div
              onClick={() => setSelectedRole('student')}
              className="p-5 rounded-2xl border border-border hover:border-primary/50 bg-card hover:bg-accent/40 text-left transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-md flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-200">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] tracking-wider uppercase font-semibold">
                    Academic Portal
                  </Badge>
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">
                    Student
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    Enrolled students seeking access to course registration, class timetables, and academic records.
                  </p>
                </div>
              </div>

              <div className="flex items-center text-xs font-semibold text-primary pt-2 border-t border-border/50">
                <span>Select & Register</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Parent Card */}
            <div
              onClick={() => setSelectedRole('parent')}
              className="p-5 rounded-2xl border border-border hover:border-emerald-500/50 bg-card hover:bg-emerald-500/5 text-left transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-md flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-200">
                    <Users className="w-6 h-6" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] tracking-wider uppercase font-semibold">
                    Parental Monitor
                  </Badge>
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Parent / Guardian
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    Parents or legal guardians looking to track attendance, fee dues, and child academic progress.
                  </p>
                </div>
              </div>

              <div className="flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 pt-2 border-t border-border/50">
                <span>Link Child Student</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Faculty Card */}
            <div
              onClick={() => setSelectedRole('faculty')}
              className="p-5 rounded-2xl border border-border hover:border-blue-500/50 bg-card hover:bg-blue-500/5 text-left transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-md flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-200">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] tracking-wider uppercase font-semibold">
                    Faculty Suite
                  </Badge>
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Faculty Member
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    Teaching staff needing attendance marking tools, syllabus management, and student grading access.
                  </p>
                </div>
              </div>

              <div className="flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 pt-2 border-t border-border/50">
                <span>Submit Faculty ID</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Staff Card */}
            <div
              onClick={() => setSelectedRole('staff')}
              className="p-5 rounded-2xl border border-border hover:border-purple-500/50 bg-card hover:bg-purple-500/5 text-left transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-md flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-200">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <Badge variant="secondary" className="text-[10px] tracking-wider uppercase font-semibold">
                    Operations
                  </Badge>
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-base group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Institutional Staff
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    Administrative and support personnel managing department logistics, hostel care, or operational desks.
                  </p>
                </div>
              </div>

              <div className="flex items-center text-xs font-semibold text-purple-600 dark:text-purple-400 pt-2 border-t border-border/50">
                <span>Submit Staff Access</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------
            DYNAMIC ROLE REGISTRATION FORM
           ---------------------------------------------------------------------- */}
        {selectedRole && (
          <form onSubmit={handleSubmit} className="space-y-6 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Header with back button */}
            <div className="flex items-center justify-between border-b pb-4 border-border">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={() => {
                    setSelectedRole(null);
                    setError(null);
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Selection
                </Button>
                <div className="h-4 w-px bg-border hidden sm:block" />
                <h3 className="font-bold text-base text-foreground capitalize flex items-center gap-2">
                  <span>{selectedRole} Role Verification</span>
                </h3>
              </div>
              <Badge variant="outline" className="capitalize text-xs font-semibold bg-accent">
                Step 2 of 2
              </Badge>
            </div>

            {/* Student Specific Form Fields */}
            {selectedRole === 'student' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      BPUT Registration No. / Roll Number <span className="text-destructive">*</span>
                    </Label>
                    {idChecking && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" /> Validating...
                      </span>
                    )}
                    {idAvailable === true && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Available
                      </span>
                    )}
                    {idAvailable === false && (
                      <span className="text-xs text-destructive font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Already Registered
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder="e.g. 2101102034 or 23/CSE/042"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    onBlur={() => handleIdentifierCheck('student', rollNumber)}
                    required
                    className="h-10 text-sm"
                  />
                  {idAvailable === false && (
                    <p className="text-xs text-destructive pt-0.5">
                      {idCheckMessage || 'This Registration Number is already registered in the system.'}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Department <span className="text-destructive">*</span>
                    </Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">
                      Course <span className="text-destructive">*</span>
                    </Label>
                    <Select value={courseId} onValueChange={setCourseId}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select Course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {(c as any).code ? `${(c as any).code} - ${c.name}` : c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5 max-w-xs">
                  <Label className="text-xs font-semibold text-foreground">
                    Current Academic Year <span className="text-destructive">*</span>
                  </Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year (Sem 1 & 2)</SelectItem>
                      <SelectItem value="2">2nd Year (Sem 3 & 4)</SelectItem>
                      <SelectItem value="3">3rd Year (Sem 5 & 6)</SelectItem>
                      <SelectItem value="4">4th Year (Sem 7 & 8)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Parent Specific Form Fields */}
            {selectedRole === 'parent' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Child Student ID / BPUT Roll Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Enter student roll number or institutional email"
                    value={childStudentId}
                    onChange={(e) => setChildStudentId(e.target.value)}
                    required
                    className="h-10 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Used to associate your account with your child's student record.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Relationship</Label>
                    <Select value={relationshipType} onValueChange={setRelationshipType}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select Relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Father">Father</SelectItem>
                        <SelectItem value="Mother">Mother</SelectItem>
                        <SelectItem value="Guardian">Guardian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Emergency Contact Number</Label>
                    <Input
                      placeholder="+91 9876543210"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Faculty / Staff Specific Form Fields */}
            {(selectedRole === 'faculty' || selectedRole === 'staff') && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      Employee ID <span className="text-destructive">*</span>
                    </Label>
                    {idChecking && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" /> Validating...
                      </span>
                    )}
                    {idAvailable === true && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Available
                      </span>
                    )}
                    {idAvailable === false && (
                      <span className="text-xs text-destructive font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Already Registered
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder="e.g. EMP-1092"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    onBlur={() => handleIdentifierCheck(selectedRole, employeeId)}
                    required
                    className="h-10 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Department</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedRole === 'faculty' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground">
                        Course <span className="text-destructive">*</span>
                      </Label>
                      <Select value={courseId} onValueChange={setCourseId}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Select Course" />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {(c as any).code ? `${(c as any).code} - ${c.name}` : c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Designation <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Assistant Professor / Lab Technician / Registrar"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    required
                    className="h-10 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>All verification requests are securely logged and audited.</span>
              </p>
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto gap-2 px-6 h-10 text-sm font-semibold">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Request
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
