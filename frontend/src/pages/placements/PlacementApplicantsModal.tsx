import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { placementsApi } from '@/api/placementsApi';
import type {
  PlacementNoticeResponse,
  PlacementApplicationResponse,
  ApplicationStatus,
} from '@/types/api';
import { Users, ExternalLink, CheckCircle2, XCircle, Clock, Sparkles } from 'lucide-react';

interface PlacementApplicantsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notice: PlacementNoticeResponse | null;
}

export function PlacementApplicantsModal({
  open,
  onOpenChange,
  notice,
}: PlacementApplicantsModalProps) {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['placement-notice-applications', notice?.id],
    queryFn: async () => {
      if (!notice) return null;
      const res = await placementsApi.listNoticeApplications(notice.id);
      return res.data.data;
    },
    enabled: !!notice && open,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: ApplicationStatus }) =>
      placementsApi.updateApplicationStatus(appId, { status }),
    onSuccess: () => {
      toast.success('Candidate status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['placement-notice-applications', notice?.id] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update candidate status');
    },
  });

  if (!notice) return null;

  const applications: PlacementApplicationResponse[] = data?.items || [];

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'SELECTED':
        return <Badge className="bg-emerald-500 text-white font-bold">Selected 🎓</Badge>;
      case 'SHORTLISTED':
        return <Badge className="bg-amber-500 text-white font-bold">Shortlisted 🟡</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejected 🔴</Badge>;
      case 'APPLIED':
      default:
        return <Badge variant="secondary">Applied 🔵</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs font-semibold">
              {applications.length} Candidates Applied
            </Badge>
            <span className="text-xs text-muted-foreground">
              Drive: {notice.company}
            </span>
          </div>

          <DialogTitle className="text-xl font-bold flex items-center gap-2 mt-1">
            <Users className="h-5 w-5 text-primary shrink-0" />
            Applicant Candidates Roster — {notice.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Review candidate resumes and update evaluation round statuses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Loading drive applications...
            </div>
          ) : applications.length === 0 ? (
            <Card className="border border-border">
              <CardContent className="p-8 text-center text-xs text-muted-foreground">
                No student applications submitted for this placement drive yet.
              </CardContent>
            </Card>
          ) : (
            applications.map((app) => (
              <Card key={app.id} className="border border-border shadow-2xs hover:border-primary/30 transition">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground font-mono">
                        Student ID: {app.student_user_id.slice(0, 8)}...
                      </span>
                      {getStatusBadge(app.status)}
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Applied on {new Date(app.created_at).toLocaleString()}
                    </p>

                    {app.resume_url && (
                      <a
                        href={app.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium mt-1"
                      >
                        View Candidate Resume / Portfolio
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {/* Status Action Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                    <Button
                      variant={app.status === 'SHORTLISTED' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        updateStatusMutation.mutate({ appId: app.id, status: 'SHORTLISTED' })
                      }
                      className="text-xs h-8"
                    >
                      Shortlist
                    </Button>

                    <Button
                      variant={app.status === 'SELECTED' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        updateStatusMutation.mutate({ appId: app.id, status: 'SELECTED' })
                      }
                      className="text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      Select Offer
                    </Button>

                    <Button
                      variant={app.status === 'REJECTED' ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() =>
                        updateStatusMutation.mutate({ appId: app.id, status: 'REJECTED' })
                      }
                      className="text-xs h-8"
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close Roster
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
