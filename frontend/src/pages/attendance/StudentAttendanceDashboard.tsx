import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  BookOpen,
  Sparkles,
  ShieldAlert,
  CalendarDays,
} from 'lucide-react';
import { attendanceApi } from '@/api/attendanceApi';

export function StudentAttendanceDashboard() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['my-attendance-stats'],
    queryFn: async () => {
      const res = await attendanceApi.getMyStats();
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400 text-sm animate-pulse">
          Loading attendance statistics & shortage tracking...
        </div>
      </div>
    );
  }

  const overallPct = statsData?.overall_percentage ?? 100;
  const overallShortage = statsData?.overall_shortage ?? false;
  const totalConducted = statsData?.total_conducted ?? 0;
  const totalAttended = statsData?.total_attended ?? 0;
  const subjectStats = statsData?.subject_stats || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 p-6 rounded-2xl border border-indigo-500/20 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-400" />
            My Class Attendance & Shortage Report
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track your subject-wise lecture percentage and 75% minimum requirement warnings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-400">Overall Percentage</p>
            <p
              className={`text-2xl font-black ${
                overallShortage ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {overallPct}%
            </p>
          </div>
        </div>
      </div>

      {/* Prominent Shortage Alert Banner */}
      {overallShortage && (
        <div className="bg-gradient-to-r from-rose-950/80 to-rose-900/40 border border-rose-500/50 p-4 rounded-xl flex items-start gap-3 shadow-lg shadow-rose-950/40 animate-pulse">
          <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-rose-200">
              Low Attendance Shortage Warning (&lt; 75%)
            </h3>
            <p className="text-xs text-rose-300/80 mt-0.5">
              Your attendance in one or more subjects is below the mandatory 75% minimum threshold required for exam eligibility. Please contact your course faculty.
            </p>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Lectures</span>
            <CalendarDays className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{totalConducted}</p>
          <p className="text-xs text-slate-500 mt-1">Total conducted classes</p>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Attended Lectures</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{totalAttended}</p>
          <p className="text-xs text-slate-500 mt-1">Present, Late or Excused</p>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Shortage Subjects</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <p
            className={`text-2xl font-bold mt-2 ${
              subjectStats.filter((s) => s.is_shortage).length > 0
                ? 'text-rose-400'
                : 'text-emerald-400'
            }`}
          >
            {subjectStats.filter((s) => s.is_shortage).length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Subjects below 75% limit</p>
        </div>
      </div>

      {/* Subject-Wise Cards Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Subject Breakdown
        </h2>

        {subjectStats.length === 0 ? (
          <div className="bg-slate-900/40 p-8 rounded-xl border border-slate-800 text-center text-slate-500 text-sm">
            No attendance sessions recorded for your enrolled subjects yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjectStats.map((subj) => (
              <div
                key={subj.subject_id}
                className={`p-5 rounded-xl border backdrop-blur-xl transition ${
                  subj.is_shortage
                    ? 'bg-slate-900/80 border-rose-500/40 hover:border-rose-500/60'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{subj.subject_name}</h3>
                    {subj.subject_code && (
                      <span className="inline-block font-mono text-xs text-indigo-400 font-semibold mt-0.5">
                        {subj.subject_code}
                      </span>
                    )}
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                      subj.is_shortage
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {subj.percentage}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden mb-3 border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      subj.is_shortage
                        ? 'bg-gradient-to-r from-rose-600 to-red-500'
                        : 'bg-gradient-to-r from-emerald-500 to-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, subj.percentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Attended:{' '}
                    <strong className="text-slate-200">
                      {subj.total_attended} / {subj.total_conducted}
                    </strong>
                  </span>
                  {subj.is_shortage ? (
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      Shortage Warning
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Eligible
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
