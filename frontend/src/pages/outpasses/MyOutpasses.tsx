import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { outpassesApi } from '@/api/outpassesApi';
import { QUERY_KEYS } from '@/lib/constants';
import { DataTable } from '@/components/shared/DataTable';
import { ErrorState } from '@/components/shared/ErrorState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckSquare, Plus } from 'lucide-react';
import { format } from 'date-fns';
import type { OutpassResponse } from '@/types/api';

interface MyOutpassesProps {
  basePath: string;
}

export function MyOutpasses({ basePath }: MyOutpassesProps) {
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.MY_OUTPASSES],
    queryFn: () => outpassesApi.getMine(),
  });

  const outpasses = data?.data?.data?.items ?? [];

  const columns = [
    {
      key: 'destination',
      header: 'Destination',
      render: (row: OutpassResponse) => (
        <span className="font-medium text-foreground">{row.destination}</span>
      ),
    },
    {
      key: 'departure_time',
      header: 'Departure',
      render: (row: OutpassResponse) =>
        format(new Date(row.departure_time), 'MMM d, HH:mm'),
    },
    {
      key: 'expected_return_time',
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">My Outpasses</h2>
          <p className="text-sm text-muted-foreground">
            Request and track gate passes
          </p>
        </div>
        <Button onClick={() => navigate(`${basePath}/outpasses/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          New Outpass
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={outpasses}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`${basePath}/outpasses/${row.id}`)}
        emptyTitle="No outpass requests"
        emptyDescription="You haven't requested any outpasses yet."
        emptyIcon={<CheckSquare className="h-6 w-6" />}
      />
    </div>
  );
}
