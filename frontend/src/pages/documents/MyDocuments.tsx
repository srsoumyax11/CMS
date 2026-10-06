import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/api/documentsApi';
import { getErrorMessage } from '@/lib/error-utils';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn } from '@/components/shared/pro-table';
import { EntityViewEditDialog, type EntityField } from '@/components/shared/entity-dialog';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { DocumentRequest } from '@/types/api';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending': return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">Pending</Badge>;
    case 'approved': return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">Processing</Badge>;
    case 'ready': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">Ready for Download</Badge>;
    case 'rejected': return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Rejected</Badge>;
    default: return <Badge variant="outline" className="capitalize">{status}</Badge>;
  }
};

export function MyDocuments() {
  const queryClient = useQueryClient();
  const [selectedReq, setSelectedReq] = useState<DocumentRequest | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch data
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['my_documents'],
    queryFn: () => documentsApi.listMyRequests(),
  });
  const requests = response?.data?.data?.items || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => documentsApi.createRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_documents'] });
      toast.success('Document request submitted successfully');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to submit request')),
  });

  // Table Columns
  const columns: ProColumn<DocumentRequest>[] = [
    {
      id: 'document_type',
      header: 'Document Type',
      accessorKey: 'document_type',
      cell: (val) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground uppercase text-sm">{val}</span>
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
      cell: (val) => <span className="text-sm text-muted-foreground">{format(new Date(val), 'MMM d, yyyy')}</span>,
      sortable: true,
    },
    {
      id: 'actions',
      header: '',
      accessorKey: 'id',
      cell: (val, row) => (
        <div className="flex justify-end pr-2" onClick={(e) => e.stopPropagation()}>
          {row.status === 'ready' && row.issued_file_url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(row.issued_file_url!, '_blank')}
              className="text-xs text-green-700 hover:text-green-800 hover:bg-green-50"
            >
              <Download className="h-3 w-3 mr-1.5" />
              Download
            </Button>
          )}
        </div>
      ),
      width: '120px',
    }
  ];

  // Entity Fields
  const fields: EntityField<DocumentRequest>[] = [
    { 
      key: 'document_type', 
      label: 'Document Type', 
      type: 'select', 
      required: true,
      options: [
        { label: 'Bonafide Certificate', value: 'bonafide' },
        { label: 'Transcript', value: 'transcript' },
        { label: 'No Objection Certificate (NOC)', value: 'noc' },
        { label: 'Migration Certificate', value: 'migration' }
      ]
    },
    { 
      key: 'urgency', 
      label: 'Urgency', 
      type: 'select', 
      required: true,
      defaultValue: 'normal',
      options: [
        { label: 'Normal', value: 'normal' },
        { label: 'High', value: 'high' }
      ]
    },
    { 
      key: 'purpose', 
      label: 'Purpose / Reason', 
      type: 'textarea', 
      required: true,
      placeholder: 'Explain why you need this document...'
    },
    { key: 'status', label: 'Status', type: 'text', editable: false },
    { key: 'rejection_reason', label: 'Rejection Reason', type: 'textarea', editable: false },
  ];

  const handleSave = async (formData: Record<string, any>, item: DocumentRequest | null) => {
    if (!item) {
      await createMutation.mutateAsync({
        document_type: formData.document_type,
        purpose: formData.purpose,
        urgency: formData.urgency
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Documents"
        description="Request and download official certificates"
        actions={
          <Button onClick={() => { setSelectedReq(null); setDialogMode('create'); setIsDialogOpen(true); }} className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        }
      />

      <ProTable
        columns={columns}
        data={requests}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        rowKey={(row) => row.id}
        onRowClick={(row) => {
          setSelectedReq(row);
          setDialogMode('view');
          setIsDialogOpen(true);
        }}
        emptyTitle="No document requests"
        emptyDescription="You haven't requested any documents yet."
      />

      <EntityViewEditDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        entityName="Document Request"
        data={selectedReq}
        fields={fields.filter(f => dialogMode === 'create' ? !f.editable && f.key !== 'status' && f.key !== 'rejection_reason' : true)}
        initialMode={dialogMode}
        canEdit={false} // Students cannot edit requests after submission
        onSave={handleSave}
        isSaving={createMutation.isPending}
      />
    </div>
  );
}

export default MyDocuments;
