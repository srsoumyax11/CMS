import { ProTable } from '@/components/shared/pro-table/ProTable';
import type { ProColumn } from '@/components/shared/pro-table/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/config/permissions';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardList } from 'lucide-react';
import type { ComplaintResponse, ComplaintStatus, ComplaintCategory } from '@/types/api';

const categoryLabels: Record<ComplaintCategory, string> = {
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  wifi: 'Wi-Fi',
  cleanliness: 'Cleanliness',
  furniture: 'Furniture',
  security: 'Security',
  other: 'Other',
};

const statusOptions: { value: ComplaintStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

interface ComplaintTableProps {
  complaints: ComplaintResponse[];
  isLoading: boolean;
  faculty: { id: string; name: string }[];
  onStatusChange: (id: string, status: ComplaintStatus) => void;
  onAssignChange: (id: string, facultyId: string) => void;
}

export function ComplaintTable({ complaints, isLoading, faculty, onStatusChange, onAssignChange }: ComplaintTableProps) {
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
          {row.location_room ? ` · ${row.location_room}` : ''}
        </span>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      accessorKey: 'description',
      cell: (val) => (
        <span className="max-w-xs truncate text-sm text-muted-foreground block">
          {val}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (val: ComplaintStatus, row) => (
        <PermissionGuard 
          permission={PERMISSIONS.COMPLAINT.RESOLVE} 
          fallback={<StatusBadge status={val} type="complaint" />}
        >
          <Select
            value={val}
            onValueChange={(v) => onStatusChange(row.id, v as ComplaintStatus)}
          >
            <SelectTrigger className="h-8 w-36">
              <SelectValue>
                <StatusBadge status={val} type="complaint" />
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PermissionGuard>
      ),
    },
    {
      id: 'assigned',
      header: 'Assigned To',
      cell: (_, row) => (
        <PermissionGuard 
          permission={PERMISSIONS.COMPLAINT.ASSIGN}
          fallback={
            <span className="text-sm text-muted-foreground">
              {row.assigned_to ? faculty.find(f => f.id === row.assigned_to)?.name : 'Unassigned'}
            </span>
          }
        >
          <Select
            value={row.assigned_to ?? 'unassigned'}
            onValueChange={(v) => {
              if (v !== 'unassigned') onAssignChange(row.id, v);
            }}
          >
            <SelectTrigger className="h-8 w-40">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {faculty.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PermissionGuard>
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

  return (
    <ProTable<ComplaintResponse>
      columns={columns}
      data={complaints}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      searchPlaceholder="Filter complaints by category, description..."
      enableExport
      exportFileName="admin_complaints"
      emptyTitle="No complaints found"
      emptyDescription="There are no complaints matching these filters."
      emptyIcon={<ClipboardList className="h-6 w-6 text-muted-foreground" />}
    />
  );
}
