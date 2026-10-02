import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Check, X, Users, MoreVertical, Edit2 } from 'lucide-react';
import type { StudentItemResponse, AccountStatus, AcademicStatus } from '@/types/api';
import type { UpdateActionPayload } from './StudentActionModal';

interface StudentTableProps {
  students: StudentItemResponse[];
  isLoading: boolean;
  onRowClick: (row: StudentItemResponse) => void;
  onUpdateAction: (action: UpdateActionPayload) => void;
  onEditClick: (row: StudentItemResponse) => void;
}

export function StudentTable({ students, isLoading, onRowClick, onUpdateAction, onEditClick }: StudentTableProps) {
  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: StudentItemResponse) => (
        <span className="font-medium text-foreground">{row.name}</span>
      ),
    },
    {
      key: 'user_id',
      header: 'Reg No.',
      render: (row: StudentItemResponse) => (
        <span className="text-sm font-medium">{row.user_id || 'N/A'}</span>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      render: (row: StudentItemResponse) => (
        <span className="text-sm text-foreground">
          {row.course_name} · {row.department_name} ({row.year})
        </span>
      ),
    },
    {
      key: 'account_status',
      header: 'Account',
      render: (row: StudentItemResponse) => {
        return <StatusBadge status={row.account_status} type="account" />;
      },
    },
    {
      key: 'academic_status',
      header: 'Academic',
      render: (row: StudentItemResponse) => {
        if (!row.academic_status) {
          return (
            <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
              Incomplete
            </Badge>
          );
        }
        return <StatusBadge status={row.academic_status} type="academic" />;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: StudentItemResponse) => {
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {row.account_status === 'pending' && (
              <PermissionGuard permission="students:update">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                  title="Approve"
                  aria-label={`Approve ${row.name}`}
                  onClick={() => onUpdateAction({ 
                    id: row.id, 
                    payload: { account_status: 'active' },
                    label: 'approve account'
                  })}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                  title="Reject"
                  aria-label={`Reject ${row.name}`}
                  onClick={() => onUpdateAction({ 
                    id: row.id, 
                    payload: { account_status: 'rejected' },
                    label: 'reject account'
                  })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </PermissionGuard>
            )}

            <PermissionGuard permission="students:update">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Edit Profile"
                aria-label={`Edit ${row.name}`}
                onClick={() => onEditClick(row)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="students:update">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`More actions for ${row.name}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Account Status</DropdownMenuLabel>
                  {['active', 'suspended', 'revision', 'rejected'].map((status) => (
                    <DropdownMenuItem 
                      key={`acc-${status}`}
                      disabled={row.account_status === status}
                      onClick={() => onUpdateAction({ 
                        id: row.id, 
                        payload: { account_status: status as AccountStatus },
                        label: `mark account as ${status}`
                      })}
                      className="capitalize"
                    >
                      Mark as {status}
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Academic Status</DropdownMenuLabel>
                  {['enrolled', 'graduated', 'dropped', 'expelled'].map((status) => (
                    <DropdownMenuItem 
                      key={`acad-${status}`}
                      disabled={row.academic_status === status}
                      onClick={() => onUpdateAction({ 
                        id: row.id, 
                        payload: { academic_status: status as AcademicStatus },
                        label: `mark academic standing as ${status}`
                      })}
                      className="capitalize"
                    >
                      Mark as {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </PermissionGuard>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={students}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      onRowClick={onRowClick}
      emptyTitle="No students found"
      emptyDescription="There are no students matching this filter."
      emptyIcon={<Users className="h-6 w-6" />}
    />
  );
}
