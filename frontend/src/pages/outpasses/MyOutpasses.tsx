import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { outpassesApi } from '@/api/outpassesApi';
import { QUERY_KEYS } from '@/lib/constants';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable } from '@/components/shared/pro-table/ProTable';
import type { ProColumn } from '@/components/shared/pro-table/types';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckSquare, Plus } from 'lucide-react';
import { format } from 'date-fns';
import type { OutpassResponse } from '@/types/api';
import { useAuth } from '@/context/AuthContext';

export function MyOutpasses() {
  const { role } = useAuth();
  const basePath = role ? `/${role}` : '';
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.MY_OUTPASSES],
    queryFn: () => outpassesApi.getMine(),
  });

  const outpasses = data?.data?.data?.items ?? [];

  const columns: ProColumn<OutpassResponse>[] = [
    {
      id: 'destination',
      header: 'Destination',
      accessorKey: 'destination',
      sortable: true,
      cell: (val) => (
        <span className="font-medium text-foreground">{val}</span>
      ),
    },
    {
      id: 'departure_time',
      header: 'Departure',
      accessorKey: 'departure_time',
      sortable: true,
      cell: (val) => format(new Date(val), 'MMM d, HH:mm'),
    },
    {
      id: 'expected_return_time',
      header: 'Expected Return',
      accessorKey: 'expected_return_time',
      sortable: true,
      cell: (val) => format(new Date(val), 'MMM d, HH:mm'),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (val, row) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={val} type="outpass" />
          {row.is_overdue && (
            <Badge variant="destructive" className="text-xs">
              {row.overdue_hours}h overdue
            </Badge>
          )}
        </div>
      ),
    },
  ];

  if (error) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={() => navigate(`${basePath}/outpasses/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            New Outpass
          </Button>
        }
      />

      <ProTable<OutpassResponse>
        data={outpasses}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`${basePath}/outpasses/${row.id}`)}
        searchPlaceholder="Search destination..."
        enableExport
        exportFileName="my_outpasses"
        emptyTitle="No outpass requests"
        emptyDescription="You haven't requested any outpasses yet."
        emptyIcon={<CheckSquare className="h-6 w-6 text-muted-foreground" />}
      />
    </div>
  );
}
