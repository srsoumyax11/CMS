import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { complaintsApi } from '@/api/complaintsApi';
import { QUERY_KEYS } from '@/lib/constants';
import { DataTable } from '@/components/shared/DataTable';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Plus } from 'lucide-react';
import { format } from 'date-fns';
import type { ComplaintResponse, ComplaintCategory } from '@/types/api';

const categoryLabels: Record<ComplaintCategory, string> = {
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  wifi: 'Wi-Fi',
  cleanliness: 'Cleanliness',
  furniture: 'Furniture',
  security: 'Security',
  other: 'Other',
};

interface MyComplaintsProps {
  basePath: string;
}

export function MyComplaints({ basePath }: MyComplaintsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'mine' | 'public'>('mine');

  const mineQuery = useQuery({
    queryKey: [QUERY_KEYS.MY_COMPLAINTS],
    queryFn: () => complaintsApi.getMine(),
    enabled: tab === 'mine',
  });

  const publicQuery = useQuery({
    queryKey: [QUERY_KEYS.PUBLIC_COMPLAINTS],
    queryFn: () => complaintsApi.getPublic(),
    enabled: tab === 'public',
  });

  const activeQuery = tab === 'mine' ? mineQuery : publicQuery;
  const complaints = activeQuery.data?.data?.data?.items ?? [];
  const queryKey = tab === 'mine' ? QUERY_KEYS.MY_COMPLAINTS : QUERY_KEYS.PUBLIC_COMPLAINTS;

  const cancelMutation = useMutation({
    mutationFn: (id: string) => complaintsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    },
  });

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
          {row.location_room ? ` · Room ${row.location_room}` : ''}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: ComplaintResponse) => (
        <StatusBadge status={row.status} type="complaint" />
      ),
    },
    {
      key: 'visibility',
      header: 'Visibility',
      render: (row: ComplaintResponse) => (
        <span className="text-sm capitalize text-muted-foreground">
          {row.visibility}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Filed',
      render: (row: ComplaintResponse) =>
        format(new Date(row.created_at), 'MMM d, yyyy'),
    },
  ];

  if (activeQuery.error) {
    return <ErrorState onRetry={() => activeQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Complaints</h2>
          <p className="text-sm text-muted-foreground">
            Track and manage your complaints
          </p>
        </div>
        <Button onClick={() => navigate(`${basePath}/complaints/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          New Complaint
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'mine' | 'public')}>
        <TabsList>
          <TabsTrigger value="mine">My Complaints</TabsTrigger>
          <TabsTrigger value="public">Public Complaints</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={complaints}
        isLoading={activeQuery.isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`${basePath}/complaints/${row.id}`)}
        emptyTitle={tab === 'mine' ? 'No complaints filed' : 'No public complaints'}
        emptyDescription={
          tab === 'mine'
            ? "You haven't filed any complaints yet."
            : 'There are no public complaints to display.'
        }
        emptyIcon={<ClipboardList className="h-6 w-6" />}
      />
    </div>
  );
}
