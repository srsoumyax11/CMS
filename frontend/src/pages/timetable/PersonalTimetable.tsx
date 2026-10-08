import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { timetableApi } from '@/api/timetableApi';
import { QUERY_KEYS } from '@/lib/constants';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { WeeklyTimetableGrid } from '@/components/timetable/WeeklyTimetableGrid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function PersonalTimetable() {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.TIMETABLE, 'mine'],
    queryFn: () => timetableApi.getMySchedule(),
  });

  const scheduleData = data?.data?.data;
  const slots = scheduleData?.slots ?? [];
  const exceptions = scheduleData?.exceptions ?? [];

  // Compute summary metrics
  const totalSlots = slots.length;
  const uniqueSubjects = new Set(slots.map((s) => s.subject_id)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh Schedule
          </Button>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-xs border border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Weekly Class Slots</p>
              <h3 className="text-xl font-bold tracking-tight font-mono">{totalSlots} Slots</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Enrolled Courses / Subjects</p>
              <h3 className="text-xl font-bold tracking-tight font-mono">{uniqueSubjects} Subjects</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs border border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Single-Day Adjustments</p>
              <h3 className="text-xl font-bold tracking-tight font-mono">{exceptions.length} Active</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <Card className="shadow-xs border border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 text-center text-destructive flex flex-col items-center gap-2">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm font-semibold">Failed to load weekly schedule</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2 text-xs">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <WeeklyTimetableGrid slots={slots} exceptions={exceptions} isLoading={isLoading} />
      )}
    </div>
  );
}

export default PersonalTimetable;
