import { useQuery } from '@tanstack/react-query';
import { timetableApi } from '@/api/timetableApi';
import { QUERY_KEYS } from '@/lib/constants';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import type { TimetableSlot, DayOfWeek } from '@/types/api';

const DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const dayLabels: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const subjectColors = [
  'bg-primary/10 border-primary/20 text-primary',
  'bg-secondary border-border text-secondary-foreground',
  'bg-muted border-border text-foreground',
  'bg-accent border-border text-accent-foreground',
  'bg-destructive/10 border-destructive/20 text-destructive',
  'bg-popover border-border text-popover-foreground',
];

function getSubjectColor(subject: string): string {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  return subjectColors[Math.abs(hash) % subjectColors.length];
}

export function TimetableView() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.MY_TIMETABLE],
    queryFn: () => timetableApi.getMine(),
  });

  const slots: TimetableSlot[] = (data?.data?.data as TimetableSlot[]) ?? [];

  const slotsByDay: Record<DayOfWeek, TimetableSlot[]> = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };

  slots.forEach((slot) => {
    if (slotsByDay[slot.day_of_week]) {
      slotsByDay[slot.day_of_week].push(slot);
    }
  });

  Object.keys(slotsByDay).forEach((day) => {
    slotsByDay[day as DayOfWeek].sort((a, b) => a.start_time.localeCompare(b.start_time));
  });

  if (error) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">My Timetable</h2>
          <p className="text-sm text-muted-foreground">Weekly class schedule</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DAYS.slice(0, 6).map((day) => (
            <div key={day} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const hasSlots = slots.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">My Timetable</h2>
        <p className="text-sm text-muted-foreground">Weekly class schedule</p>
      </div>

      {!hasSlots ? (
        <EmptyState
          title="No timetable available"
          description="Your class schedule hasn't been published yet."
          icon={<CalendarDays className="h-6 w-6" />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {DAYS.filter((day) => slotsByDay[day].length > 0).map((day) => (
            <Card key={day} className="shadow-sm">
              <CardContent className="p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  {dayLabels[day]}
                </h3>
                <div className="space-y-2">
                  {slotsByDay[day].map((slot, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg border p-3 ${getSubjectColor(slot.subject_name)}`}
                    >
                      <p className="text-sm font-semibold">{slot.subject_name}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs opacity-80">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {slot.start_time} – {slot.end_time}
                        </span>
                        {slot.room && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {slot.room}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
