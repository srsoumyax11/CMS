import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
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
  const columns = [
    {
      key: 'category',
      header: 'Category',
      render: (row: ComplaintResponse) => (
        <span className="font-medium text-foreground">
          {categoryLabels[row.category]}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (row: ComplaintResponse) => (
        <span className="text-sm text-muted-foreground">
          {row.location_hostel}
          {row.location_room ? ` · ${row.location_room}` : ''}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (row: ComplaintResponse) => (
        <span className="max-w-xs truncate text-sm text-muted-foreground">
          {row.description}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: ComplaintResponse) => (
        <PermissionGuard 
          permission="complaints:update" 
          fallback={<StatusBadge status={row.status} type="complaint" />}
        >
          <Select
            value={row.status}
            onValueChange={(v) => onStatusChange(row.id, v as ComplaintStatus)}
          >
            <SelectTrigger className="h-8 w-36">
              <SelectValue>
                <StatusBadge status={row.status} type="complaint" />
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
      key: 'assigned',
      header: 'Assigned To',
      render: (row: ComplaintResponse) => (
        <PermissionGuard 
          permission="complaints:assign"
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
      key: 'created',
      header: 'Filed',
      render: (row: ComplaintResponse) =>
        format(new Date(row.created_at), 'MMM d'),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={complaints}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      emptyTitle="No complaints found"
      emptyDescription="There are no complaints matching these filters."
      emptyIcon={<ClipboardList className="h-6 w-6" />}
    />
  );
}
