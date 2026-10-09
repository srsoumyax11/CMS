import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { placementsApi } from '@/api/placementsApi';
import { useAuth } from '@/context/AuthContext';
import type {
  PlacementNoticeResponse,
  PlacementApplicationResponse,
  PlacementApplicationCreateRequest,
} from '@/types/api';
import {
  Building2,
  Briefcase,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface PlacementDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notice: PlacementNoticeResponse | null;
  existingApplication?: PlacementApplicationResponse | null;
}

export function PlacementDetailModal({
  open,
  onOpenChange,
  notice,
  existingApplication,
}: PlacementDetailModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [resumeUrl, setResumeUrl] = useState('');

  if (!notice) return null;

  // Student Profile Eligibility Evaluation
  const isStudent = user?.user_type === 'student';
  const studentProfile = user?.student_profile;

  const cgpaPass = !notice.min_cgpa || (studentProfile?.cgpa != null && studentProfile.cgpa >= notice.min_cgpa);
  const deptPass =
    !notice.eligible_department_ids ||
    notice.eligible_department_ids.length === 0 ||
    (studentProfile?.department_id != null &&
      notice.eligible_department_ids.includes(studentProfile.department_id));
  const coursePass =
    !notice.eligible_course_ids ||
    notice.eligible_course_ids.length === 0 ||
    (studentProfile?.course_id != null &&
      notice.eligible_course_ids.includes(studentProfile.course_id));
  const yearPass =
    !notice.passout_year ||
    (studentProfile?.passout_year != null && studentProfile.passout_year === notice.passout_year);

  const isEligible = cgpaPass && deptPass && coursePass && yearPass;

  const applyMutation = useMutation({
    mutationFn: (req: PlacementApplicationCreateRequest) =>
      placementsApi.applyForDrive(notice.id, req),
    onSuccess: () => {
      toast.success('Application submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['my-placement-applications'] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to submit application');
    },
  });

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    applyMutation.mutate({ resume_url: resumeUrl.trim() || undefined });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SELECTED':
        return <Badge className="bg-emerald-500 text-white font-bold">Selected / Offer Letter 🎓</Badge>;
      case 'SHORTLISTED':
        return <Badge className="bg-amber-500 text-white font-bold">Shortlisted for Rounds 🟡</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Application Closed 🔴</Badge>;
      case 'APPLIED':
      default:
        return <Badge variant="secondary" className="font-semibold">Application Under Review 🔵</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs font-semibold">
              {notice.job_type || 'Full-time'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Posted {new Date(notice.created_at).toLocaleDateString()}
            </span>
          </div>

          <DialogTitle className="text-xl font-bold flex items-center gap-2 mt-1">
            <Building2 className="h-5 w-5 text-primary shrink-0" />
            {notice.company} — {notice.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Official Campus Recruitment Specification Sheet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Key Job Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-muted/40 rounded-xl border">
            <div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-primary" /> Package (CTC)
              </span>
              <p className="text-xs font-bold text-foreground mt-0.5">
                {notice.package_text || 'As per norms'}
              </p>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Min CGPA
              </span>
              <p className="text-xs font-bold text-foreground mt-0.5">
                {notice.min_cgpa ? `${notice.min_cgpa} Cutoff` : 'No Cutoff'}
              </p>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-rose-500" /> Deadline
              </span>
              <p className="text-xs font-bold text-foreground mt-0.5">
                {notice.last_date ? new Date(notice.last_date).toLocaleDateString() : 'Open'}
              </p>
            </div>

            <div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-blue-500" /> Drive Date
              </span>
              <p className="text-xs font-bold text-foreground mt-0.5">
                {notice.drive_date ? new Date(notice.drive_date).toLocaleDateString() : 'TBD'}
              </p>
            </div>
          </div>

          {/* Student Profile Eligibility Readout */}
          {isStudent && (
            <Card className={isEligible ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-destructive/40 bg-destructive/5'}>
              <CardContent className="p-4 flex items-start gap-3">
                {isEligible ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-foreground">
                    {isEligible ? 'Eligible to Apply' : 'Eligibility Requirements Not Met'}
                  </h4>
                  <div className="text-muted-foreground space-y-0.5">
                    {!cgpaPass && (
                      <p className="text-destructive font-medium">
                        • Your CGPA ({studentProfile?.cgpa ?? 'N/A'}) is below the required {notice.min_cgpa} cutoff.
                      </p>
                    )}
                    {!deptPass && (
                      <p className="text-destructive font-medium">
                        • Drive is restricted to specific academic departments.
                      </p>
                    )}
                    {!yearPass && (
                      <p className="text-destructive font-medium">
                        • Target passout batch is {notice.passout_year}.
                      </p>
                    )}
                    {isEligible && (
                      <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Your profile (CGPA: {studentProfile?.cgpa ?? 'Verified'}, Batch: {studentProfile?.passout_year ?? 'Current'}) meets all requirements!
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Job Description & Hiring Process
            </h4>
            <div className="p-4 bg-card border rounded-xl text-xs text-foreground leading-relaxed whitespace-pre-wrap">
              {notice.description}
            </div>
          </div>

          {/* Application Action / Status */}
          {existingApplication ? (
            <Card className="border-border bg-accent/20">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Application Status</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Applied on {new Date(existingApplication.created_at).toLocaleDateString()}
                  </p>
                </div>
                {getStatusBadge(existingApplication.status)}
              </CardContent>
            </Card>
          ) : isStudent && isEligible ? (
            <form onSubmit={handleApply} className="p-4 border rounded-xl bg-card space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                Submit Job Application
              </h4>

              <div className="space-y-1.5">
                <Label htmlFor="resumeUrl" className="text-xs">
                  Resume URL (Portfolio / Drive / LinkedIn link)
                </Label>
                <Input
                  id="resumeUrl"
                  placeholder="https://drive.google.com/your-resume-pdf"
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  className="text-xs"
                />
              </div>

              <Button type="submit" disabled={applyMutation.isPending} className="w-full gap-2 text-xs">
                {applyMutation.isPending ? 'Submitting Application...' : 'Confirm & Apply for Drive'}
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </form>
          ) : null}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
