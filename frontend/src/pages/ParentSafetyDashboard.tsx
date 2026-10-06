import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Bell, 
  Coffee, 
  Mail, 
  User, 
  Activity,
  Award,
  Lock,
  Eye,
  MapPin,
  FileCheck,
  UserPlus,
  Send,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { gatePassApi, ParentSafetyDashboardResponse } from '@/api/gatePassApi';
import { parentLinkApi } from '@/api/parentLinkApi';
import { QUERY_KEYS } from '@/lib/constants';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export const ParentSafetyDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(undefined);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [studentIdentifier, setStudentIdentifier] = useState('');
  const [relationshipType, setRelationshipType] = useState('PARENT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  const { data: dashboardRes, isLoading, error } = useQuery({
    queryKey: [QUERY_KEYS.PARENT_SAFETY, selectedStudentId],
    queryFn: async () => {
      const res = await gatePassApi.getParentSafetyDashboard(selectedStudentId);
      return res.data.data;
    },
    refetchInterval: 15000,
  });

  const dashboard = dashboardRes as ParentSafetyDashboardResponse | undefined;

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdentifier.trim()) return;
    setIsSubmitting(true);
    setLinkError(null);
    setLinkSuccess(null);

    try {
      await parentLinkApi.requestLink({
        student_identifier: studentIdentifier.trim(),
        relationship_type: relationshipType,
      });
      setLinkSuccess('Link request sent! The student will be notified to review and approve.');
      setStudentIdentifier('');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PARENT_SAFETY] });
    } catch (err: any) {
      setLinkError(
        err.response?.data?.detail || 'Failed to submit link request. Verify student roll number or email.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <PageHeader
          title="Guardian View"
          description="Connecting to real-time student location & progress portal..."
          icon={ShieldCheck}
        />
        <div className="flex flex-col items-center justify-center p-12 rounded-xl border bg-card text-card-foreground shadow-sm space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Syncing Guardian Telemetry & Gate Pass Data...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    const errorMsg = (error as any)?.response?.data?.detail || 'Parent account is not linked to an approved student profile.';
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <PageHeader
          title="Guardian View"
          description="Access student status, attendance, and campus gate logs."
          icon={ShieldCheck}
        />
        <Card className="shadow-sm border-amber-500/20">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">Student Link Required</h2>
              <p className="text-xs text-muted-foreground max-w-md">
                {errorMsg}
              </p>
            </div>

            {/* Inline Link Form */}
            <form onSubmit={handleLinkSubmit} className="w-full max-w-md space-y-3 pt-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter Student Roll No or Email (e.g. STU12345)"
                  value={studentIdentifier}
                  onChange={(e) => setStudentIdentifier(e.target.value)}
                  className="text-xs"
                  required
                />
                <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5 shrink-0">
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Request Link
                </Button>
              </div>
              {linkError && (
                <p className="text-xs text-destructive text-left font-medium">{linkError}</p>
              )}
              {linkSuccess && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 text-left font-medium flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> {linkSuccess}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getLocationBadge = () => {
    switch (dashboard.location_status) {
      case 'OVERDUE':
        return {
          bg: 'bg-destructive/10 border-destructive/30 text-destructive',
          text: '🚨 OVERDUE RETURN ALERT',
          sub: 'Student return time exceeded. Warden & security alerted.',
          dot: 'bg-destructive animate-ping',
        };
      case 'CASUAL_EXIT':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300',
          text: '☕ OUT ON CASUAL BREAK',
          sub: `Expected return by ${
            dashboard.active_gate_pass
              ? new Date(dashboard.active_gate_pass.expected_return_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Soon'
          }`,
          dot: 'bg-amber-500 animate-pulse',
        };
      case 'RESTRICTED_BY_STUDENT':
        return {
          bg: 'bg-muted border-border text-muted-foreground',
          text: '🔒 LOCATION RESTRICTED',
          sub: 'Location sharing paused per student privacy consent settings.',
          dot: 'bg-muted-foreground',
        };
      case 'ON_CAMPUS':
      default:
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
          text: '🟢 SAFELY INSIDE CAMPUS',
          sub: 'Hostel & Main Campus Location Verified',
          dot: 'bg-emerald-500 animate-pulse',
        };
    }
  };

  const statusBadge = getLocationBadge();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Link Student Modal */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" /> Link Another Student
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter the student's email or roll number to submit a linking request. The student must approve the request in their profile settings.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLinkSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Student Email or Roll Number</label>
              <Input
                placeholder="e.g. student@university.edu or STU2024001"
                value={studentIdentifier}
                onChange={(e) => setStudentIdentifier(e.target.value)}
                className="text-xs"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Relationship Type</label>
              <select
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
                className="w-full h-9 text-xs rounded-md border border-input bg-transparent px-3"
              >
                <option value="PARENT">Parent (Father / Mother)</option>
                <option value="GUARDIAN">Guardian</option>
                <option value="EMERGENCY_CONTACT">Emergency Contact</option>
              </select>
            </div>

            {linkError && (
              <p className="text-xs text-destructive font-medium">{linkError}</p>
            )}
            {linkSuccess && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> {linkSuccess}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowLinkModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting} className="gap-1.5">
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send Request
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Page Header */}
      <PageHeader
        title="Guardian View"
        description="Live child location status, attendance safeguards, and academic progress monitoring."
        icon={ShieldCheck}
        badge={
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary gap-1 font-medium text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Gate Event Sync (15s Poll)
          </Badge>
        }
        actions={
          <Button onClick={() => setShowLinkModal(true)} variant="outline" size="sm" className="gap-1.5 text-xs">
            <UserPlus className="h-3.5 w-3.5" />
            Link Another Student
          </Button>
        }
      />

      {/* Top Banner Status Card - Standard Card Design */}
      <Card className="shadow-sm">
        <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 p-5">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Badge variant="secondary" className="gap-1.5 text-xs font-medium">
                <User className="h-3.5 w-3.5 text-primary" />
                Linked Student: <strong className="text-foreground">{dashboard.student_name}</strong>
              </Badge>
              <Badge variant="outline" className="text-[11px] font-mono">
                {dashboard.student_roll}
              </Badge>
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Campus Outing & Safeguard Operations
            </h2>
            <p className="text-xs text-muted-foreground max-w-xl">
              Location status derived from campus gate log events. Automated attendance shortage warnings and grade performance tracking.
            </p>
          </div>

          {/* Dynamic Status Badge */}
          <div className={`p-4 rounded-lg border backdrop-blur-sm min-w-[250px] text-center md:text-left transition-all duration-300 ${statusBadge.bg}`}>
            <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-bold uppercase tracking-wider mb-1">
              <span className={`h-2.5 w-2.5 rounded-full ${statusBadge.dot}`} />
              {statusBadge.text}
            </div>
            <div className="text-[11px] opacity-90">{statusBadge.sub}</div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metric Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Activity}
          label="Attendance Score"
          value={`${dashboard.attendance_percentage}%`}
          hint={`${dashboard.attended_classes} of ${dashboard.total_classes} lectures`}
        />
        <StatCard
          icon={MapPin}
          label="Current Location"
          value={dashboard.location_status === 'CASUAL_EXIT' ? 'Outside' : 'In Campus'}
          hint="Hostel Gate Sync"
        />
        <StatCard
          icon={Clock}
          label="Recent Gate Passes"
          value={dashboard.recent_gate_passes.length}
          hint="Recorded Outings"
        />
        <StatCard
          icon={Award}
          label="Enrolled Courses"
          value={dashboard.marksheet_summary.length}
          hint={`Sem ${dashboard.semester} • ${dashboard.department}`}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Student Profile & Guardian Privacy Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Profile Details Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
                  {dashboard.student_name[0]}
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">{dashboard.student_name}</CardTitle>
                  <CardDescription className="text-xs font-mono">Roll: {dashboard.student_roll}</CardDescription>
                  <span className="inline-block mt-1 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">
                    Sem {dashboard.semester} • {dashboard.department}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs pt-4">
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" /> Guardian
                </span>
                <strong className="text-foreground">{dashboard.parent_name || 'Parent/Guardian'}</strong>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-emerald-500" /> Alert Contact
                </span>
                <strong className="text-foreground font-mono truncate max-w-[140px]">{dashboard.parent_email}</strong>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-amber-500" /> Notification Dispatch
                </span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                  Active SMS/Email
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Student Consent Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" /> Guardian Privacy & Sharing Controls
              </CardTitle>
              <CardDescription className="text-xs">
                Student opt-in consent parameters configured for this guardian link.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs pt-4">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
                <div className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="font-medium text-foreground">Location & Outpass Sharing</span>
                </div>
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Approved
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-3.5 w-3.5 text-blue-500" />
                  <span className="font-medium text-foreground">Attendance Percentage</span>
                </div>
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Approved
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border">
                <div className="flex items-center gap-2">
                  <Award className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="font-medium text-foreground">Academic Marksheets</span>
                </div>
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Approved
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Attendance Safeguard, Gate Pass Timeline & Marksheets (8 cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Attendance Safeguard Tracker */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Attendance Safeguard Gauge
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated tracking against the mandatory 75% attendance threshold.
                </CardDescription>
              </div>
              {dashboard.attendance_percentage < 75 ? (
                <Badge variant="destructive" className="flex items-center gap-1 text-[11px]">
                  <AlertTriangle className="h-3.5 w-3.5" /> Low Attendance Warning (&lt; 75%)
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Healthy Score
                </Badge>
              )}
            </CardHeader>

            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                {/* Circular Percentage Meter */}
                <div className="relative h-32 w-32 flex items-center justify-center shrink-0">
                  <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-muted stroke-current"
                      strokeWidth="3.5"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={`${dashboard.attendance_percentage < 75 ? 'text-destructive' : 'text-emerald-500'} stroke-current transition-all duration-1000`}
                      strokeDasharray={`${dashboard.attendance_percentage}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-bold font-mono text-foreground">{dashboard.attendance_percentage}%</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Attendance</span>
                  </div>
                </div>

                {/* Breakdown Details */}
                <div className="space-y-2.5 text-xs flex-1 w-full max-w-sm">
                  <div className="flex justify-between items-center p-2.5 bg-muted/40 rounded-lg border">
                    <span className="text-muted-foreground">Total Conducted Lectures</span>
                    <strong className="text-foreground font-mono">{dashboard.total_classes} Classes</strong>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-muted/40 rounded-lg border">
                    <span className="text-muted-foreground">Attended Lectures</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{dashboard.attended_classes} Classes</strong>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-muted/40 rounded-lg border">
                    <span className="text-muted-foreground">
                      {dashboard.attendance_percentage >= 75 ? 'Safe Missable Buffer' : 'Required Classes'}
                    </span>
                    <strong className={`font-mono ${dashboard.attendance_percentage >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                      {dashboard.attendance_percentage >= 75
                        ? `${Math.max(0, Math.floor((dashboard.attended_classes - 0.75 * dashboard.total_classes) / 0.75))} Classes Missable`
                        : `${Math.max(0, Math.ceil((0.75 * dashboard.total_classes - dashboard.attended_classes) / 0.25))} Classes Needed`}
                    </strong>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gate Exit & Entry Outing Timeline */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" /> Recent Gate Exit & Entry Timeline
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time hostel and campus security gate checkout records.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {dashboard.recent_gate_passes.length > 0 ? (
                <div className="divide-y">
                  {dashboard.recent_gate_passes.map((pass) => (
                    <div key={pass.id} className="py-3 flex items-start justify-between text-xs">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold shrink-0 mt-0.5 ${
                          pass.status === 'overdue' 
                            ? 'bg-destructive/10 text-destructive' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          <Coffee className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground capitalize">
                            {pass.reason.replace('_', ' ')} <span className="text-muted-foreground font-mono text-[11px]">({pass.pass_code})</span>
                          </div>
                          <div className="text-muted-foreground text-[11px] mt-0.5">
                            Exit: {new Date(pass.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Return: {pass.actual_return_time ? new Date(pass.actual_return_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] font-bold ${
                        pass.status === 'checked_in' 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' 
                          : pass.status === 'overdue'
                          ? 'bg-destructive/10 text-destructive border-destructive/30 animate-pulse'
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                      }`}>
                        {pass.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">
                  No recent gate passes recorded for this student.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Academic Performance Marksheet */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-500" /> Academic Marksheet Summary
              </CardTitle>
              <CardDescription className="text-xs">
                Term examination results and subject grades.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b text-muted-foreground font-medium uppercase text-[10px] tracking-wider">
                      <th className="py-2">Subject</th>
                      <th className="py-2">Marks Achieved</th>
                      <th className="py-2">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dashboard.marksheet_summary.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 font-medium text-foreground">
                          {sub.subject} <span className="text-[10px] text-muted-foreground block font-mono">{sub.code}</span>
                        </td>
                        <td className="py-2.5 font-mono text-foreground">{sub.marks} / 100</td>
                        <td className="py-2.5">
                          <Badge variant="secondary" className="font-bold text-primary bg-primary/10">
                            {sub.grade}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};
