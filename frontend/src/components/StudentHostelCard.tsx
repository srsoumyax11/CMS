import { useQuery } from '@tanstack/react-query';
import { hostelApi } from '@/api/hostelApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Home, Users, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export function StudentHostelCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['my_hostel_allocation'],
    queryFn: () => hostelApi.getMyAllocation(),
    retry: 1,
  });

  const alloc = data?.data;

  if (isLoading) {
    return (
      <Card className="shadow-sm border">
        <CardContent className="p-6">
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (error || !alloc) {
    return (
      <Card className="shadow-sm border border-dashed">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
          <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
            <Home className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-foreground">No Active Hostel Allocation</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            You are currently registered as a day scholar or do not have an assigned hostel room.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">{alloc.building_name || 'Hostel Residence'}</CardTitle>
            <p className="text-xs text-muted-foreground">Room {alloc.room_number || 'Unassigned'}</p>
          </div>
        </div>

        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 capitalize">
          {alloc.status}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 grid grid-cols-2 gap-4 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4 text-primary shrink-0" />
          <div>
            <span className="block font-semibold text-foreground">Occupancy</span>
            <span>{alloc.occupied_count ?? 1} / {alloc.room_capacity ?? 2} Students</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <div>
            <span className="block font-semibold text-foreground">Allocated On</span>
            <span>
              {(() => {
                const dateVal = alloc.allocated_at || alloc.created_at;
                return dateVal ? format(new Date(dateVal), 'MMM d, yyyy') : 'N/A';
              })()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
