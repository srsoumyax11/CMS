import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timetableApi } from '@/api/timetableApi';
import { academicApi } from '@/api/academicApi';
import { adminApi } from '@/api/adminApi';
import { QUERY_KEYS } from '@/lib/constants';
import { extractItems } from '@/lib/utils';
import { getErrorMessage } from '@/lib/error-utils';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn, type TableFilterDef } from '@/components/shared/pro-table';
import { WeeklyTimetableGrid } from '@/components/timetable/WeeklyTimetableGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Plus, Calendar, Clock, MapPin, User, BookOpen, Trash2, Edit2, AlertCircle, Sparkles, Filter } from 'lucide-react';
import { toast } from 'sonner';
import type {
  TimetableSlot,
  TimetableException,
  DayOfWeek,
  ExceptionType,
  TimetableSlotCreatePayload,
  TimetableSlotUpdatePayload,
  AcademicTerm,
  ClassGroup,
  Subject,
  FacultyItemResponse,
} from '@/types/api';

const DAY_NAMES: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

export function TimetableManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'slots' | 'grid' | 'exceptions'>('slots');

  // Filters
  const [selectedTermId, setSelectedTermId] = useState<string>('all');
  const [selectedClassGroupId, setSelectedClassGroupId] = useState<string>('all');

  // Modal Dialog states
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [clashError, setClashError] = useState<string | null>(null);

  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [targetSlotForException, setTargetSlotForException] = useState<TimetableSlot | null>(null);

  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);
  const [deletingExceptionId, setDeletingExceptionId] = useState<string | null>(null);

  // Form states for Slot Modal
  const [formTermId, setFormTermId] = useState('');
  const [formClassGroupId, setFormClassGroupId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formFacultyUserId, setFormFacultyUserId] = useState('');
  const [formDayOfWeek, setFormDayOfWeek] = useState<DayOfWeek>(1);
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');

  // Form states for Exception Modal
  const [formExcDate, setFormExcDate] = useState(new Date().toISOString().split('T')[0]);
  const [formExcType, setFormExcType] = useState<ExceptionType>('CANCELLED');
  const [formSubstituteFacultyId, setFormSubstituteFacultyId] = useState('');
  const [formExcNote, setFormExcNote] = useState('');

  // 1. Fetch Metadata (Terms, Cohorts, Subjects, Faculty)
  const { data: termsRes } = useQuery({
    queryKey: [QUERY_KEYS.TERMS],
    queryFn: () => academicApi.listTerms(),
  });
  const terms: AcademicTerm[] = extractItems(termsRes);

  const { data: classGroupsRes } = useQuery({
    queryKey: [QUERY_KEYS.CLASS_GROUPS],
    queryFn: () => academicApi.listClassGroups(),
  });
  const classGroups: ClassGroup[] = extractItems(classGroupsRes);

  const { data: subjectsRes } = useQuery({
    queryKey: [QUERY_KEYS.SUBJECTS],
    queryFn: () => academicApi.listSubjects(),
  });
  const subjects: Subject[] = extractItems(subjectsRes);

  const { data: facultyRes } = useQuery({
    queryKey: [QUERY_KEYS.FACULTY],
    queryFn: () => adminApi.listFaculty(),
  });
  const facultyList: FacultyItemResponse[] = extractItems(facultyRes);

  // 2. Fetch Timetable Slots
  const { data: slotsRes, isLoading: slotsLoading, refetch: refetchSlots } = useQuery({
    queryKey: [QUERY_KEYS.TIMETABLE, 'slots', selectedTermId, selectedClassGroupId],
    queryFn: () =>
      timetableApi.listSlots({
        term_id: selectedTermId !== 'all' ? selectedTermId : undefined,
        class_group_id: selectedClassGroupId !== 'all' ? selectedClassGroupId : undefined,
        limit: 200,
      }),
  });
  const rawSlots: TimetableSlot[] = extractItems(slotsRes);

  // Enrich slots with entity names for table display
  const enrichedSlots = useMemo(() => {
    const termMap = new Map(terms.map((t) => [t.id, t.name]));
    const cgMap = new Map(classGroups.map((c) => [c.id, `${c.course_name || 'Degree'} - ${c.department_name || ''} Y${c.year} Sec ${c.section}`]));
    const subMap = new Map(subjects.map((s) => [s.id, `${s.code} - ${s.name}`]));
    const facMap = new Map(facultyList.map((f) => [f.user_id, f.name]));

    return rawSlots.map((s) => ({
      ...s,
      term_name: termMap.get(s.term_id) || 'Term',
      class_group_name: cgMap.get(s.class_group_id) || 'Class Cohort',
      subject_name: subMap.get(s.subject_id) || 'Subject',
      faculty_name: facMap.get(s.faculty_user_id) || 'Faculty Teacher',
    }));
  }, [rawSlots, terms, classGroups, subjects, facultyList]);

  // 3. Fetch Timetable Exceptions
  const { data: exceptionsRes, isLoading: exceptionsLoading, refetch: refetchExceptions } = useQuery({
    queryKey: [QUERY_KEYS.TIMETABLE, 'exceptions'],
    queryFn: () => timetableApi.listExceptions({ limit: 100 }),
  });
  const exceptions: TimetableException[] = extractItems(exceptionsRes);

  // Mutations
  const createSlotMutation = useMutation({
    mutationFn: (payload: TimetableSlotCreatePayload) => timetableApi.createSlot(payload),
    onSuccess: () => {
      toast.success('Timetable slot created successfully');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TIMETABLE] });
      setIsSlotModalOpen(false);
      resetSlotForm();
    },
    onError: (err: any) => {
      const msg = getErrorMessage(err, 'Failed to create timetable slot');
      setClashError(msg);
    },
  });

  const updateSlotMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TimetableSlotUpdatePayload }) =>
      timetableApi.updateSlot(id, payload),
    onSuccess: () => {
      toast.success('Timetable slot updated');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TIMETABLE] });
      setIsSlotModalOpen(false);
      resetSlotForm();
    },
    onError: (err: any) => {
      const msg = getErrorMessage(err, 'Failed to update timetable slot');
      setClashError(msg);
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (id: string) => timetableApi.deleteSlot(id),
    onSuccess: () => {
      toast.success('Timetable slot deleted');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TIMETABLE] });
      setDeletingSlotId(null);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to delete slot')),
  });

  const createExceptionMutation = useMutation({
    mutationFn: (payload: any) => timetableApi.createException(payload),
    onSuccess: () => {
      toast.success('Timetable exception registered');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TIMETABLE] });
      setIsExceptionModalOpen(false);
      resetExceptionForm();
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to register exception')),
  });

  const deleteExceptionMutation = useMutation({
    mutationFn: (id: string) => timetableApi.deleteException(id),
    onSuccess: () => {
      toast.success('Timetable exception deleted');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TIMETABLE] });
      setDeletingExceptionId(null);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to delete exception')),
  });

  const resetSlotForm = () => {
    setEditingSlot(null);
    setClashError(null);
    setFormTermId(terms[0]?.id || '');
    setFormClassGroupId(classGroups[0]?.id || '');
    setFormSubjectId(subjects[0]?.id || '');
    setFormFacultyUserId(facultyList[0]?.user_id || '');
    setFormDayOfWeek(1);
    setFormStartTime('09:00');
    setFormEndTime('10:00');
  };

  const resetExceptionForm = () => {
    setTargetSlotForException(null);
    setFormExcDate(new Date().toISOString().split('T')[0]);
    setFormExcType('CANCELLED');
    setFormSubstituteFacultyId('');
    setFormExcNote('');
  };

  const handleOpenCreateSlot = () => {
    resetSlotForm();
    setIsSlotModalOpen(true);
  };

  const handleOpenEditSlot = (slot: TimetableSlot) => {
    setEditingSlot(slot);
    setClashError(null);
    setFormTermId(slot.term_id);
    setFormClassGroupId(slot.class_group_id);
    setFormSubjectId(slot.subject_id);
    setFormFacultyUserId(slot.faculty_user_id);
    setFormDayOfWeek(slot.day_of_week);
    setFormStartTime(slot.start_time.substring(0, 5));
    setFormEndTime(slot.end_time.substring(0, 5));
    setIsSlotModalOpen(true);
  };

  const handleSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClashError(null);

    const payload: TimetableSlotCreatePayload = {
      term_id: formTermId,
      class_group_id: formClassGroupId,
      subject_id: formSubjectId,
      faculty_user_id: formFacultyUserId,
      day_of_week: formDayOfWeek,
      start_time: formStartTime.length === 5 ? `${formStartTime}:00` : formStartTime,
      end_time: formEndTime.length === 5 ? `${formEndTime}:00` : formEndTime,
      status: true,
    };

    if (editingSlot) {
      updateSlotMutation.mutate({ id: editingSlot.id, payload });
    } else {
      createSlotMutation.mutate(payload);
    }
  };

  const handleExceptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSlotForException) return;

    createExceptionMutation.mutate({
      slot_id: targetSlotForException.id,
      date: formExcDate,
      type: formExcType,
      substitute_faculty_id: formExcType === 'SUBSTITUTE' ? formSubstituteFacultyId : null,
      note: formExcNote || null,
    });
  };

  // ProTable Columns Definition for Slots
  const slotColumns: ProColumn<any>[] = [
    {
      id: 'day_of_week',
      header: 'Day',
      accessorKey: 'day_of_week',
      cell: (val) => (
        <span className="font-semibold text-foreground font-mono text-xs uppercase">
          {DAY_NAMES[Number(val)] || `Day ${val}`}
        </span>
      ),
      sortable: true,
      width: '100px',
    },
    {
      id: 'time',
      header: 'Time Slot',
      cell: (_, row) => (
        <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3 text-primary" />
          {row.start_time?.substring(0, 5)} - {row.end_time?.substring(0, 5)}
        </span>
      ),
      width: '140px',
    },
    {
      id: 'subject',
      header: 'Subject & Code',
      accessorKey: 'subject_name',
      cell: (val) => (
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-medium text-foreground text-xs">{val}</span>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'faculty',
      header: 'Assigned Faculty',
      accessorKey: 'faculty_name',
      cell: (val) => (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <User className="h-3 w-3 text-muted-foreground" /> {val}
        </span>
      ),
    },
    {
      id: 'class_group',
      header: 'Class Cohort',
      accessorKey: 'class_group_name',
      cell: (val) => (
        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded border border-border">
          {val}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
            title="Edit Slot"
            onClick={() => handleOpenEditSlot(row)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-amber-600 hover:bg-amber-500/10"
            title="Add Exception (Cancel/Substitute)"
            onClick={() => {
              setTargetSlotForException(row);
              setIsExceptionModalOpen(true);
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
            title="Delete Slot"
            onClick={() => setDeletingSlotId(row.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={handleOpenCreateSlot} className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" /> Add Timetable Slot
          </Button>
        }
      />

      {/* Cohort & Term Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/20 border border-border/60 rounded-xl">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2">
          <Filter className="h-3.5 w-3.5 text-primary" /> Filter Schedule
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium">Academic Term:</Label>
          <Select value={selectedTermId} onValueChange={setSelectedTermId}>
            <SelectTrigger className="h-8 text-xs w-[200px]">
              <SelectValue placeholder="All Terms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Academic Terms</SelectItem>
              {terms.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium">Class Group (Cohort):</Label>
          <Select value={selectedClassGroupId} onValueChange={setSelectedClassGroupId}>
            <SelectTrigger className="h-8 text-xs w-[260px]">
              <SelectValue placeholder="All Class Cohorts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Class Cohorts</SelectItem>
              {classGroups.map((cg) => (
                <SelectItem key={cg.id} value={cg.id}>
                  {cg.course_name || 'Degree'} - {cg.department_name || ''} Year {cg.year} (Sec {cg.section})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tab Navigation Views */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="slots" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> Table List View
          </TabsTrigger>
          <TabsTrigger value="grid" className="gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5" /> Visual 7-Day Grid
          </TabsTrigger>
        </TabsList>

        <TabsContent value="slots" className="mt-4">
          <ProTable
            data={enrichedSlots}
            columns={slotColumns}
            isLoading={slotsLoading}
            onRetry={refetchSlots}
            rowKey={(r) => r.id}
            searchPlaceholder="Search slots by subject or faculty..."
            emptyTitle="No Timetable Slots Found"
            emptyDescription="There are no class slots configured for the selected filters."
            exportFileName="timetable-slots"
          />
        </TabsContent>

        <TabsContent value="grid" className="mt-4">
          <WeeklyTimetableGrid slots={rawSlots} exceptions={exceptions} isLoading={slotsLoading} />
        </TabsContent>
      </Tabs>

      {/* Slot Create / Edit Modal with Clash Detection Callout */}
      <Dialog open={isSlotModalOpen} onOpenChange={setIsSlotModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {editingSlot ? 'Edit Timetable Slot' : 'Create Recurring Timetable Slot'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define the day, time, faculty teacher, and cohort. The system automatically enforces clash detection.
            </DialogDescription>
          </DialogHeader>

          {clashError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Timetable Conflict Detected:</strong>
                <span>{clashError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSlotSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Academic Term *</Label>
                <Select value={formTermId} onValueChange={setFormTermId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Term" /></SelectTrigger>
                  <SelectContent>
                    {terms.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Class Group (Cohort) *</Label>
                <Select value={formClassGroupId} onValueChange={setFormClassGroupId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Cohort" /></SelectTrigger>
                  <SelectContent>
                    {classGroups.map((cg) => (
                      <SelectItem key={cg.id} value={cg.id}>
                        {cg.course_name || 'Cohort'} - Year {cg.year} (Sec {cg.section})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Subject *</Label>
                <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assigned Faculty *</Label>
                <Select value={formFacultyUserId} onValueChange={setFormFacultyUserId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Faculty" /></SelectTrigger>
                  <SelectContent>
                    {facultyList.map((f) => (
                      <SelectItem key={f.user_id} value={f.user_id}>{f.name} ({f.department_name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Day of Week *</Label>
                <Select value={String(formDayOfWeek)} onValueChange={(v) => setFormDayOfWeek(Number(v) as DayOfWeek)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DAY_NAMES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Time *</Label>
                <Input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} required className="h-9 text-xs" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">End Time *</Label>
                <Input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} required className="h-9 text-xs" />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsSlotModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createSlotMutation.isPending || updateSlotMutation.isPending}>
                {editingSlot ? 'Save Changes' : 'Create Slot'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Timetable Exception Modal */}
      <Dialog open={isExceptionModalOpen} onOpenChange={setIsExceptionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> Register Schedule Exception
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Register a single-day cancellation, substitute teacher, or extra class for this slot.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExceptionSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Date *</Label>
              <Input type="date" value={formExcDate} onChange={(e) => setFormExcDate(e.target.value)} required className="h-9 text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Exception Type *</Label>
              <Select value={formExcType} onValueChange={(v: ExceptionType) => setFormExcType(v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CANCELLED">Class Cancelled</SelectItem>
                  <SelectItem value="SUBSTITUTE">Substitute Faculty</SelectItem>
                  <SelectItem value="EXTRA">Extra Class</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formExcType === 'SUBSTITUTE' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Substitute Faculty Member *</Label>
                <Select value={formSubstituteFacultyId} onValueChange={setFormSubstituteFacultyId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Substitute Teacher" /></SelectTrigger>
                  <SelectContent>
                    {facultyList.map((f) => (
                      <SelectItem key={f.user_id} value={f.user_id}>{f.name} ({f.department_name})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes / Rationale</Label>
              <Input placeholder="e.g. Conference attendance / Medical leave" value={formExcNote} onChange={(e) => setFormExcNote(e.target.value)} className="h-9 text-xs" />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsExceptionModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createExceptionMutation.isPending}>
                Register Exception
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialogs */}
      <ConfirmDialog
        open={!!deletingSlotId}
        onOpenChange={() => setDeletingSlotId(null)}
        title="Delete Timetable Slot?"
        description="Are you sure you want to delete this recurring timetable slot? This will remove all associated schedule entries."
        confirmLabel="Delete Slot"
        variant="destructive"
        onConfirm={() => deletingSlotId && deleteSlotMutation.mutate(deletingSlotId)}
      />
    </div>
  );
}

export default TimetableManagement;
