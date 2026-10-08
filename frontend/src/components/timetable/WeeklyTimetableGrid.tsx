import React from 'react';
import type { TimetableSlot, TimetableException, DayOfWeek } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, User, BookOpen, AlertTriangle } from 'lucide-react';

interface WeeklyTimetableGridProps {
  slots: TimetableSlot[];
  exceptions?: TimetableException[];
  onSlotClick?: (slot: TimetableSlot) => void;
  isLoading?: boolean;
}

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: 1, label: 'Monday', short: 'Mon' },
  { key: 2, label: 'Tuesday', short: 'Tue' },
  { key: 3, label: 'Wednesday', short: 'Wed' },
  { key: 4, label: 'Thursday', short: 'Thu' },
  { key: 5, label: 'Friday', short: 'Fri' },
  { key: 6, label: 'Saturday', short: 'Sat' },
];

const TIME_SLOTS = [
  { start: '08:00', label: '8:00 AM' },
  { start: '09:00', label: '9:00 AM' },
  { start: '10:00', label: '10:00 AM' },
  { start: '11:00', label: '11:00 AM' },
  { start: '12:00', label: '12:00 PM' },
  { start: '13:00', label: '1:00 PM' },
  { start: '14:00', label: '2:00 PM' },
  { start: '15:00', label: '3:00 PM' },
  { start: '16:00', label: '4:00 PM' },
  { start: '17:00', label: '5:00 PM' },
];

const SUBJECT_COLORS = [
  'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300',
  'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
  'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300',
  'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300',
  'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300',
  'bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-300',
];

export const WeeklyTimetableGrid: React.FC<WeeklyTimetableGridProps> = ({
  slots,
  exceptions = [],
  onSlotClick,
  isLoading = false,
}) => {
  const getSubjectColor = (subjectId: string) => {
    let hash = 0;
    for (let i = 0; i < subjectId.length; i++) {
      hash = subjectId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % SUBJECT_COLORS.length;
    return SUBJECT_COLORS[index];
  };

  const formatTimeStr = (t: string) => {
    if (!t) return '';
    const parts = t.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1] || '00';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <div className="w-full h-96 rounded-xl border border-border bg-card p-6 animate-pulse flex flex-col justify-between">
        <div className="h-8 bg-muted rounded-md w-full mb-4" />
        <div className="grid grid-cols-6 gap-3 h-full">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-full bg-muted/50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
      <div className="min-w-[800px]">
        {/* Header Days Row */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/40 font-mono text-xs font-bold divide-x divide-border">
          <div className="p-3 text-center text-muted-foreground flex items-center justify-center gap-1">
            <Clock className="h-3.5 w-3.5 text-primary" /> Time
          </div>
          {DAYS.map((day) => (
            <div key={day.key} className="p-3 text-center text-foreground capitalize">
              <span className="hidden sm:inline">{day.label}</span>
              <span className="sm:hidden">{day.short}</span>
            </div>
          ))}
        </div>

        {/* Schedule Grid Rows */}
        <div className="divide-y divide-border">
          {TIME_SLOTS.map((timeSlot) => {
            const slotHour = parseInt(timeSlot.start.split(':')[0], 10);

            return (
              <div key={timeSlot.start} className="grid grid-cols-7 divide-x divide-border min-h-[90px]">
                {/* Time Label Column */}
                <div className="p-2.5 text-[11px] font-mono font-semibold text-muted-foreground bg-muted/10 flex flex-col items-center justify-start border-r border-border">
                  <span>{timeSlot.label}</span>
                </div>

                {/* Day Columns for this time slot */}
                {DAYS.map((day) => {
                  // Filter slots matching day and start hour
                  const daySlots = slots.filter((s) => {
                    const startHour = parseInt(s.start_time.split(':')[0], 10);
                    return s.day_of_week === day.key && startHour === slotHour;
                  });

                  return (
                    <div key={day.key} className="p-1.5 bg-card/50 hover:bg-muted/20 transition-colors flex flex-col gap-1.5">
                      {daySlots.map((slot) => {
                        const colorClass = getSubjectColor(slot.subject_id);
                        const slotExceptions = exceptions.filter((e) => e.slot_id === slot.id);

                        return (
                          <div
                            key={slot.id}
                            onClick={() => onSlotClick && onSlotClick(slot)}
                            className={`p-2.5 rounded-lg border text-xs transition-all cursor-pointer hover:shadow-md flex flex-col justify-between space-y-1.5 ${colorClass}`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="flex items-center gap-1 font-bold tracking-tight">
                                <BookOpen className="h-3 w-3 shrink-0" />
                                <span>{slot.subject_code || 'SUBJ'}</span>
                              </div>
                              <span className="text-[10px] font-mono opacity-80 shrink-0">
                                {formatTimeStr(slot.start_time)} - {formatTimeStr(slot.end_time)}
                              </span>
                            </div>

                            <p className="font-semibold line-clamp-1 text-[11px]">
                              {slot.subject_name || 'Subject Class'}
                            </p>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] opacity-90 pt-0.5 border-t border-current/10">
                              {slot.faculty_name && (
                                <span className="flex items-center gap-0.5 truncate">
                                  <User className="h-3 w-3 shrink-0" /> {slot.faculty_name}
                                </span>
                              )}
                              {slot.room_name && (
                                <span className="flex items-center gap-0.5 truncate font-mono">
                                  <MapPin className="h-3 w-3 shrink-0" /> {slot.room_name}
                                </span>
                              )}
                              {slot.class_group_name && (
                                <span className="font-mono bg-background/50 px-1 rounded text-[9px] border border-current/20">
                                  {slot.class_group_name}
                                </span>
                              )}
                            </div>

                            {/* Exception Badges */}
                            {slotExceptions.map((exc) => (
                              <div key={exc.id} className="pt-1">
                                {exc.type === 'CANCELLED' && (
                                  <Badge variant="outline" className="bg-rose-500/20 text-rose-700 border-rose-500/40 text-[9px] font-mono gap-1 py-0">
                                    <AlertTriangle className="h-2.5 w-2.5" /> Cancelled
                                  </Badge>
                                )}
                                {exc.type === 'SUBSTITUTE' && (
                                  <Badge variant="outline" className="bg-amber-500/20 text-amber-700 border-amber-500/40 text-[9px] font-mono gap-1 py-0">
                                    Substitute
                                  </Badge>
                                )}
                                {exc.type === 'EXTRA' && (
                                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 border-emerald-500/40 text-[9px] font-mono gap-1 py-0">
                                    Extra Class
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
