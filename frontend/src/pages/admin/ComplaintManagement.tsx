import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complaintsApi } from '@/api/complaintsApi';
import { adminApi } from '@/api/adminApi';
import { QUERY_KEYS } from '@/lib/constants';
import { DataTable } from '@/components/shared/DataTable';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ClipboardList,
  AlertTriangle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type {
  ComplaintResponse,
  ComplaintStatus,
  ComplaintCategory,
  ComplaintListParams,
} from '@/types/api';

const categoryLabels: Record<ComplaintCategory, string> = {
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  wifi: 'Wi-Fi',
  cleanliness: 'Cleanliness',
  furniture: 'Furniture',
  security: 'Security',
  other: 'Other',
};

const statusOptions: { value: ComplaintStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const categoryOptions: { value: ComplaintCategory; label: string }[] = [
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'cleanliness', label: 'Cleanliness' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

export function ComplaintManagement() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<ComplaintCategory | undefined>();
  const [hostelFilter, setHostelFilter] = useState('');
  const [statusUpdateTarget, setStatusUpdateTarget] = useState<{
    id: string;
    status: ComplaintStatus;
  } | null>(null);

  const params: ComplaintListParams = {
    status: statusFilter,
    category: categoryFilter,
    hostel: hostelFilter || undefined,
  };

  const listQuery = useQuery({
    queryKey: [QUERY_KEYS.ADMIN_COMPLAINTS, params],
    queryFn: () => complaintsApi.listAll(params),
  });

  const facultyQuery = useQuery({
    queryKey: [QUERY_KEYS.FACULTY],
    queryFn: () => adminApi.listFaculty(),
  });

  const recurringQuery = useQuery({
    queryKey: [QUERY_KEYS.RECURRING_ISSUES],
    queryFn: () => complaintsApi.getRecurring(),
  });

  const ageingQuery = useQuery({
    queryKey: [QUERY_KEYS.AGEING_COMPLAINTS],
    queryFn: () => complaintsApi.getAgeing(),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ComplaintStatus }) =>
      complaintsApi.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_COMPLAINTS] });
      toast.success('Complaint status updated');
      setStatusUpdateTarget(null);
    },
    onError: () => toast.error('Failed to update status'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, facultyId }: { id: string; facultyId: string }) =>
      complaintsApi.assign(id, { assigned_to: facultyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_COMPLAINTS] });
      toast.success('Complaint assigned');
    },
    onError: () => toast.error('Failed to assign complaint'),
  });

  const complaints: ComplaintResponse[] = listQuery.data?.data?.data?.items ?? [];
  const faculty = facultyQuery.data?.data?.data ?? [];
  const recurring = recurringQuery.data?.data?.data ?? [];
  const ageing = ageingQuery.data?.data?.data ?? [];

  const openCount = complaints.filter((c) => c.status === 'open').length;
  const inProgressCount = complaints.filter((c) => c.status === 'in_progress').length;
  const resolvedCount = complaints.filter((c) => c.status === 'resolved').length;

  const columns = [
    {
      key: 'category',
      header: 'Category',
      render: (row: ComplaintResponse) => (
        <span className="font-medium text-foreground">
          {categoryLabels[row.category]}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (row: ComplaintResponse) => (
        <span className="text-sm text-muted-foreground">
          {row.location_hostel}
          {row.location_room ? ` · ${row.location_room}` : ''}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row: ComplaintResponse) => (
        <span className="max-w-xs truncate text-sm text-muted-foreground">
          {row.description}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: ComplaintResponse) => (
        <Select
          value={row.status}
          onValueChange={(v) =>
            setStatusUpdateTarget({ id: row.id, status: v as ComplaintStatus })
          }
        >
          <SelectTrigger className="h-8 w-36">
            <SelectValue>
              <StatusBadge status={row.status} type="complaint" />
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'assigned',
      header: 'Assigned To',
      render: (row: ComplaintResponse) => (
        <Select
          value={row.assigned_to ?? 'unassigned'}
          onValueChange={(v) => {
            if (v !== 'unassigned')
              assignMutation.mutate({ id: row.id, facultyId: v });
          }}
        >
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {faculty.map((f) => (
              <SelectItem key={f.id} value={f.user_id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'created',
      header: 'Filed',
      render: (row: ComplaintResponse) =>
        format(new Date(row.created_at), 'MMM d'),
    },
  ];

  if (listQuery.error) {
    return <ErrorState onRetry={() => listQuery.refetch()} />;
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
              value={statusFilter ?? 'all'}
              onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : (v as ComplaintStatus))}
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
              value={categoryFilter ?? 'all'}
              onValueChange={(v) => setCategoryFilter(v === 'all' ? undefined : (v as ComplaintCategory))}
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

          <DataTable
            columns={columns}
            data={complaints}
            isLoading={listQuery.isLoading}
            rowKey={(row) => row.id}
            emptyTitle="No complaints found"
            emptyDescription="There are no complaints matching these filters."
            emptyIcon={<ClipboardList className="h-6 w-6" />}
          />
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          {recurring.length === 0 ? (
            <ErrorState
              title="No recurring issues"
              description="No hotspot patterns detected in the last 30 days."
              icon={<TrendingUp className="h-6 w-6" />}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recurring.map((issue, idx) => (
                <Card key={idx} className="shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {categoryLabels[issue.category]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {issue.location_hostel} · {issue.count} reports
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      In the last {issue.window_days} days
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ageing" className="space-y-4">
          {ageing.length === 0 ? (
            <ErrorState
              title="No ageing complaints"
              description="All complaints are being handled in a timely manner."
              icon={<Clock className="h-6 w-6" />}
            />
          ) : (
            <div className="space-y-3">
              {ageing.map((item) => (
                <Card key={item.id} className="shadow-sm">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-700">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {categoryLabels[item.category]} · {item.location_hostel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Filed {format(new Date(item.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-destructive">
                        {item.age_days}
                      </p>
                      <p className="text-xs text-muted-foreground">days open</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {statusUpdateTarget && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="shadow-lg">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="text-sm text-foreground">
                Update to <strong>{statusUpdateTarget.status}</strong>?
              </span>
              <Button
                size="sm"
                onClick={() => statusMutation.mutate(statusUpdateTarget)}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatusUpdateTarget(null)}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
