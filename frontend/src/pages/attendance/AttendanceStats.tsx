import { useQuery } from '@tanstack/react-query';
import { attendanceApi } from '@/api/timetableApi';
import { QUERY_KEYS } from '@/lib/constants';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen } from 'lucide-react';
import type { AttendanceStat } from '@/types/api';

export function AttendanceStats() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.MY_ATTENDANCE_STATS],
    queryFn: () => attendanceApi.getMyStats(),
  });

  const stats: AttendanceStat[] = (data?.data?.data as AttendanceStat[]) ?? [];

  if (error) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const overallPercentage = stats.length > 0
    ? Math.round(stats.reduce((sum, s) => sum + s.percentage, 0) / stats.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader />

      {stats.length === 0 ? (
        <EmptyState
          title="No attendance records"
          description="Your attendance data will appear here once records are added."
          icon={<BookOpen className="h-6 w-6 text-muted-foreground" />}
        />
      ) : (
        <>
          <Card className="shadow-sm">
            <CardContent className="flex items-center gap-6 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <span className="text-xl font-bold">{overallPercentage}%</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Overall Attendance</p>
                <p className="text-xs text-muted-foreground">
                  Across {stats.length} subject{stats.length !== 1 ? 's' : ''}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {stats.map((stat, idx) => {
              const colorClass =
                stat.percentage >= 75
                  ? 'text-green-600'
                  : stat.percentage >= 50
                    ? 'text-amber-600'
                    : 'text-red-600';

              return (
                <Card key={idx} className="shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        {stat.subject_name}
                      </p>
                      <span className={`text-sm font-bold ${colorClass}`}>
                        {stat.percentage}%
                      </span>
                    </div>
                    <Progress
                      value={stat.percentage}
                      className="mt-3 h-2"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {stat.attended} / {stat.total_classes} classes attended
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
