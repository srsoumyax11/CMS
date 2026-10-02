import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CheckSquare, Check, X, LogOut, LogIn } from 'lucide-react';
import type { OutpassResponse } from '@/types/api';
import type { UpdateActionPayload } from './StudentActionModal'; // Let's create specific action props instead.

interface OutpassTableProps {
  outpasses: OutpassResponse[];
  isLoading: boolean;
  onApproveClick: (outpass: OutpassResponse) => void;
  onRejectClick: (outpass: OutpassResponse) => void;
  onDepartClick: (outpass: OutpassResponse) => void;
  onReturnClick: (outpass: OutpassResponse) => void;
}

export function OutpassTable({ outpasses, isLoading, onApproveClick, onRejectClick, onDepartClick, onReturnClick }: OutpassTableProps) {
  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (row: OutpassResponse) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{row.student_name}</span>
          <span className="text-xs text-muted-foreground">{row.student_course}</span>
        </div>
      ),
    },
    {
      key: 'destination',
      header: 'Destination',
      render: (row: OutpassResponse) => (
        <span className="font-medium text-foreground">{row.destination}</span>
      ),
    },
    {
      key: 'departure',
      header: 'Departure',
      render: (row: OutpassResponse) =>
        format(new Date(row.departure_time), 'MMM d, HH:mm'),
    },
    {
      key: 'return',
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
              {row.overdue_hours}h
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: OutpassResponse) => {
        const actions: React.ReactNode[] = [];

        if (row.status === 'pending') {
          actions.push(
            <PermissionGuard permission="outpasses:approve" key={`p-approve-${row.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveClick(row);
                }}
              >
                <Check className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
            </PermissionGuard>,
            <PermissionGuard permission="outpasses:approve" key={`p-reject-${row.id}`}>
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
            <PermissionGuard permission="outpasses:manage_security" key={`p-depart-${row.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
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
            <PermissionGuard permission="outpasses:manage_security" key={`p-return-${row.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
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
    <DataTable
      columns={columns}
      data={outpasses}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      emptyTitle="No outpasses found"
      emptyDescription="There are no outpass requests matching these filters."
      emptyIcon={<CheckSquare className="h-6 w-6" />}
    />
  );
}
