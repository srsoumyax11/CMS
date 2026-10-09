import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
  Lock,
  Sparkles,
  Search,
  CheckSquare,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { timetableApi } from '@/api/timetableApi';
import { attendanceApi } from '@/api/attendanceApi';
import type { AttendanceStatus, AttendanceRosterStudent } from '@/types/api';

export function FacultyAttendanceMarking() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [rosterMap, setRosterMap] = useState<Record<string, AttendanceStatus>>({});

  // 1. Fetch Faculty's Schedule to populate slot dropdown
  const { data: scheduleData, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['my-schedule'],
    queryFn: async () => {
      const res = await timetableApi.getMySchedule();
      return res.data?.data?.slots || [];
    },
  });

  // Auto-select first slot if available
  useEffect(() => {
    if (scheduleData && scheduleData.length > 0 && !selectedSlotId) {
      setSelectedSlotId(scheduleData[0].id);
    }
  }, [scheduleData, selectedSlotId]);

  // 2. Fetch Roster for selected slot and date
  const {
    data: rosterData,
    isLoading: isLoadingRoster,
    refetch: refetchRoster,
  } = useQuery({
    queryKey: ['attendance-roster', selectedSlotId, selectedDate],
    queryFn: async () => {
      if (!selectedSlotId || !selectedDate) return null;
      const res = await attendanceApi.getRoster(selectedSlotId, selectedDate);
      return res.data;
    },
    enabled: !!selectedSlotId && !!selectedDate,
  });

  // Sync local roster map when rosterData loads
  useEffect(() => {
    if (rosterData?.students) {
      const initialMap: Record<string, AttendanceStatus> = {};
      rosterData.students.forEach((st) => {
        initialMap[st.student_user_id] = st.status || 'PRESENT';
      });
      setRosterMap(initialMap);
    }
  }, [rosterData]);

  // Mutations
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlotId || !selectedDate) return;
      // Open session first if not created
      let currentSessionId = rosterData?.session_id;
      if (!currentSessionId) {
        const openRes = await attendanceApi.openSession(selectedSlotId, selectedDate);
        currentSessionId = openRes.data?.id;
      }
      if (!currentSessionId) throw new Error('Could not initialize attendance session');

      const records = Object.entries(rosterMap).map(([student_user_id, status]) => ({
        student_user_id,
        status,
      }));

      await attendanceApi.submitAttendance(currentSessionId, records);
      return currentSessionId;
    },
    onSuccess: () => {
      toast.success('Attendance records saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance-roster'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to submit attendance');
    },
  });

  const lockMutation = useMutation({
    mutationFn: async () => {
      if (!rosterData?.session_id) throw new Error('No active session to lock');
      await attendanceApi.lockSession(rosterData.session_id);
    },
    onSuccess: () => {
      toast.success('Attendance session locked');
      queryClient.invalidateQueries({ queryKey: ['attendance-roster'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to lock session');
    },
  });

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (rosterData?.session_status === 'LOCKED') return;
    setRosterMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (rosterData?.session_status === 'LOCKED') return;
    if (!rosterData?.students) return;
    const newMap: Record<string, AttendanceStatus> = {};
    rosterData.students.forEach((st) => {
      newMap[st.student_user_id] = status;
    });
    setRosterMap(newMap);
    toast.info(`Marked all students as ${status}`);
  };

  const filteredStudents = rosterData?.students?.filter(
    (st) =>
      st.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (st.roll_number && st.roll_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isLocked = rosterData?.session_status === 'LOCKED';

  // Stats calculation
  const totalCount = rosterData?.students?.length || 0;
  const presentCount = Object.values(rosterMap).filter(
    (s) => s === 'PRESENT' || s === 'LATE' || s === 'EXCUSED'
  ).length;
  const absentCount = Object.values(rosterMap).filter((s) => s === 'ABSENT').length;
  const presentPct = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 p-6 rounded-2xl border border-indigo-500/20 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-indigo-400" />
            Class Attendance Marking
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Record, update, and lock student daily class roster attendance.
          </p>
        </div>

        {isLocked && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-semibold">
            <Lock className="w-4 h-4" />
            Session Locked
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 backdrop-blur-md">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Select Date</label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <CalendarDays className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Class Timetable Slot
          </label>
          <select
            value={selectedSlotId}
            onChange={(e) => setSelectedSlotId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          >
            {isLoadingSchedule ? (
              <option>Loading schedule...</option>
            ) : scheduleData?.length === 0 ? (
              <option value="">No timetable slots found</option>
            ) : (
              scheduleData?.map((slot: any) => (
                <option key={slot.id} value={slot.id}>
                  {slot.subject_name || 'Subject'} - {slot.class_group_name || 'Class'} ({slot.start_time} - {slot.end_time})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {rosterData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Enrolled Students</p>
              <p className="text-xl font-bold text-white">{totalCount}</p>
            </div>
          </div>

          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Present / Excused</p>
              <p className="text-xl font-bold text-emerald-400">{presentCount}</p>
            </div>
          </div>

          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-lg">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Absent</p>
              <p className="text-xl font-bold text-rose-400">{absentCount}</p>
            </div>
          </div>

          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Class Attendance %</p>
              <p className="text-xl font-bold text-indigo-300">{presentPct}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Roster & Quick Actions Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search student or roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {!isLocked && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMarkAll('PRESENT')}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition"
              >
                Mark All Present
              </button>
              <button
                onClick={() => handleMarkAll('ABSENT')}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium transition"
              >
                Mark All Absent
              </button>
            </div>
          )}
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Roll No</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoadingRoster ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-slate-500">
                    Loading student roster...
                  </td>
                </tr>
              ) : !filteredStudents || filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-slate-500">
                    No students found in this class roster.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const currentSt = rosterMap[st.student_user_id] || 'PRESENT';

                  return (
                    <tr key={st.student_user_id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {st.roll_number || 'N/A'}
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{st.student_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as AttendanceStatus[]).map(
                            (stKey) => {
                              const isActive = currentSt === stKey;

                              let activeBg = 'bg-indigo-600 text-white border-indigo-500';
                              if (stKey === 'PRESENT')
                                activeBg = 'bg-emerald-600 text-white border-emerald-500';
                              if (stKey === 'ABSENT')
                                activeBg = 'bg-rose-600 text-white border-rose-500';
                              if (stKey === 'LATE')
                                activeBg = 'bg-amber-600 text-white border-amber-500';
                              if (stKey === 'EXCUSED')
                                activeBg = 'bg-blue-600 text-white border-blue-500';

                              return (
                                <button
                                  key={stKey}
                                  disabled={isLocked}
                                  onClick={() =>
                                    handleStatusChange(st.student_user_id, stKey)
                                  }
                                  className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition ${
                                    isActive
                                      ? activeBg
                                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                                  } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  {stKey}
                                </button>
                              );
                            }
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Submit & Lock Actions */}
        {rosterData && !isLocked && (
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              Changes are saved when you submit attendance.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
              >
                {submitMutation.isPending ? 'Saving...' : 'Submit Attendance'}
              </button>
              {rosterData.session_id && (
                <button
                  onClick={() => lockMutation.mutate()}
                  disabled={lockMutation.isPending}
                  className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 text-xs font-semibold rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {lockMutation.isPending ? 'Locking...' : 'Lock Session'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
