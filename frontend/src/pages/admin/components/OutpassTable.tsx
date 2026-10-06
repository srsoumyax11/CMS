import { ProTable } from '@/components/shared/pro-table/ProTable';
import type { ProColumn } from '@/components/shared/pro-table/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/config/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CheckSquare, Check, X, LogOut, LogIn } from 'lucide-react';
import type { OutpassResponse } from '@/types/api';

interface OutpassTableProps {
  outpasses: OutpassResponse[];
  isLoading: boolean;
  onApproveClick: (outpass: OutpassResponse) => void;
  onRejectClick: (outpass: OutpassResponse) => void;
  onDepartClick: (outpass: OutpassResponse) => void;
  onReturnClick: (outpass: OutpassResponse) => void;
}

export function OutpassTable({ outpasses, isLoading, onApproveClick, onRejectClick, onDepartClick, onReturnClick }: OutpassTableProps) {
  const columns: ProColumn<OutpassResponse>[] = [
    {
      id: 'student',
      header: 'Student',
      sortable: true,
      cell: (_, row: OutpassResponse) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{row.student_name}</span>
          <span className="text-xs text-muted-foreground">{row.student_course}</span>
        </div>
      ),
    },
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
      cell: (val, row: OutpassResponse) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={val} type="outpass" />
          {row.is_overdue && (
            <Badge variant="destructive" className="text-xs">
              {row.overdue_hours}h
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (_, row: OutpassResponse) => {
        const actions: React.ReactNode[] = [];

        if (row.status === 'pending') {
          actions.push(
            <PermissionGuard permission={PERMISSIONS.OUTPASS.APPROVE} key={`p-approve-${row.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveClick(row);
                }}
              >
                <Check className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
            </PermissionGuard>,
            <PermissionGuard permission={PERMISSIONS.OUTPASS.APPROVE} key={`p-reject-${row.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onRejectClick(row);
                }}
              >
                <X className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>
            </PermissionGuard>
          );
        } else if (row.status === 'approved') {
          actions.push(
            <PermissionGuard permission={PERMISSIONS.OUTPASS.APPROVE} key={`p-depart-${row.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDepartClick(row);
                }}
              >
                <LogOut className="h-3.5 w-3.5 mr-1" /> Depart
              </Button>
            </PermissionGuard>
          );
        } else if (row.status === 'active') {
          actions.push(
            <PermissionGuard permission={PERMISSIONS.OUTPASS.APPROVE} key={`p-return-${row.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-500/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onReturnClick(row);
                }}
              >
                <LogIn className="h-3.5 w-3.5 mr-1" /> Return
              </Button>
            </PermissionGuard>
          );
        }

        if (actions.length === 0) {
          return <span className="text-xs text-muted-foreground italic">No actions available</span>;
        }

        return <div className="flex gap-1" onClick={e => e.stopPropagation()}>{actions}</div>;
      },
    },
  ];

  return (
    <ProTable<OutpassResponse>
      columns={columns}
      data={outpasses}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      searchPlaceholder="Filter outpasses by student, destination..."
      enableExport
      exportFileName="admin_outpasses"
      emptyTitle="No outpasses found"
      emptyDescription="There are no outpass requests matching these filters."
      emptyIcon={<CheckSquare className="h-6 w-6 text-muted-foreground" />}
    />
  );
}
