import { useState } from 'react';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatCard } from '@/components/shared/StatCard';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardList, Clock, TrendingUp } from 'lucide-react';
import type { ComplaintStatus, ComplaintCategory } from '@/types/api';
import { useComplaintAdmin } from '@/hooks/useComplaintAdmin';
import { ComplaintTable } from './components/ComplaintTable';

const categoryOptions: { value: ComplaintCategory; label: string }[] = [
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'cleanliness', label: 'Cleanliness' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

const statusOptions: { value: ComplaintStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export function ComplaintManagement() {
  const { filters, queries, mutations } = useComplaintAdmin();
  const [statusUpdateTarget, setStatusUpdateTarget] = useState<{
    id: string;
    status: ComplaintStatus;
  } | null>(null);

  const complaints = queries.listQuery.data?.data?.data?.items ?? [];
  const faculty = queries.facultyQuery.data?.data?.data ?? [];
  const recurring = queries.recurringQuery.data?.data?.data ?? [];
  const ageing = queries.ageingQuery.data?.data?.data ?? [];

  const openCount = complaints.filter((c) => c.status === 'open').length;
  const inProgressCount = complaints.filter((c) => c.status === 'in_progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;

  if (queries.listQuery.error) {
    return <ErrorState onRetry={() => queries.listQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Complaint Management</h2>
        <p className="text-sm text-muted-foreground">
          Review, assign, and resolve complaints across campus
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={ClipboardList} label="Open" value={openCount} />
        <StatCard icon={Clock} label="In Progress" value={inProgressCount} />
        <StatCard icon={TrendingUp} label="Resolved" value={resolvedCount} />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Complaints</TabsTrigger>
          <TabsTrigger value="recurring">Recurring Issues</TabsTrigger>
          <TabsTrigger value="ageing">Ageing Complaints</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select
              value={filters.statusFilter ?? 'all'}
              onValueChange={(v) => filters.setStatusFilter(v === 'all' ? undefined : (v as ComplaintStatus))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.categoryFilter ?? 'all'}
              onValueChange={(v) => filters.setCategoryFilter(v === 'all' ? undefined : (v as ComplaintCategory))}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ComplaintTable
            complaints={complaints}
            isLoading={queries.listQuery.isLoading}
            faculty={faculty}
            onStatusChange={(id, status) => setStatusUpdateTarget({ id, status })}
            onAssignChange={(id, facultyId) => mutations.assignMutation.mutate({ id, facultyId })}
          />
        </TabsContent>

        <TabsContent value="recurring">
          <ComplaintTable
            complaints={recurring}
            isLoading={queries.recurringQuery.isLoading}
            faculty={faculty}
            onStatusChange={(id, status) => setStatusUpdateTarget({ id, status })}
            onAssignChange={(id, facultyId) => mutations.assignMutation.mutate({ id, facultyId })}
          />
        </TabsContent>

        <TabsContent value="ageing">
          <ComplaintTable
            complaints={ageing}
            isLoading={queries.ageingQuery.isLoading}
            faculty={faculty}
            onStatusChange={(id, status) => setStatusUpdateTarget({ id, status })}
            onAssignChange={(id, facultyId) => mutations.assignMutation.mutate({ id, facultyId })}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        isOpen={!!statusUpdateTarget}
        title="Update Complaint Status"
        description={`Are you sure you want to mark this complaint as ${
          statusUpdateTarget?.status.replace('_', ' ')
        }?`}
        onConfirm={() => {
          if (statusUpdateTarget) {
            mutations.statusMutation.mutate({
              id: statusUpdateTarget.id,
              status: statusUpdateTarget.status,
            });
          }
        }}
        onCancel={() => setStatusUpdateTarget(null)}
      />
    </div>
  );
}
