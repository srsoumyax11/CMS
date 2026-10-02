import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { complaintsApi } from '@/api/complaintsApi';
import { QUERY_KEYS } from '@/lib/constants';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable } from '@/components/shared/pro-table/ProTable';
import type { ProColumn } from '@/components/shared/pro-table/types';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Plus } from 'lucide-react';
import { format } from 'date-fns';
import type { ComplaintResponse, ComplaintCategory } from '@/types/api';
import { useAuth } from '@/context/AuthContext';

const categoryLabels: Record<ComplaintCategory, string> = {
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  wifi: 'Wi-Fi',
  cleanliness: 'Cleanliness',
  furniture: 'Furniture',
  security: 'Security',
  other: 'Other',
};

export function MyComplaints() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const basePath = role ? `/${role}` : '';
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

  const columns: ProColumn<ComplaintResponse>[] = [
    {
      id: 'category',
      header: 'Category',
      accessorKey: 'category',
      sortable: true,
      cell: (val: ComplaintCategory) => (
        <span className="font-medium text-foreground">
          {categoryLabels[val] || val}
        </span>
      ),
    },
    {
      id: 'location',
      header: 'Location',
      cell: (_, row) => (
        <span className="text-sm text-muted-foreground">
          {row.location_hostel}
          {row.location_room ? ` · Room ${row.location_room}` : ''}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (val) => <StatusBadge status={val} type="complaint" />,
    },
    {
      id: 'visibility',
      header: 'Visibility',
      accessorKey: 'visibility',
      cell: (val) => (
        <span className="text-sm capitalize text-muted-foreground">
          {val}
        </span>
      ),
    },
    {
      id: 'created_at',
      header: 'Filed',
      accessorKey: 'created_at',
      sortable: true,
      cell: (val) => format(new Date(val), 'MMM d, yyyy'),
    },
  ];

  if (activeQuery.error) {
    return <ErrorState onRetry={() => activeQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={() => navigate(`${basePath}/complaints/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            New Complaint
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'mine' | 'public')}>
        <TabsList>
          <TabsTrigger value="mine">My Complaints</TabsTrigger>
          <TabsTrigger value="public">Public Complaints</TabsTrigger>
        </TabsList>
      </Tabs>

      <ProTable<ComplaintResponse>
        data={complaints}
        columns={columns}
        isLoading={activeQuery.isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`${basePath}/complaints/${row.id}`)}
        searchPlaceholder="Search complaints..."
        enableExport
        exportFileName={tab === 'mine' ? 'my_complaints' : 'public_complaints'}
        emptyTitle={tab === 'mine' ? 'No complaints filed' : 'No public complaints'}
        emptyDescription={
          tab === 'mine'
            ? "You haven't filed any complaints yet."
            : 'There are no public complaints to display.'
        }
        emptyIcon={<ClipboardList className="h-6 w-6 text-muted-foreground" />}
      />
    </div>
  );
}
