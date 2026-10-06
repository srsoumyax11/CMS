import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { getErrorMessage } from '@/lib/error-utils';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn } from '@/components/shared/pro-table';
import { EntityViewEditDialog, type EntityField } from '@/components/shared/entity-dialog';
import { Button } from '@/components/ui/button';
import { Plus, UserCheck, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import type { VisitorLog } from '@/types/api';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'entered': return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">Inside</Badge>;
    case 'exited': return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Exited</Badge>;
    default: return <Badge variant="outline" className="capitalize">{status}</Badge>;
  }
};

export function GateLogsManagement() {
  const queryClient = useQueryClient();
  const [selectedLog, setSelectedLog] = useState<VisitorLog | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch data
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['visitor_logs'],
    queryFn: () => adminApi.listVisitorLogs(),
  });
  const logs = response?.data?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createVisitorLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor_logs'] });
      toast.success('Visitor logged successfully');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to log visitor')),
  });

  const exitMutation = useMutation({
    mutationFn: (id: string) => adminApi.markVisitorExit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor_logs'] });
      toast.success('Visitor marked as checked out');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to checkout visitor')),
  });

  // Table Columns
  const columns: ProColumn<VisitorLog>[] = [
    {
      id: 'visitor_name',
      header: 'Visitor',
      accessorKey: 'visitor_name',
      cell: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserCheck className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-foreground">{val}</span>
            <p className="text-xs text-muted-foreground max-w-[200px] truncate">{row.purpose}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: (val) => <StatusBadge status={val} />,
      sortable: true,
    },
    {
      id: 'entry_time',
      header: 'Entry',
      accessorKey: 'entry_time',
      cell: (val) => <span className="text-sm font-medium">{format(new Date(val), 'MMM d, HH:mm')}</span>,
      sortable: true,
    },
    {
      id: 'exit_time',
      header: 'Exit',
      accessorKey: 'exit_time',
      cell: (val) => val ? <span className="text-sm text-muted-foreground">{format(new Date(val), 'MMM d, HH:mm')}</span> : '-',
      sortable: true,
    },
    {
      id: 'actions',
      header: '',
      accessorKey: 'id',
      cell: (val, row) => (
        <div className="flex justify-end pr-2" onClick={(e) => e.stopPropagation()}>
          {row.status === 'entered' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exitMutation.mutate(row.id)}
              disabled={exitMutation.isPending}
              className="h-7 text-xs"
            >
              <LogOut className="h-3 w-3 mr-1.5" /> Mark Exit
            </Button>
          )}
        </div>
      ),
      width: '120px',
    }
  ];

  // Entity Fields
  const fields: EntityField<VisitorLog>[] = [
    { key: 'visitor_name', label: 'Visitor Name', type: 'text', required: true, placeholder: 'Full Name' },
    { key: 'purpose', label: 'Purpose of Visit', type: 'text', required: true },
    { key: 'contact_number', label: 'Contact Number', type: 'text', placeholder: 'e.g., +1234567890' },
    { key: 'vehicle_number', label: 'Vehicle Number', type: 'text', placeholder: 'Optional' },
    { key: 'host_user_id', label: 'Host User ID', type: 'text', description: 'UUID of the person they are visiting (optional)' },
    { key: 'status', label: 'Status', type: 'text', editable: false },
    { key: 'entry_time', label: 'Entry Time', type: 'text', editable: false },
    { key: 'exit_time', label: 'Exit Time', type: 'text', editable: false },
  ];

  const handleSave = async (formData: Record<string, any>, item: VisitorLog | null) => {
    if (!item) {
      await createMutation.mutateAsync({
        visitor_name: formData.visitor_name,
        purpose: formData.purpose,
        contact_number: formData.contact_number || null,
        vehicle_number: formData.vehicle_number || null,
        host_user_id: formData.host_user_id || null,
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gate & Visitor Logs"
        description="Monitor and record visitor entries and exits"
        actions={
          <Button onClick={() => { setSelectedLog(null); setDialogMode('create'); setIsDialogOpen(true); }} className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            New Entry
          </Button>
        }
      />

      <ProTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        rowKey={(row) => row.id}
        onRowClick={(row) => {
          setSelectedLog(row);
          setDialogMode('view');
          setIsDialogOpen(true);
        }}
        searchPlaceholder="Search visitors..."
        exportFileName="gate-logs"
      />

      <EntityViewEditDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        entityName="Visitor Log"
        data={selectedLog}
        fields={fields.filter(f => dialogMode === 'create' ? !f.editable && !['status', 'entry_time', 'exit_time'].includes(f.key as string) : true)}
        initialMode={dialogMode}
        onSave={handleSave}
        canEdit={false} // Edit is not allowed for logs after creation
        isSaving={createMutation.isPending}
      />
    </div>
  );
}

export default GateLogsManagement;
