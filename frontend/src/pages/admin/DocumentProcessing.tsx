import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { getErrorMessage } from '@/lib/error-utils';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn } from '@/components/shared/pro-table';
import { EntityViewEditDialog, type EntityField } from '@/components/shared/entity-dialog';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle2, XCircle, FileArchive, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { DocumentRequest } from '@/types/api';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending': return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">Pending</Badge>;
    case 'approved': return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">Approved</Badge>;
    case 'ready': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">Ready</Badge>;
    case 'rejected': return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Rejected</Badge>;
    default: return <Badge variant="outline" className="capitalize">{status}</Badge>;
  }
};

const UrgencyBadge = ({ urgency }: { urgency: string }) => {
  switch (urgency) {
    case 'high': return <Badge variant="destructive" className="scale-90">High</Badge>;
    case 'normal': return <Badge variant="secondary" className="scale-90">Normal</Badge>;
    default: return null;
  }
};

export function DocumentProcessing() {
  const queryClient = useQueryClient();
  const [selectedReq, setSelectedReq] = useState<DocumentRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch data
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['document_requests'],
    queryFn: () => adminApi.listDocumentRequests(),
  });
  const requests = response?.data?.data?.items || [];

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.approveDocumentRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document_requests'] });
      toast.success('Request approved');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to approve request')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.rejectDocumentRequest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document_requests'] });
      toast.success('Request rejected');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to reject request')),
  });

  const readyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.markDocumentReady(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document_requests'] });
      toast.success('Document marked as ready');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to mark document as ready')),
  });

  // Table Columns
  const columns: ProColumn<DocumentRequest>[] = [
    {
      id: 'document_type',
      header: 'Document / Student',
      accessorKey: 'document_type',
      cell: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground uppercase text-sm">{val}</span>
              <UrgencyBadge urgency={row.urgency} />
            </div>
            <p className="text-xs text-muted-foreground">{row.student_name || 'Unknown Student'}</p>
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
      id: 'created_at',
      header: 'Requested On',
      accessorKey: 'created_at',
      cell: (val) => <span className="text-sm text-muted-foreground">{format(new Date(val), 'MMM d, yyyy HH:mm')}</span>,
      sortable: true,
    }
  ];

  // Entity Fields
  const fields: EntityField<DocumentRequest>[] = [
    { key: 'student_name', label: 'Student Name', type: 'text', editable: false },
    { key: 'document_type', label: 'Document Type', type: 'text', editable: false },
    { key: 'urgency', label: 'Urgency', type: 'text', editable: false },
    { key: 'purpose', label: 'Purpose', type: 'textarea', editable: false },
    { key: 'status', label: 'Status', type: 'text', editable: false },
    { 
      key: 'rejection_reason', 
      label: 'Rejection Reason (If Rejecting)', 
      type: 'textarea', 
      description: 'Required only if rejecting the request.',
      editable: true 
    },
    { 
      key: 'issued_file_url', 
      label: 'Issued File URL', 
      type: 'text', 
      description: 'Required if marking as Ready.',
      editable: true 
    },
    { 
      key: 'admin_notes', 
      label: 'Admin Notes', 
      type: 'textarea', 
      editable: true 
    },
  ];

  const handleSave = async (formData: Record<string, any>, item: DocumentRequest | null) => {
    if (!item) return;
    // We determine action by a custom status dropdown, or just let users use the dialog for simple edits
    // However, the standard EntityViewEditDialog only fires onSave.
    // Let's implement a custom header action in EntityViewEditDialog for Approve, Reject, Ready.
  };

  const customHeaderExtra = (item: DocumentRequest | null) => {
    if (!item) return null;
    return (
      <div className="flex gap-2">
        {item.status === 'pending' && (
          <>
            <Button size="sm" variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 border-blue-500/20" onClick={() => approveMutation.mutate({ id: item.id, data: {} })}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20" onClick={() => {
              const reason = window.prompt("Enter rejection reason:");
              if (reason) rejectMutation.mutate({ id: item.id, data: { rejection_reason: reason } });
            }}>
              <XCircle className="h-4 w-4 mr-1.5" /> Reject
            </Button>
          </>
        )}
        {item.status === 'approved' && (
          <Button size="sm" variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20" onClick={() => {
            const url = window.prompt("Enter issued file URL:");
            if (url) readyMutation.mutate({ id: item.id, data: { issued_file_url: url } });
          }}>
            <FileArchive className="h-4 w-4 mr-1.5" /> Mark Ready
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Document Requests" description="Process student certificate and document requests" />

      <ProTable
        columns={columns}
        data={requests}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        rowKey={(row) => row.id}
        onRowClick={(row) => {
          setSelectedReq(row);
          setIsDialogOpen(true);
        }}
        searchPlaceholder="Search requests..."
      />

      <EntityViewEditDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        entityName="Document Request"
        data={selectedReq}
        fields={fields}
        initialMode="view"
        canEdit={false} // We handle edits via customHeaderExtra actions
        onSave={handleSave}
        customHeaderExtra={customHeaderExtra}
      />
    </div>
  );
}

export default DocumentProcessing;
