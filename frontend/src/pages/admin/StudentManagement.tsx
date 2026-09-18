import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { QUERY_KEYS } from '@/lib/constants';
import { DataTable } from '@/components/shared/DataTable';
import { ErrorState } from '@/components/shared/ErrorState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { StudentItemResponse } from '@/types/api';

const statusBadgeConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
  active: { label: 'Active', className: 'bg-green-100 text-green-700 border-green-200' },
};

export function StudentManagement() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [approveAction, setApproveAction] = useState<{
    id: string;
    action: 'approved' | 'rejected';
  } | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.STUDENTS, statusFilter],
    queryFn: () => adminApi.listStudents({ status: statusFilter }),
  });

  const students: StudentItemResponse[] = data?.data?.data ?? [];

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approved' | 'rejected' }) =>
      adminApi.updateStudentStatus(id, { status: action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENTS] });
      toast.success('Student status updated');
      setApproveAction(null);
    },
    onError: () => toast.error('Failed to update student status'),
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: StudentItemResponse) => (
        <span className="font-medium text-foreground">{row.name}</span>
      ),
    },
    {
      key: 'user_id',
      header: 'ID',
      render: (row: StudentItemResponse) => (
        <span className="text-sm font-medium">{row.user_id || 'N/A'}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row: StudentItemResponse) => (
        <span className="text-sm text-muted-foreground">{row.email}</span>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      render: (row: StudentItemResponse) => (
        <span className="text-sm text-foreground">
          {row.course_name} · {row.branch_name}
        </span>
      ),
    },
    {
      key: 'year',
      header: 'Year',
      render: (row: StudentItemResponse) => row.year,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: StudentItemResponse) => {
        const config = statusBadgeConfig[row.status] ?? {
          label: row.status,
          className: 'bg-gray-100 text-gray-600 border-gray-200',
        };
        return (
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: StudentItemResponse) => {
        if (row.status !== 'pending') return null;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-600 hover:text-green-700"
              onClick={(e) => {
                e.stopPropagation();
                setApproveAction({ id: row.id, action: 'approved' });
              }}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setApproveAction({ id: row.id, action: 'rejected' });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (error) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Student Management</h2>
        <p className="text-sm text-muted-foreground">
          Approve or reject pending student accounts
        </p>
      </div>

      <Tabs value={statusFilter ?? 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={students}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        emptyTitle="No students found"
        emptyDescription="There are no students matching this filter."
        emptyIcon={<Users className="h-6 w-6" />}
      />

      <ConfirmDialog
        open={!!approveAction}
        onOpenChange={(open) => !open && setApproveAction(null)}
        title={approveAction?.action === 'approved' ? 'Approve this student?' : 'Reject this student?'}
        description={
          approveAction?.action === 'approved'
            ? 'The student will be able to log in and use the system.'
            : 'The student will not be able to log in. They may need to contact you.'
        }
        confirmLabel={approveAction?.action === 'approved' ? 'Approve' : 'Reject'}
        variant={approveAction?.action === 'rejected' ? 'destructive' : 'default'}
        onConfirm={() => approveAction && statusMutation.mutate(approveAction)}
      />
    </div>
  );
}
