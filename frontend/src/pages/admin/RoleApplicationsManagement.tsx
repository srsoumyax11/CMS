import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi, type RoleApplicationData } from '@/api/applicationsApi';
import { metadataApi } from '@/api/metadataApi';
import { QUERY_KEYS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/error-utils';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn, type TableFilterDef } from '@/components/shared/pro-table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Sparkles,
  FileText,
  MessageSquare,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

export function RoleApplicationsManagement() {
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState<RoleApplicationData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [notes, setNotes] = useState('');

  // 1. Fetch Role Applications Data
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEYS.APPLICATIONS],
    queryFn: () => applicationsApi.listApplications(),
  });

  const applications = Array.isArray(response?.data) ? response.data : [];

  // 2. Fetch Metadata for Department & Course Name Resolution
  const { data: deptRes } = useQuery({
    queryKey: [QUERY_KEYS.DEPARTMENTS],
    queryFn: () => metadataApi.getDepartments(),
  });

  const { data: courseRes } = useQuery({
    queryKey: [QUERY_KEYS.COURSES],
    queryFn: () => metadataApi.getCourses(),
  });

  const departmentMap = useMemo(() => {
    const map = new Map<string, string>();
    const depts = Array.isArray(deptRes?.data?.data)
      ? deptRes.data.data
      : Array.isArray(deptRes?.data)
      ? (deptRes.data as any)
      : [];
    depts.forEach((d: any) => {
      if (d?.id && d?.name) map.set(d.id, d.name);
    });
    return map;
  }, [deptRes]);

  const courseMap = useMemo(() => {
    const map = new Map<string, string>();
    const courses = Array.isArray(courseRes?.data?.data)
      ? courseRes.data.data
      : Array.isArray(courseRes?.data)
      ? (courseRes.data as any)
      : [];
    courses.forEach((c: any) => {
      if (c?.id) map.set(c.id, c.code ? `${c.code} - ${c.name}` : c.name);
    });
    return map;
  }, [courseRes]);

  // 3. Mutations for Approve & Reject
  const approveMutation = useMutation({
    mutationFn: ({ id, adminNotes }: { id: string; adminNotes?: string }) =>
      applicationsApi.approveApplication(id, adminNotes),
    onSuccess: () => {
      toast.success('Role application approved successfully');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPLICATIONS] });
      setIsDetailsOpen(false);
      setSelectedApp(null);
      setNotes('');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to approve application'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, adminNotes }: { id: string; adminNotes?: string }) =>
      applicationsApi.rejectApplication(id, adminNotes),
    onSuccess: () => {
      toast.info('Role application rejected');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.APPLICATIONS] });
      setIsDetailsOpen(false);
      setSelectedApp(null);
      setNotes('');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to reject application'));
    },
  });

  const handleRowClick = (app: RoleApplicationData) => {
    setSelectedApp(app);
    setNotes(app.admin_notes || '');
    setIsDetailsOpen(true);
  };

  const extractMainIdentifier = (data: Record<string, any>) => {
    if (!data) return 'N/A';
    return (
      data.registration_no ||
      data.roll_no ||
      data.employee_id ||
      data.student_id_str ||
      data.user_id_str ||
      'N/A'
    );
  };

  const formatValue = (key: string, val: any) => {
    if (val === null || val === undefined) return 'N/A';
    if (typeof val === 'object') return JSON.stringify(val);
    const strVal = String(val);
    if (key.includes('department_id') && departmentMap.has(strVal)) {
      return departmentMap.get(strVal);
    }
    if (key.includes('course_id') && courseMap.has(strVal)) {
      return courseMap.get(strVal);
    }
    return strVal;
  };

  // 4. ProTable Filters Definition
  const tableFilters: TableFilterDef<RoleApplicationData>[] = [
    {
      id: 'status',
      label: 'Status',
      defaultValue: 'pending',
      options: [
        { label: 'Pending Verification', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
        { label: 'All Statuses', value: '' },
      ],
    },
    {
      id: 'target_role',
      label: 'Target Role',
      defaultValue: '',
      options: [
        { label: 'All Roles', value: '' },
        { label: 'Student', value: 'STUDENT' },
        { label: 'Faculty', value: 'FACULTY' },
        { label: 'Staff', value: 'STAFF' },
        { label: 'Parent', value: 'PARENT' },
      ],
    },
  ];

  // 5. ProTable Columns Definition
  const columns: ProColumn<RoleApplicationData>[] = [
    {
      id: 'applicant',
      header: 'Applicant Name & Email',
      accessorKey: 'applicant_name',
      cell: (_, row) => (
        <div className="flex items-center gap-2.5 py-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20">
            {(row.applicant_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-semibold text-foreground text-sm block">
              {row.applicant_name || 'Applicant'}
            </span>
            <p className="text-xs text-muted-foreground font-mono">{row.applicant_email}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'target_role',
      header: 'Requested Role',
      accessorKey: 'target_role',
      cell: (val) => (
        <Badge variant="outline" className="uppercase font-mono text-xs font-semibold bg-primary/10 text-primary border-primary/20">
          {String(val)}
        </Badge>
      ),
      sortable: true,
    },
    {
      id: 'identifier',
      header: 'Registration / Employee ID',
      cell: (_, row) => (
        <code className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-muted border border-border text-foreground">
          {extractMainIdentifier(row.application_data)}
        </code>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: (val) => <StatusBadge status={String(val)} type="account" />,
      sortable: true,
    },
    {
      id: 'created_at',
      header: 'Applied Date',
      accessorKey: 'created_at',
      cell: (val) => (
        <span className="text-xs text-muted-foreground font-mono">
          {new Date(String(val)).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      ),
      sortable: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1 text-xs text-primary hover:bg-primary/10"
            onClick={() => handleRowClick(row)}
          >
            <Eye className="h-3.5 w-3.5" /> View / Audit
          </Button>

          {row.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-500/10 border-emerald-500/30"
                title="Quick Approve"
                disabled={approveMutation.isPending || rejectMutation.isPending}
                onClick={() => approveMutation.mutate({ id: row.id })}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-500/10 border-rose-500/30"
                title="Quick Reject"
                disabled={approveMutation.isPending || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ id: row.id })}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const quickNotes = [
    'Registration Verified',
    'Employee ID Verified',
    'Document Match Confirmed',
    'Invalid Roll / Registration No.',
    'Duplicate Application',
  ];

  return (
    <div className="space-y-6">
      {/* Global Standard Page Header */}
      <PageHeader
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      {/* Global Standard ProTable */}
      <ProTable
        data={applications}
        columns={columns}
        filters={tableFilters}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        rowKey={(row) => row.id}
        onRowClick={handleRowClick}
        searchPlaceholder="Search by name, email, roll number, or employee ID..."
        emptyTitle="No Role Applications Found"
        emptyDescription="There are no role verification applications matching the selected criteria."
        exportFileName="role-applications"
      />

      {/* Application Review & Verification Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-base border border-primary/20">
                  {(selectedApp?.applicant_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold font-editorial">
                    {selectedApp?.applicant_name || 'Applicant Review'}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground font-mono">
                    {selectedApp?.applicant_email}
                  </DialogDescription>
                </div>
              </div>
              {selectedApp && (
                <StatusBadge status={selectedApp.status} type="account" />
              )}
            </div>
          </DialogHeader>

          {selectedApp && (
            <div className="space-y-6 py-2">
              {/* Submission Meta Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-muted/40 rounded-xl border border-border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Requested Role</span>
                  <Badge variant="outline" className="uppercase font-mono mt-1 text-[10px] bg-primary/10 text-primary border-primary/20">
                    {selectedApp.target_role}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Applied Date</span>
                  <span className="font-semibold text-foreground font-mono mt-1 block">
                    {new Date(selectedApp.created_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Application Status</span>
                  <span className="mt-1 block">
                    <StatusBadge status={selectedApp.status} type="account" />
                  </span>
                </div>
              </div>

              {/* Submitted Parameters Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Submitted Credentials & Parameters
                </h4>

                <div className="bg-card rounded-xl border border-border divide-y divide-border text-xs">
                  {Object.entries(selectedApp.application_data || {}).map(([key, value]) => {
                    const formattedKey = key
                      .replace(/_/g, ' ')
                      .replace(/\bid\b/gi, 'ID')
                      .replace(/\bstr\b/gi, '')
                      .trim();
                    const formattedVal = formatValue(key, value);

                    return (
                      <div key={key} className="flex items-center justify-between p-3">
                        <span className="font-medium text-muted-foreground capitalize">
                          {formattedKey}
                        </span>
                        <span className="font-semibold font-mono text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50 max-w-[280px] truncate text-right">
                          {formattedVal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Preset Notes Chips */}
              {selectedApp.status === 'pending' && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Quick Review Presets
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickNotes.map((preset) => (
                      <Badge
                        key={preset}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 hover:border-primary text-[11px] font-normal py-1 px-2.5 transition-colors"
                        onClick={() => setNotes(preset)}
                      >
                        + {preset}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Reviewer Notes Textarea */}
              <div className="space-y-2">
                <label htmlFor="notes" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" /> Audit Notes & Feedback
                </label>
                <Textarea
                  id="notes"
                  placeholder="Enter audit notes or rejection rationale (notified to applicant)..."
                  value={notes}
                  disabled={selectedApp.status !== 'pending'}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[90px] text-xs bg-background"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={() => setIsDetailsOpen(false)}>
              Cancel
            </Button>

            {selectedApp?.status === 'pending' && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5 text-xs font-medium"
                  disabled={rejectMutation.isPending || approveMutation.isPending}
                  onClick={() => {
                    if (selectedApp) {
                      rejectMutation.mutate({ id: selectedApp.id, adminNotes: notes });
                    }
                  }}
                >
                  <XCircle className="h-4 w-4" />
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject Application'}
                </Button>

                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 text-xs font-medium"
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  onClick={() => {
                    if (selectedApp) {
                      approveMutation.mutate({ id: selectedApp.id, adminNotes: notes });
                    }
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {approveMutation.isPending ? 'Approving...' : 'Approve Application'}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RoleApplicationsManagement;
