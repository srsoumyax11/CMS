import { useState } from 'react';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatCard } from '@/components/shared/StatCard';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { CheckSquare, Clock, AlertTriangle } from 'lucide-react';
import type { OutpassResponse, OutpassStatus } from '@/types/api';
import { useOutpassAdmin } from '@/hooks/useOutpassAdmin';
import { OutpassTable } from './components/OutpassTable';
import { useDialogState } from '@/hooks/useDialogState';

const statusFilterOptions: { value: OutpassStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function OutpassManagement() {
  const { filters, queries, mutations } = useOutpassAdmin();
  const [rejectNote, setRejectNote] = useState('');

  const rejectModal = useDialogState<OutpassResponse>();
  const confirmModal = useDialogState<{ outpass: OutpassResponse; type: 'approve' | 'depart' | 'return' }>();

  const outpasses: OutpassResponse[] = queries.listQuery.data?.data?.data?.items ?? [];

  const pendingCount = outpasses.filter((o) => o.status === 'pending').length;
  const activeCount = outpasses.filter((o) => o.status === 'active').length;
  const overdueCount = outpasses.filter((o) => o.is_overdue).length;

  if (queries.listQuery.error) {
    return <ErrorState onRetry={() => queries.listQuery.refetch()} />;
  }

  const handleConfirmAction = () => {
    if (!confirmModal.data) return;
    const { outpass, type } = confirmModal.data;
    
    if (type === 'approve') {
      mutations.approveMutation.mutate(outpass.id, { onSuccess: confirmModal.close });
    } else if (type === 'depart') {
      mutations.departMutation.mutate(outpass.id, { onSuccess: confirmModal.close });
    } else if (type === 'return') {
      mutations.returnMutation.mutate(outpass.id, { onSuccess: confirmModal.close });
    }
  };

  const confirmTitle = () => {
    switch (confirmModal.data?.type) {
      case 'approve': return 'Approve Outpass';
      case 'depart': return 'Confirm Departure';
      case 'return': return 'Confirm Return';
      default: return 'Confirm Action';
    }
  };

  const confirmDescription = () => {
    const name = confirmModal.data?.outpass.student_name;
    switch (confirmModal.data?.type) {
      case 'approve': return `Are you sure you want to approve this outpass request for ${name}?`;
      case 'depart': return `Confirm that ${name} has departed from campus.`;
      case 'return': return `Confirm that ${name} has returned to campus.`;
      default: return 'Are you sure you want to proceed?';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Outpass Management</h2>
        <p className="text-sm text-muted-foreground">
          Review requests and track student campus exits and returns
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={CheckSquare} label="Pending Requests" value={pendingCount} />
        <StatCard icon={Clock} label="Currently Off-Campus" value={activeCount} />
        <StatCard 
          icon={AlertTriangle} 
          label="Overdue Returns" 
          value={overdueCount} 
          trend={overdueCount > 0 ? { value: overdueCount, label: 'requires attention', isPositive: false } : undefined}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={filters.statusFilter ?? 'all'}
          onValueChange={(v) => filters.setStatusFilter(v === 'all' ? undefined : (v as OutpassStatus))}
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
          value={filters.overdueFilter === undefined ? 'all' : filters.overdueFilter ? 'overdue' : 'on-time'}
          onValueChange={(v) => {
            if (v === 'all') filters.setOverdueFilter(undefined);
            else if (v === 'overdue') filters.setOverdueFilter(true);
            else filters.setOverdueFilter(false);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Timeline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outpasses</SelectItem>
            <SelectItem value="overdue">Overdue Only</SelectItem>
            <SelectItem value="on-time">On Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <OutpassTable
        outpasses={outpasses}
        isLoading={queries.listQuery.isLoading}
        onApproveClick={(outpass) => confirmModal.open({ outpass, type: 'approve' })}
        onRejectClick={(outpass) => rejectModal.open(outpass)}
        onDepartClick={(outpass) => confirmModal.open({ outpass, type: 'depart' })}
        onReturnClick={(outpass) => confirmModal.open({ outpass, type: 'return' })}
      />

      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        title={confirmTitle()}
        description={confirmDescription()}
        onConfirm={handleConfirmAction}
        onCancel={confirmModal.close}
      />

      <Dialog open={rejectModal.isOpen} onOpenChange={(open) => !open && rejectModal.close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Outpass</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to reject the outpass request for {rejectModal.data?.student_name}?
            </p>
            <div className="space-y-2">
              <Label htmlFor="reject_note">Reason for Rejection</Label>
              <Input
                id="reject_note"
                placeholder="e.g., Incomplete information, restricted dates..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={rejectModal.close}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (rejectModal.data) {
                  mutations.rejectMutation.mutate(
                    { id: rejectModal.data.id, note: rejectNote },
                    { onSuccess: () => { rejectModal.close(); setRejectNote(''); } }
                  );
                }
              }}
            >
              Reject Outpass
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
