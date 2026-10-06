import { useQuery } from '@tanstack/react-query';
import { financeApi } from '@/api/financeApi';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn } from '@/components/shared/pro-table';
import { IndianRupee } from 'lucide-react';
import type { FeeDue } from '@/types/api';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const FeeStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'paid': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">Paid</Badge>;
    case 'partial': return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">Partial</Badge>;
    case 'pending': return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">Pending</Badge>;
    case 'overdue': return <Badge variant="destructive">Overdue</Badge>;
    default: return <Badge variant="outline" className="capitalize">{status}</Badge>;
  }
};

export function MyFees() {
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['my_fees'],
    queryFn: () => financeApi.listMyFees(),
  });
  const fees = response?.data?.data || [];

  const columns: ProColumn<FeeDue>[] = [
    {
      id: 'description',
      header: 'Fee Description',
      accessorKey: 'description',
      cell: (val) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IndianRupee className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground">{val}</span>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'amount',
      header: 'Amount',
      accessorKey: 'total_amount',
      cell: (val, row) => (
        <div className="flex flex-col">
          <span className="font-semibold">₹{row.total_amount}</span>
          {row.paid_amount > 0 && <span className="text-xs text-muted-foreground">Paid: ₹{row.paid_amount}</span>}
        </div>
      ),
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: (val) => <FeeStatusBadge status={val} />,
      sortable: true,
    },
    {
      id: 'due_date',
      header: 'Due Date',
      accessorKey: 'due_date',
      cell: (val) => <span className="text-sm font-medium">{format(new Date(val), 'MMM d, yyyy')}</span>,
      sortable: true,
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Fees"
        description="View your fee dues and payment history"
      />

      <ProTable
        columns={columns}
        data={fees}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        rowKey={(row) => row.id}
        emptyTitle="No fees found"
        emptyDescription="You have no fee records at this time."
      />
    </div>
  );
}

export default MyFees;
