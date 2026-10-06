import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ShieldCheck, 
  UserCheck, 
  Check, 
  X, 
  Coffee, 
  BookOpen, 
  Award, 
  FileText, 
  Clock, 
  Lock, 
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { parentLinkApi, ParentLinkResponse } from '@/api/parentLinkApi';

export const StudentGuardianPrivacyWidget: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: requestsRes, isLoading } = useQuery({
    queryKey: ['my-parent-link-requests'],
    queryFn: async () => {
      const res = await parentLinkApi.getMyRequests();
      return res.data.data;
    },
  });

  const requests = requestsRes as ParentLinkResponse[] || [];

  // Local state for active editing item
  const [activeItem, setActiveItem] = useState<ParentLinkResponse | null>(null);
  const [gatePassConsent, setGatePassConsent] = useState(true);
  const [attendanceConsent, setAttendanceConsent] = useState(true);
  const [marksheetConsent, setMarksheetConsent] = useState(true);
  const [outpassConsent, setOutpassConsent] = useState(true);

  const respondMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const res = await parentLinkApi.respondToRequest(id, {
        action,
        share_gate_pass: gatePassConsent,
        share_attendance: attendanceConsent,
        share_marksheet: marksheetConsent,
        share_outpass: outpassConsent,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-parent-link-requests'] });
      if (data && data.status === 'approved') {
        toast.success('Guardian link approved with your privacy consents!');
      } else {
        toast.success('Guardian link request updated.');
      }
      setActiveItem(null);
    },

    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update request');
    },
  });

  const updatePrivacyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await parentLinkApi.updatePrivacy(id, {
        share_gate_pass: gatePassConsent,
        share_attendance: attendanceConsent,
        share_marksheet: marksheetConsent,
        share_outpass: outpassConsent,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-parent-link-requests'] });
      toast.success('Privacy sharing preferences updated!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update privacy settings');
    },
  });

  if (isLoading) return null;
  if (requests.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Guardian Privacy & Data Consent Center</h3>
            <p className="text-xs text-muted-foreground">Manage parent/guardian access to your academic and safety data</p>
          </div>
        </div>
        <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Student Consent Control
        </span>
      </div>

      <div className="space-y-4">
        {requests.map((item) => {
          const isPending = item.status === 'pending';
          const isApproved = item.status === 'approved';

          return (
            <div key={item.id} className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 font-bold flex items-center justify-center">
                    {item.parent_name?.[0] || 'P'}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{item.parent_name || 'Parent User'}</h4>
                    <p className="text-xs text-muted-foreground font-mono">{item.parent_email} • {item.relationship_type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isPending && (
                    <span className="text-xs font-semibold bg-amber-500/10 text-amber-600 px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending Your Consent
                    </span>
                  )}
                  {isApproved && (
                    <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Guardian Linked & Approved
                    </span>
                  )}
                </div>
              </div>

              {/* Granular Privacy Checkbox Matrix */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-500" /> Data Sharing Privacy Permissions
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={item.id === activeItem?.id ? gatePassConsent : item.share_gate_pass}
                      onChange={(e) => {
                        setActiveItem(item);
                        setGatePassConsent(e.target.checked);
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <Coffee className="w-3.5 h-3.5 text-amber-500" /> Live Gate Pass Alerts
                      </span>
                      <span className="text-[10px] text-muted-foreground block">Share casual tea outing exit/return updates</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={item.id === activeItem?.id ? attendanceConsent : item.share_attendance}
                      onChange={(e) => {
                        setActiveItem(item);
                        setAttendanceConsent(e.target.checked);
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-blue-500" /> Attendance Score
                      </span>
                      <span className="text-[10px] text-muted-foreground block">Share lecture attendance safeguard %</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={item.id === activeItem?.id ? marksheetConsent : item.share_marksheet}
                      onChange={(e) => {
                        setActiveItem(item);
                        setMarksheetConsent(e.target.checked);
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-emerald-500" /> Marksheet & Grades
                      </span>
                      <span className="text-[10px] text-muted-foreground block">Share subject grades & credits</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={item.id === activeItem?.id ? outpassConsent : item.share_outpass}
                      onChange={(e) => {
                        setActiveItem(item);
                        setOutpassConsent(e.target.checked);
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-purple-500" /> Outpass Leave Records
                      </span>
                      <span className="text-[10px] text-muted-foreground block">Share hostel leave applications</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-1">
                {isPending ? (
                  <>
                    <button
                      type="button"
                      disabled={respondMutation.isPending}
                      onClick={() => respondMutation.mutate({ id: item.id, action: 'reject' })}
                      className="px-4 py-2 rounded-xl border border-red-500/30 text-red-600 text-xs font-semibold hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      Reject Request
                    </button>
                    <button
                      type="button"
                      disabled={respondMutation.isPending}
                      onClick={() => respondMutation.mutate({ id: item.id, action: 'approve' })}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {respondMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5" /> Approve & Grant Link</>}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={updatePrivacyMutation.isPending}
                    onClick={() => updatePrivacyMutation.mutate(item.id)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {updatePrivacyMutation.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Save Privacy Preferences'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
