import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { STATUS_BADGE_CONFIG, type StatusConfigType } from '@/lib/status-config';

interface StatusBadgeProps {
  status: string;
  type: StatusConfigType;
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  // @ts-ignore - Dynamic key access
  const config = STATUS_BADGE_CONFIG[type]?.[status];

  if (!config) {
    return (
      <Badge variant="outline" className="font-medium bg-gray-100 text-gray-600 border-gray-200">
        {status}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn('font-medium', config.className)}
    >
      {config.label}
    </Badge>
  );
}
