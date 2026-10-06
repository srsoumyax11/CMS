import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { timetableApi, attendanceApi } from '@/api/timetableApi';
import { QUERY_KEYS } from '@/lib/constants';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Clock, AlertCircle, Calendar, Users, Send } from 'lucide-react';
import type { TimetableSlot, RosterStudent, AttendanceRosterItem } from '@/types/api';
import { toast } from 'sonner';

type StatusType = 'present' | 'absent' | 'late' | 'excused';

export function FacultyAttendance() {
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, StatusType>>({});

  // 1. Fetch faculty slots
  const { data: slotsData, isLoading: isSlotsLoading, error: slotsError, refetch: refetchSlots } = useQuery({
    queryKey: [QUERY_KEYS.MY_TIMETABLE],
    queryFn: () => timetableApi.getMine(),
  });

  const slots: TimetableSlot[] = (slotsData?.data?.data as TimetableSlot[]) ?? [];

  // 2. Fetch roster when slot is selected
  const { data: rosterData, isLoading: isRosterLoading, error: rosterError } = useQuery({
    queryKey: [QUERY_KEYS.ATTENDANCE_ROSTER, selectedSlotId],
    queryFn: () => attendanceApi.getRoster(selectedSlotId),
    enabled: Boolean(selectedSlotId),
  });

  const roster: RosterStudent[] = (rosterData?.data?.data as RosterStudent[]) ?? [];

  const handleSlotSelect = (slotId: string) => {
    setSelectedSlotId(slotId);
    setAttendanceRecords({});
  };

  // 3. Batch submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlotId) throw new Error('Select a timetable slot');
      const records: AttendanceRosterItem[] = roster.map((student) => ({
        student_id: student.student_id,
        status: attendanceRecords[student.student_id] || 'present',
      }));

      await attendanceApi.submitBatch({
        slot_id: selectedSlotId,
        date,
        records,
      });
    },
    onSuccess: () => {
      toast.success('Attendance batch submitted successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || err.message || 'Failed to submit attendance');
    },
  });

  const handleStatusChange = (studentId: string, status: StatusType) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const setAllStatus = (status: StatusType) => {
    const updated: Record<string, StatusType> = {};
    roster.forEach((student) => {
      updated[student.student_id] = status;
    });
    setAttendanceRecords(updated);
  };

  if (slotsError) return <ErrorState onRetry={() => refetchSlots()} />;

  const selectedSlot = slots.find((s) => s.id === selectedSlotId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Attendance Portal"
        description="Mark and review class attendance for your assigned timetable slots."
      />

      {/* Slot & Date Selection Header */}
      <Card className="shadow-sm">
        <CardContent className="p-6 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Select Timetable Slot
            </label>
            <Select value={selectedSlotId} onValueChange={handleSlotSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isSlotsLoading ? 'Loading classes...' : 'Choose a class slot'} />
              </SelectTrigger>
              <SelectContent>
                {slots.map((slot) => (
                  <SelectItem key={slot.id} value={slot.id}>
                    {slot.subject_name} ({slot.day_of_week.toUpperCase()} {slot.start_time} - {slot.end_time}) {slot.room ? `• ${slot.room}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-48 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Lecture Date
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Roster & Attendance Marking Section */}
      {!selectedSlotId ? (
        <EmptyState
          title="No Slot Selected"
          description="Please select a timetable slot from the dropdown above to mark attendance."
          icon={<Users className="h-6 w-6 text-muted-foreground" />}
        />
      ) : isRosterLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : rosterError ? (
        <ErrorState message="Failed to load class roster for this slot." />
      ) : roster.length === 0 ? (
        <EmptyState
          title="Empty Class Roster"
          description="No active students are currently enrolled in this class batch."
          icon={<Users className="h-6 w-6 text-muted-foreground" />}
        />
      ) : (
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="text-lg font-bold">{selectedSlot?.subject_name} Roster</CardTitle>
              <p className="text-xs text-muted-foreground">
                {roster.length} Student{roster.length !== 1 ? 's' : ''} Enrolled • Date: {date}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setAllStatus('present')}>
                All Present
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAllStatus('absent')}>
                All Absent
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 divide-y">
            {roster.map((student) => {
              const currentStatus = attendanceRecords[student.student_id] || 'present';

              return (
                <div key={student.student_id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{student.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{student.roll_number}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={currentStatus === 'present' ? 'default' : 'ghost'}
                      className={currentStatus === 'present' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                      onClick={() => handleStatusChange(student.student_id, 'present')}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Present
                    </Button>

                    <Button
                      size="sm"
                      variant={currentStatus === 'absent' ? 'destructive' : 'ghost'}
                      onClick={() => handleStatusChange(student.student_id, 'absent')}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Absent
                    </Button>

                    <Button
                      size="sm"
                      variant={currentStatus === 'late' ? 'secondary' : 'ghost'}
                      className={currentStatus === 'late' ? 'bg-amber-500 text-white hover:bg-amber-600' : ''}
                      onClick={() => handleStatusChange(student.student_id, 'late')}
                    >
                      <Clock className="h-3.5 w-3.5 mr-1" /> Late
                    </Button>

                    <Button
                      size="sm"
                      variant={currentStatus === 'excused' ? 'outline' : 'ghost'}
                      onClick={() => handleStatusChange(student.student_id, 'excused')}
                    >
                      <AlertCircle className="h-3.5 w-3.5 mr-1" /> Excused
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>

          <div className="p-4 border-t flex justify-end bg-muted/10">
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {submitMutation.isPending ? 'Submitting...' : 'Submit Attendance Batch'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
