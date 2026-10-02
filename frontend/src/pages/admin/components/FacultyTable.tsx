import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users } from 'lucide-react';
import type { FacultyItemResponse } from '@/types/api';

interface FacultyTableProps {
  faculty: FacultyItemResponse[];
  isLoading: boolean;
  onRowClick: (row: FacultyItemResponse) => void;
}

export function FacultyTable({ faculty, isLoading, onRowClick }: FacultyTableProps) {
  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: FacultyItemResponse) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={row.photo_url || ""} alt={row.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {row.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (row: FacultyItemResponse) => row.department_name,
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (row: FacultyItemResponse) => row.designation,
    },
    {
      key: 'account_status',
      header: 'Account',
      render: (row: FacultyItemResponse) => {
        return <StatusBadge status={row.account_status} type="account" />;
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={faculty}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      onRowClick={onRowClick}
      emptyTitle="No faculty found"
      emptyDescription="There are no faculty members matching this filter."
      emptyIcon={<Users className="h-6 w-6" />}
    />
  );
}
