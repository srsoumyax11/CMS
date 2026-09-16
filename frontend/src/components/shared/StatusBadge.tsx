import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  ComplaintStatus,
  OutpassStatus,
} from '@/types/api';

const complaintStatusConfig: Record<
  ComplaintStatus,
  { label: string; className: string }
> = {
  open: { label: 'Open', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-700 border-green-200' },
  closed: { label: 'Closed', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200' },
};

const outpassStatusConfig: Record<
  OutpassStatus,
  { label: string; className: string }
> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700 border-green-200' },
  active: { label: 'Active', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200' },
};

interface StatusBadgeProps {
  status: ComplaintStatus | OutpassStatus;
  type: 'complaint' | 'outpass';
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const config =
    type === 'complaint'
      ? complaintStatusConfig[status as ComplaintStatus]
      : outpassStatusConfig[status as OutpassStatus];

  return (
    <Badge
      variant="outline"
      className={cn('font-medium', config.className)}
    >
      {config.label}
    </Badge>
  );
}
