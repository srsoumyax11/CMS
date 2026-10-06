import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { getErrorMessage } from '@/lib/error-utils';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn } from '@/components/shared/pro-table';
import { EntityViewEditDialog, type EntityField } from '@/components/shared/entity-dialog';
import { Button } from '@/components/ui/button';
import { Plus, IndianRupee, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import type { FeeDue, StudentItemResponse } from '@/types/api';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const FeeStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'paid': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">Paid</Badge>;
    case 'partial': return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">Partial</Badge>;
    case 'pending': return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">Pending</Badge>;
    case 'overdue': return <Badge variant="destructive">Overdue</Badge>;
    default: return <Badge variant="outline" className="capitalize">{status}</Badge>;
  }
};

export function FeeManagement() {
  const queryClient = useQueryClient();
  const [selectedFee, setSelectedFee] = useState<FeeDue | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch data
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['fees'],
    queryFn: () => adminApi.listFeeDues(),
  });
  const fees = response?.data?.data || [];

  // Fetch students for the dropdown
  const { data: studentsRes } = useQuery({
    queryKey: ['students'],
    queryFn: () => adminApi.listStudents(),
  });
  const students = studentsRes?.data?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createFeeDue(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      toast.success('Fee due created successfully');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to create fee due')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateFeeDue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      toast.success('Fee due updated successfully');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to update fee due')),
  });

  // Table Columns
  const columns: ProColumn<FeeDue>[] = [
    {
      id: 'student',
      header: 'Student / User ID',
      accessorKey: 'student_id',
      cell: (val, row) => {
        // Just find the student name if it's not provided by backend directly
        const st = students.find((s: StudentItemResponse) => s.id === val);
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IndianRupee className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold text-foreground">{row.student_name || st?.name || 'Unknown'}</span>
              <p className="text-xs text-muted-foreground font-mono">{st?.user_id || val.substring(0, 8) + '...'}</p>
            </div>
          </div>
        );
      },
      sortable: true,
    },
    {
      id: 'description',
      header: 'Description',
      accessorKey: 'description',
      sortable: true,
      cell: (val) => <span>{val}</span>
    },
    {
      id: 'amount',
      header: 'Total / Paid',
      accessorKey: 'total_amount',
      cell: (val, row) => (
        <div className="flex flex-col">
          <span className="font-semibold">₹{row.total_amount}</span>
          <span className="text-xs text-muted-foreground">Paid: ₹{row.paid_amount}</span>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: (val) => <FeeStatusBadge status={val} />,
      sortable: true,
    },
    {
      id: 'due_date',
      header: 'Due Date',
      accessorKey: 'due_date',
      cell: (val) => <span className="text-sm font-medium">{format(new Date(val), 'MMM d, yyyy')}</span>,
      sortable: true,
    }
  ];

  // Entity Fields
  const fields: EntityField<FeeDue>[] = [
    { 
      key: 'student_id', 
      label: 'Student', 
      type: 'select', 
      required: true,
      options: students.map((s: StudentItemResponse) => ({ label: `${s.name} (${s.user_id || s.email})`, value: s.id }))
    },
    { 
      key: 'description', 
      label: 'Description', 
      type: 'text', 
      required: true,
      placeholder: 'e.g. Tuition Fee 2026'
    },
    { key: 'total_amount', label: 'Total Amount (₹)', type: 'number', required: true, defaultValue: 0 },
    { key: 'paid_amount', label: 'Paid Amount (₹)', type: 'number', required: true, defaultValue: 0 },
    { key: 'due_date', label: 'Due Date', type: 'text', required: true, placeholder: 'YYYY-MM-DD' },
    { 
      key: 'status', 
      label: 'Status', 
      type: 'select', 
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Partial', value: 'partial' },
        { label: 'Paid', value: 'paid' },
        { label: 'Overdue', value: 'overdue' },
      ]
    },
    { key: 'receipt_number', label: 'Receipt Number', type: 'text', placeholder: 'Optional' },
  ];

  const handleSave = async (formData: Record<string, any>, item: FeeDue | null) => {
    const payload = {
      student_id: formData.student_id,
      fee_type: formData.fee_type,
      amount_due: Number(formData.amount_due),
      amount_paid: Number(formData.amount_paid),
      due_date: formData.due_date,
      status: formData.status,
      receipt_number: formData.receipt_number || null,
    };

    if (item) {
      await updateMutation.mutateAsync({ id: item.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Management"
        description="Manage student fees, dues, and payments"
        actions={
          <Button onClick={() => { setSelectedFee(null); setDialogMode('create'); setIsDialogOpen(true); }} className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            Add Fee Due
          </Button>
        }
      />

      <ProTable
        columns={columns}
        data={fees}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        rowKey={(row) => row.id}
        onRowClick={(row) => {
          setSelectedFee(row);
          setDialogMode('view');
          setIsDialogOpen(true);
        }}
        searchPlaceholder="Search fees..."
        exportFileName="fees"
      />

      <EntityViewEditDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        entityName="Fee Due"
        data={selectedFee}
        fields={fields}
        initialMode={dialogMode}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

export default FeeManagement;
