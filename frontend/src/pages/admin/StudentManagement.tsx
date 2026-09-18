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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Check, X, Users, MoreVertical, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import type { StudentItemResponse, AccountStatus, AcademicStatus } from '@/types/api';

const accountStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  revision: { label: 'Revision', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  active: { label: 'Active', className: 'bg-green-100 text-green-700 border-green-200' },
  suspended: { label: 'Suspended', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
};

const academicStatusConfig: Record<string, { label: string; className: string }> = {
  enrolled: { label: 'Enrolled', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  graduated: { label: 'Graduated', className: 'bg-green-100 text-green-700 border-green-200' },
  dropped: { label: 'Dropped', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  expelled: { label: 'Expelled', className: 'bg-red-100 text-red-700 border-red-200' },
};

export function StudentManagement() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [showDetails, setShowDetails] = useState<StudentItemResponse | null>(null);
  
  const [updateAction, setUpdateAction] = useState<{
    id: string;
    payload: { account_status?: AccountStatus; academic_status?: AcademicStatus; status_note?: string };
    label: string;
  } | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.STUDENTS, statusFilter],
    queryFn: () => adminApi.listStudents({ status: statusFilter as AccountStatus }),
  });

  const students: StudentItemResponse[] = data?.data?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      adminApi.updateStudentStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENTS] });
      toast.success('Student status updated');
      setUpdateAction(null);
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
      header: 'Reg No.',
      render: (row: StudentItemResponse) => (
        <span className="text-sm font-medium">{row.user_id || 'N/A'}</span>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      render: (row: StudentItemResponse) => (
        <span className="text-sm text-foreground">
          {row.course_name} · {row.branch_name} ({row.year})
        </span>
      ),
    },
    {
      key: 'account_status',
      header: 'Account',
      render: (row: StudentItemResponse) => {
        const config = accountStatusConfig[row.account_status] ?? {
          label: row.account_status,
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
      key: 'academic_status',
      header: 'Academic',
      render: (row: StudentItemResponse) => {
        const config = academicStatusConfig[row.academic_status] ?? {
          label: row.academic_status,
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
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {row.account_status === 'pending' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                  title="Approve"
                  onClick={() => setUpdateAction({ 
                    id: row.id, 
                    payload: { account_status: 'active' },
                    label: 'approve account'
                  })}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-100"
                  title="Reject"
                  onClick={() => setUpdateAction({ 
                    id: row.id, 
                    payload: { account_status: 'rejected' },
                    label: 'reject account'
                  })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account Status</DropdownMenuLabel>
                {['active', 'suspended', 'revision', 'rejected'].map((status) => (
                  <DropdownMenuItem 
                    key={`acc-${status}`}
                    disabled={row.account_status === status}
                    onClick={() => setUpdateAction({ 
                      id: row.id, 
                      payload: { account_status: status as AccountStatus },
                      label: `mark account as ${status}`
                    })}
                    className="capitalize"
                  >
                    Mark as {status}
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Academic Status</DropdownMenuLabel>
                {['enrolled', 'graduated', 'dropped', 'expelled'].map((status) => (
                  <DropdownMenuItem 
                    key={`acad-${status}`}
                    disabled={row.academic_status === status}
                    onClick={() => setUpdateAction({ 
                      id: row.id, 
                      payload: { academic_status: status as AcademicStatus },
                      label: `mark academic standing as ${status}`
                    })}
                    className="capitalize"
                  >
                    Mark as {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
          Manage student accounts and academic lifecycles
        </p>
      </div>

      <Tabs value={statusFilter ?? 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="suspended">Suspended</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={students}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => setShowDetails(row)}
        emptyTitle="No students found"
        emptyDescription="There are no students matching this filter."
        emptyIcon={<Users className="h-6 w-6" />}
      />

      <ConfirmDialog
        open={!!updateAction}
        onOpenChange={(open) => !open && setUpdateAction(null)}
        title={updateAction ? `Confirm Update` : 'Confirm Action'}
        description={updateAction ? `Are you sure you want to ${updateAction.label}?` : ''}
        confirmLabel="Confirm"
        onConfirm={() => updateAction && updateMutation.mutate({ id: updateAction.id, payload: updateAction.payload })}
      />

      <Dialog open={!!showDetails} onOpenChange={(open) => !open && setShowDetails(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {showDetails && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 border-b pb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                  {showDetails.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{showDetails.name}</h3>
                  <p className="text-sm text-muted-foreground">{showDetails.course_name} · {showDetails.branch_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Registration No.</p>
                  <p className="font-medium text-foreground">{showDetails.user_id || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Email Address</p>
                  <p className="font-medium text-foreground truncate" title={showDetails.email}>
                    {showDetails.email}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Batch/Year</p>
                  <p className="font-medium text-foreground">{showDetails.year}</p>
                </div>
                <div className="space-y-1"></div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Account Status</p>
                  <div className="mt-1">
                    <Badge variant="outline" className={accountStatusConfig[showDetails.account_status]?.className}>
                      {accountStatusConfig[showDetails.account_status]?.label || showDetails.account_status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Academic Status</p>
                  <div className="mt-1">
                    <Badge variant="outline" className={academicStatusConfig[showDetails.academic_status]?.className}>
                      {academicStatusConfig[showDetails.academic_status]?.label || showDetails.academic_status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
