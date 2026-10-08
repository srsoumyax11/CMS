import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi, type RoleApplicationData } from '@/api/applicationsApi';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn } from '@/components/shared/pro-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export function RoleApplicationsManagement() {
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState<RoleApplicationData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [notes, setNotes] = useState('');

  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['role-applications'],
    queryFn: () => applicationsApi.listApplications('pending'),
  });

  const applications = response?.data || [];

  const approveMutation = useMutation({
    mutationFn: (id: string) => applicationsApi.approveApplication(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-applications'] });
      setIsDetailsOpen(false);
      setNotes('');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => applicationsApi.rejectApplication(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-applications'] });
      setIsDetailsOpen(false);
      setNotes('');
    },
  });

  const handleView = (app: RoleApplicationData) => {
    setSelectedApp(app);
    setNotes('');
    setIsDetailsOpen(true);
  };

  const columns: ProColumn<RoleApplicationData>[] = [
    {
      id: 'applicant',
      header: 'Applicant',
      accessorKey: 'applicant_name',
      cell: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
            {(row.applicant_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-semibold text-foreground">{row.applicant_name || 'Applicant'}</span>
            <p className="text-xs text-muted-foreground">{row.applicant_email}</p>
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
        <Badge variant="outline" className="uppercase text-xs font-semibold bg-primary/10 text-primary border-primary/20">
          {String(val)}
        </Badge>
      ),
      sortable: true,
    },
    {
      id: 'created_at',
      header: 'Applied On',
      accessorKey: 'created_at',
      cell: (val) => new Date(String(val)).toLocaleDateString(),
      sortable: true,
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Role Applications"
        description="Review and verify incoming role requests from unassigned users."
        icon={UserCheck}
      />
      
      <ProTable
        data={applications}
        columns={columns}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        rowKey={(row) => row.id}
        onRowClick={handleView}
        searchPlaceholder="Search applicants..."
        emptyTitle="No Pending Applications"
        emptyDescription="There are currently no role applications waiting for review."
      />

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Role Application</DialogTitle>
          </DialogHeader>
          
          {selectedApp && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Applicant Name</div>
                  <div className="font-semibold">{selectedApp.applicant_name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Applicant Email</div>
                  <div className="font-semibold">{selectedApp.applicant_email}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Requested Role</div>
                  <Badge variant="outline" className="uppercase mt-1 bg-primary/10 text-primary border-primary/20">{selectedApp.target_role}</Badge>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Applied On</div>
                  <div className="font-semibold">{new Date(selectedApp.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              {selectedApp.application_data && Object.keys(selectedApp.application_data).length > 0 && (
                <div className="pt-2">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Application Data</div>
                  <div className="bg-muted/50 p-3 rounded-md text-sm space-y-1 font-mono border border-border">
                    {Object.entries(selectedApp.application_data).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-border/50 pb-1 last:border-0 last:pb-0">
                        <span className="capitalize">{k.replace(/_/g, ' ')}:</span>
                        <span>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <div className="text-sm font-medium text-muted-foreground mb-2">Review Notes (Optional)</div>
                <Textarea 
                  placeholder="Add a note regarding your decision (e.g. 'ID verification failed')..." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button 
              variant="outline" 
              className="text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={() => { if (selectedApp) rejectMutation.mutate(selectedApp.id); }}
              disabled={rejectMutation.isPending || approveMutation.isPending}
            >
              <XCircle className="w-4 h-4 mr-2" /> 
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
            <Button 
              className="bg-success hover:bg-success/90 text-success-foreground"
              onClick={() => { if (selectedApp) approveMutation.mutate(selectedApp.id); }}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> 
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RoleApplicationsManagement;
