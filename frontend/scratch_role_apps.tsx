import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi, type RoleApplicationData } from '@/api/applicationsApi';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn } from '@/components/shared/pro-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, CheckCircle2, XCircle, User, FileText, AlertCircle, Eye } from 'lucide-react';
import { EntityViewEditDialog, type EntityField } from '@/components/shared/entity-dialog';

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
    },
    {
      id: 'actions',
      header: 'Actions',
      accessorKey: 'id',
      cell: (_, row) => (
        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleView(row); }}>
            <Eye className="w-4 h-4 mr-1" /> View
          </Button>
          <Button 
            size="sm" 
            className="bg-success hover:bg-success/90 text-success-foreground"
            onClick={(e) => { e.stopPropagation(); setNotes(''); approveMutation.mutate(row.id); }}
            disabled={approveMutation.isPending && approveMutation.variables === row.id}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-destructive hover:bg-destructive/10 border-destructive/30"
            onClick={(e) => { e.stopPropagation(); setNotes(''); rejectMutation.mutate(row.id); }}
            disabled={rejectMutation.isPending && rejectMutation.variables === row.id}
          >
            <XCircle className="w-4 h-4 mr-1" /> Reject
          </Button>
        </div>
      ),
    },
  ];

  const viewFields: EntityField<RoleApplicationData>[] = [
    { name: 'applicant_name', label: 'Name', type: 'text' },
    { name: 'applicant_email', label: 'Email', type: 'text' },
    { name: 'target_role', label: 'Target Role', type: 'text' },
    { 
      name: 'application_data', 
      label: 'Application Data', 
      type: 'text',
      render: (val: any) => (
        <div className="space-y-2 mt-2">
          {Object.entries(val || {}).map(([k, v]) => (
            <div key={k} className="flex justify-between border-b pb-1">
              <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}:</span>
              <span className="font-mono">{String(v)}</span>
            </div>
          ))}
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        title="Role Applications"
        description="Review and verify incoming role requests from unassigned users."
        icon={UserCheck}
      />
      
      <ProTable<RoleApplicationData>
        data={applications}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search applicant name..."
        searchField="applicant_name"
        onRefresh={refetch}
        onRowClick={handleView}
      />

      <EntityViewEditDialog<RoleApplicationData>
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        title="Application Details"
        mode="view"
        entity={selectedApp}
        fields={viewFields}
        onSave={async () => {}}
        className="max-w-2xl"
      />
    </div>
  );
}

export default RoleApplicationsManagement;

