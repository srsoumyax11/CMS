import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ShieldAlert } from 'lucide-react';
import type { AdminItemResponse } from '@/types/api';

interface AdminTableProps {
  admins: AdminItemResponse[];
  isLoading: boolean;
  onRowClick?: (row: AdminItemResponse) => void;
}

export function AdminTable({ admins, isLoading, onRowClick }: AdminTableProps) {
  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: AdminItemResponse) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{row.name || 'Unassigned'}</span>
          <span className="text-xs text-muted-foreground">{row.email}</span>
        </div>
      ),
    },
    {
      key: 'user_id',
      header: 'Admin ID',
      render: (row: AdminItemResponse) => (
        <span className="text-sm text-muted-foreground">{row.user_id}</span>
      ),
    },
    {
      key: 'account_status',
      header: 'Account Status',
      render: (row: AdminItemResponse) => {
        return <StatusBadge status={row.account_status} type="account" />;
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={admins}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      onRowClick={onRowClick}
      emptyTitle="No administrators found"
      emptyDescription="There are no admin accounts matching this filter."
      emptyIcon={<ShieldAlert className="h-6 w-6" />}
    />
  );
}
