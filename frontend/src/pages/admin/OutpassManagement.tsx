import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { outpassesApi } from '@/api/outpassesApi';
import { QUERY_KEYS } from '@/lib/constants';
import { DataTable } from '@/components/shared/DataTable';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatCard } from '@/components/shared/StatCard';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  CheckSquare,
  Clock,
  Check,
  X,
  LogOut,
  LogIn,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type {
  OutpassResponse,
  OutpassStatus,
  OutpassListParams,
} from '@/types/api';

const statusFilterOptions: { value: OutpassStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function OutpassManagement() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<OutpassStatus | undefined>();
  const [overdueFilter, setOverdueFilter] = useState<boolean | undefined>();
  const [rejectTarget, setRejectTarget] = useState<OutpassResponse | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    outpass: OutpassResponse;
    type: 'approve' | 'depart' | 'return';
  } | null>(null);

  const params: OutpassListParams = {
    status: statusFilter,
    is_overdue: overdueFilter,
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.ADMIN_OUTPASSES, params],
    queryFn: () => outpassesApi.listAll(params),
  });

  const outpasses: OutpassResponse[] = data?.data?.data?.items ?? [];

  const approveMutation = useMutation({
    mutationFn: (id: string) => outpassesApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_OUTPASSES] });
      toast.success('Outpass approved');
      setConfirmAction(null);
    },
    onError: () => toast.error('Failed to approve outpass'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      outpassesApi.reject(id, { note: note || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_OUTPASSES] });
      toast.success('Outpass rejected');
      setRejectTarget(null);
      setRejectNote('');
    },
    onError: () => toast.error('Failed to reject outpass'),
  });

  const departMutation = useMutation({
    mutationFn: (id: string) => outpassesApi.depart(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_OUTPASSES] });
      toast.success('Marked as departed');
      setConfirmAction(null);
    },
    onError: () => toast.error('Failed to mark departure'),
  });

  const returnMutation = useMutation({
    mutationFn: (id: string) => outpassesApi.return(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_OUTPASSES] });
      toast.success('Marked as returned');
      setConfirmAction(null);
    },
    onError: () => toast.error('Failed to mark return'),
  });

  const pendingCount = outpasses.filter((o) => o.status === 'pending').length;
  const activeCount = outpasses.filter((o) => o.status === 'active').length;
  const overdueCount = outpasses.filter((o) => o.is_overdue).length;

  const columns = [
    {
      key: 'destination',
      header: 'Destination',
      render: (row: OutpassResponse) => (
        <span className="font-medium text-foreground">{row.destination}</span>
      ),
    },
    {
      key: 'departure',
      header: 'Departure',
      render: (row: OutpassResponse) =>
        format(new Date(row.departure_time), 'MMM d, HH:mm'),
    },
    {
      key: 'return',
      header: 'Expected Return',
      render: (row: OutpassResponse) =>
        format(new Date(row.expected_return_time), 'MMM d, HH:mm'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: OutpassResponse) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} type="outpass" />
          {row.is_overdue && (
            <Badge variant="destructive" className="text-xs">
              {row.overdue_hours}h
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: OutpassResponse) => {
        const actions: React.ReactNode[] = [];

        if (row.status === 'pending') {
          actions.push(
            <Button
              key="approve"
              variant="ghost"
              size="sm"
              className="h-7 text-green-600"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmAction({ outpass: row, type: 'approve' });
              }}
            >
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>,
            <Button
              key="reject"
              variant="ghost"
              size="sm"
              className="h-7 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setRejectTarget(row);
              }}
            >
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
          );
        }

        if (row.status === 'approved') {
          actions.push(
            <Button
              key="depart"
              variant="ghost"
              size="sm"
              className="h-7 text-blue-600"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmAction({ outpass: row, type: 'depart' });
              }}
            >
              <LogOut className="h-3.5 w-3.5" /> Depart
            </Button>
          );
        }

        if (row.status === 'active') {
          actions.push(
            <Button
              key="return"
              variant="ghost"
              size="sm"
              className="h-7 text-green-600"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmAction({ outpass: row, type: 'return' });
              }}
            >
              <LogIn className="h-3.5 w-3.5" /> Return
            </Button>
          );
        }

        return <div className="flex items-center gap-1">{actions}</div>;
      },
    },
  ];

  if (error) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Outpass Management</h2>
        <p className="text-sm text-muted-foreground">
          Approve, reject, and track student gate passes
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Clock} label="Pending" value={pendingCount} />
        <StatCard icon={CheckSquare} label="Active" value={activeCount} />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={overdueCount}
          className={overdueCount > 0 ? 'border-destructive/30' : ''}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter ?? 'all'}
          onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : (v as OutpassStatus))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statusFilterOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={overdueFilter === undefined ? 'all' : overdueFilter ? 'yes' : 'no'}
          onValueChange={(v) => {
            if (v === 'all') setOverdueFilter(undefined);
            else setOverdueFilter(v === 'yes');
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Overdue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Overdue Only</SelectItem>
            <SelectItem value="no">Not Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={outpasses}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        emptyTitle="No outpass requests"
        emptyDescription="There are no outpasses matching these filters."
        emptyIcon={<CheckSquare className="h-6 w-6" />}
      />

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Outpass</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Rejecting outpass to <strong>{rejectTarget?.destination}</strong>
            </p>
            <div className="space-y-2">
              <Label htmlFor="reject-note">Rejection Note (optional)</Label>
              <Input
                id="reject-note"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Reason for rejection..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                rejectTarget &&
                rejectMutation.mutate({ id: rejectTarget.id, note: rejectNote })
              }
            >
              Reject Outpass
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={
          confirmAction?.type === 'approve'
            ? 'Approve this outpass?'
            : confirmAction?.type === 'depart'
              ? 'Mark as departed?'
              : 'Mark as returned?'
        }
        description={
          confirmAction?.type === 'approve'
            ? `The student will be allowed to leave for ${confirmAction.outpass.destination}.`
            : confirmAction?.type === 'depart'
              ? 'The student has left the campus gate.'
              : 'The student has returned to campus.'
        }
        confirmLabel={
          confirmAction?.type === 'approve'
            ? 'Approve'
            : confirmAction?.type === 'depart'
              ? 'Confirm Departure'
              : 'Confirm Return'
        }
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === 'approve')
            approveMutation.mutate(confirmAction.outpass.id);
          else if (confirmAction.type === 'depart')
            departMutation.mutate(confirmAction.outpass.id);
          else returnMutation.mutate(confirmAction.outpass.id);
        }}
      />
    </div>
  );
}
