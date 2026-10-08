import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicApi } from '@/api/academicApi';
import { adminApi } from '@/api/adminApi';
import { getErrorMessage } from '@/lib/error-utils';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn, type TableFilterDef } from '@/components/shared/pro-table';
import { EntityViewEditDialog, type EntityField } from '@/components/shared/entity-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Building2,
  BookOpen,
  Calendar,
  BookMarked,
  Users,
  Palmtree,
  Plus,
  CheckCircle2,
  User,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  Department,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
  Course,
  CourseCreateRequest,
  CourseUpdateRequest,
  AcademicTerm,
  AcademicTermCreateRequest,
  AcademicTermUpdateRequest,
  Subject,
  SubjectCreateRequest,
  SubjectUpdateRequest,
  ClassGroup,
  ClassGroupCreateRequest,
  ClassGroupUpdateRequest,
  Holiday,
  HolidayCreateRequest,
  HolidayUpdateRequest,
} from '@/types/api';

export function AcademicManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'departments';
  const queryClient = useQueryClient();

  // Helper to change tab
  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  // ── Global Shared Context Data ──
  const { data: deptRes } = useQuery({
    queryKey: ['academic_departments'],
    queryFn: () => academicApi.listDepartments(),
  });
  const departments = deptRes?.data?.data?.items || [];
  const deptMap = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => map.set(d.id, `${d.name} (${d.code})`));
    return map;
  }, [departments]);
  const deptCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((d) => map.set(d.id, d.code));
    return map;
  }, [departments]);

  const { data: courseRes } = useQuery({
    queryKey: ['academic_courses'],
    queryFn: () => academicApi.listCourses(),
  });
  const courses = courseRes?.data?.data?.items || [];
  const courseMap = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((c) => map.set(c.id, `${c.name} (${c.code})`));
    return map;
  }, [courses]);
  const courseCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((c) => map.set(c.id, c.code));
    return map;
  }, [courses]);

  const formatOrdinalYear = (yr: number) => {
    if (yr === 1) return '1st Year';
    if (yr === 2) return '2nd Year';
    if (yr === 3) return '3rd Year';
    return `${yr}th Year`;
  };

  const { data: facultyRes } = useQuery({
    queryKey: ['admin_faculty'],
    queryFn: () => adminApi.listFaculty(),
  });
  const facultyList = facultyRes?.data?.data || [];
  const facultyMap = useMemo(() => {
    const map = new Map<string, string>();
    facultyList.forEach((f) => map.set(f.id, f.name));
    return map;
  }, [facultyList]);

  // =========================================================================
  // 🏢 TAB 1: DEPARTMENTS
  // =========================================================================
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [deptDialogMode, setDeptDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);

  const createDeptMutation = useMutation({
    mutationFn: (data: DepartmentCreateRequest) => academicApi.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_departments'] });
      toast.success('Department created successfully');
      setIsDeptDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to create department')),
  });

  const updateDeptMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DepartmentUpdateRequest }) =>
      academicApi.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_departments'] });
      toast.success('Department updated successfully');
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to update department')),
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id: string) => academicApi.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_departments'] });
      toast.success('Department deleted successfully');
      setIsDeptDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to delete department')),
  });

  const deptColumns: ProColumn<Department>[] = [
    {
      id: 'name',
      header: 'Department Name',
      accessorKey: 'name',
      cell: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-foreground">{row.name}</span>
            <p className="text-xs text-muted-foreground uppercase">{row.code}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'code',
      header: 'Code',
      accessorKey: 'code',
      cell: (val) => <span className="font-mono text-xs font-semibold">{val}</span>,
      sortable: true,
      width: '120px',
    },
    {
      id: 'department_type',
      header: 'Type',
      accessorKey: 'department_type',
      cell: (val) => (
        <Badge variant={val === 'academic' ? 'default' : 'outline'} className="capitalize text-xs">
          {val}
        </Badge>
      ),
      sortable: true,
      width: '140px',
    },
    {
      id: 'hod',
      header: 'Head of Department',
      accessorFn: (row) => (row.hod_user_id ? facultyMap.get(row.hod_user_id) || 'Assigned' : 'None'),
      cell: (val, row) => (
        <div className="flex items-center gap-1.5 text-xs">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={row.hod_user_id ? 'text-foreground font-medium' : 'text-muted-foreground italic'}>
            {row.hod_user_id ? facultyMap.get(row.hod_user_id) || 'Assigned' : 'Not assigned'}
          </span>
        </div>
      ),
    },
    {
      id: 'is_active',
      header: 'Status',
      accessorKey: 'is_active',
      cell: (val) => (
        <Badge variant={val ? 'default' : 'secondary'} className="text-xs">
          {val ? 'Active' : 'Inactive'}
        </Badge>
      ),
      sortable: true,
      width: '120px',
      align: 'center',
    },
  ];

  const deptFields: EntityField<Department>[] = [
    { key: 'name', label: 'Department Name', type: 'text', required: true, placeholder: 'e.g. Computer Science & Engineering' },
    { key: 'code', label: 'Department Code', type: 'text', required: true, placeholder: 'e.g. CSE' },
    {
      key: 'department_type',
      label: 'Department Type',
      type: 'select',
      required: true,
      options: [
        { label: 'Academic', value: 'academic' },
        { label: 'Administrative', value: 'administrative' },
      ],
      defaultValue: 'academic',
    },
    {
      key: 'hod_user_id',
      label: 'Head of Department (HOD)',
      type: 'select',
      options: [
        { label: 'None / Unassigned', value: 'none' },
        ...facultyList.map((f) => ({ label: `${f.name} (${f.designation || 'Faculty'})`, value: f.id })),
      ],
      renderView: (val) => (
        <span className="text-sm font-medium">{val && val !== 'none' ? facultyMap.get(val) || 'Assigned' : 'Not assigned'}</span>
      ),
    },
    { key: 'is_active', label: 'Active Status', type: 'switch', defaultValue: true },
  ];

  // =========================================================================
  // 🎓 TAB 2: COURSES
  // =========================================================================
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseDialogMode, setCourseDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);

  const createCourseMutation = useMutation({
    mutationFn: (data: CourseCreateRequest) => academicApi.createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_courses'] });
      toast.success('Degree Course created successfully');
      setIsCourseDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to create course')),
  });

  const updateCourseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CourseUpdateRequest }) =>
      academicApi.updateCourse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_courses'] });
      toast.success('Course updated successfully');
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to update course')),
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (id: string) => academicApi.deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_courses'] });
      toast.success('Course deleted successfully');
      setIsCourseDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to delete course')),
  });

  const courseColumns: ProColumn<Course>[] = [
    {
      id: 'name',
      header: 'Course Name',
      accessorKey: 'name',
      cell: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground">{row.name}</span>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'code',
      header: 'Course Code',
      accessorKey: 'code',
      cell: (val) => <span className="font-mono text-xs font-semibold bg-muted px-2 py-1 rounded border border-border">{val}</span>,
      sortable: true,
      width: '150px',
    },
    {
      id: 'duration_years',
      header: 'Duration',
      accessorKey: 'duration_years',
      cell: (val) => <span className="text-xs font-medium">{val} {val === 1 ? 'Year' : 'Years'}</span>,
      sortable: true,
      width: '140px',
      align: 'center',
    },
    {
      id: 'is_active',
      header: 'Status',
      accessorKey: 'is_active',
      cell: (val) => (
        <Badge variant={val ? 'default' : 'secondary'} className="text-xs">
          {val ? 'Active' : 'Inactive'}
        </Badge>
      ),
      sortable: true,
      width: '120px',
      align: 'center',
    },
  ];

  const courseFields: EntityField<Course>[] = [
    { key: 'name', label: 'Course Name', type: 'text', required: true, placeholder: 'e.g. Bachelor of Technology' },
    { key: 'code', label: 'Course Code', type: 'text', required: true, placeholder: 'e.g. BTECH' },
    { key: 'duration_years', label: 'Duration (Years)', type: 'number', required: true, defaultValue: 4 },
    { key: 'is_active', label: 'Active Status', type: 'switch', defaultValue: true },
  ];

  // =========================================================================
  // 📅 TAB 3: ACADEMIC TERMS / SEMESTERS
  // =========================================================================
  const [selectedTerm, setSelectedTerm] = useState<AcademicTerm | null>(null);
  const [termDialogMode, setTermDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isTermDialogOpen, setIsTermDialogOpen] = useState(false);

  const { data: termsRes, isLoading: isTermsLoading, error: termsError, refetch: refetchTerms } = useQuery({
    queryKey: ['academic_terms'],
    queryFn: () => academicApi.listTerms(),
  });
  const terms = termsRes?.data?.data?.items || [];

  const createTermMutation = useMutation({
    mutationFn: (data: AcademicTermCreateRequest) => academicApi.createTerm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_terms'] });
      toast.success('Academic term created successfully');
      setIsTermDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to create term')),
  });

  const updateTermMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AcademicTermUpdateRequest }) =>
      academicApi.updateTerm(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_terms'] });
      toast.success('Academic term updated successfully');
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to update term')),
  });

  const deleteTermMutation = useMutation({
    mutationFn: (id: string) => academicApi.deleteTerm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_terms'] });
      toast.success('Academic term deleted successfully');
      setIsTermDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to delete term')),
  });

  const setCurrentTermMutation = useMutation({
    mutationFn: (id: string) => academicApi.setCurrentTerm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_terms'] });
      toast.success('Active current term updated successfully!');
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to set active term')),
  });

  const termColumns: ProColumn<AcademicTerm>[] = [
    {
      id: 'name',
      header: 'Term / Semester Title',
      accessorKey: 'name',
      cell: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-foreground">{row.name}</span>
            {row.is_current && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" /> Active Term
              </span>
            )}
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'start_date',
      header: 'Start Date',
      accessorKey: 'start_date',
      cell: (val) => <span className="font-mono text-xs">{val}</span>,
      sortable: true,
    },
    {
      id: 'end_date',
      header: 'End Date',
      accessorKey: 'end_date',
      cell: (val) => <span className="font-mono text-xs">{val}</span>,
      sortable: true,
    },
    {
      id: 'is_current',
      header: 'Active Status',
      accessorKey: 'is_current',
      cell: (val, row) => (
        <div className="flex items-center justify-center gap-2">
          {val ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">Active Current</Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentTermMutation.mutate(row.id);
              }}
              disabled={setCurrentTermMutation.isPending}
            >
              <Clock className="h-3 w-3" />
              Set Active
            </Button>
          )}
        </div>
      ),
      align: 'center',
    },
  ];

  const termFields: EntityField<AcademicTerm>[] = [
    { key: 'name', label: 'Term Title', type: 'text', required: true, placeholder: 'e.g. Fall Semester 2026' },
    { key: 'start_date', label: 'Start Date', type: 'date', required: true },
    { key: 'end_date', label: 'End Date', type: 'date', required: true },
    { key: 'is_current', label: 'Set as Active Current Term', type: 'switch', defaultValue: false },
  ];

  // =========================================================================
  // 📚 TAB 4: SUBJECT CATALOG
  // =========================================================================
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [subDialogMode, setSubDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);

  const { data: subRes, isLoading: isSubLoading, error: subError, refetch: refetchSubs } = useQuery({
    queryKey: ['academic_subjects'],
    queryFn: () => academicApi.listSubjects(),
  });
  const subjects = subRes?.data?.data?.items || [];

  const createSubMutation = useMutation({
    mutationFn: (data: SubjectCreateRequest) => academicApi.createSubject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_subjects'] });
      toast.success('Subject created successfully');
      setIsSubDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to create subject')),
  });

  const updateSubMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubjectUpdateRequest }) =>
      academicApi.updateSubject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_subjects'] });
      toast.success('Subject updated successfully');
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to update subject')),
  });

  const deleteSubMutation = useMutation({
    mutationFn: (id: string) => academicApi.deleteSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_subjects'] });
      toast.success('Subject deleted successfully');
      setIsSubDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to delete subject')),
  });

  const subjectColumns: ProColumn<Subject>[] = [
    {
      id: 'code',
      header: 'Subject Code',
      accessorKey: 'code',
      cell: (val) => <span className="font-mono text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded border border-primary/20">{val}</span>,
      sortable: true,
      width: '140px',
    },
    {
      id: 'name',
      header: 'Subject Title',
      accessorKey: 'name',
      cell: (val, row) => (
        <div className="flex items-center gap-2">
          <BookMarked className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-foreground">{row.name}</span>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'department',
      header: 'Department',
      accessorFn: (row) => deptMap.get(row.department_id) || 'Unknown',
      cell: (val, row) => <span className="text-xs text-muted-foreground">{deptMap.get(row.department_id) || 'N/A'}</span>,
      sortable: true,
    },
    {
      id: 'credits',
      header: 'Credits',
      accessorKey: 'credits',
      cell: (val) => <Badge variant="outline" className="text-xs font-mono">{val} Credits</Badge>,
      sortable: true,
      align: 'center',
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: (val) => (
        <Badge variant={val ? 'default' : 'secondary'} className="text-xs">
          {val ? 'Active' : 'Inactive'}
        </Badge>
      ),
      sortable: true,
      align: 'center',
    },
  ];

  const subjectFields: EntityField<Subject>[] = [
    { key: 'code', label: 'Subject Code', type: 'text', required: true, placeholder: 'e.g. CS101' },
    { key: 'name', label: 'Subject Title', type: 'text', required: true, placeholder: 'e.g. Data Structures & Algorithms' },
    {
      key: 'department_id',
      label: 'Offering Department',
      type: 'select',
      required: true,
      options: departments.map((d) => ({ label: `${d.name} (${d.code})`, value: d.id })),
      renderView: (val) => <span className="text-sm font-medium">{deptMap.get(val) || val}</span>,
    },
    { key: 'credits', label: 'Credit Hours', type: 'number', required: true, defaultValue: 3 },
    { key: 'status', label: 'Active Status', type: 'switch', defaultValue: true },
  ];

  // =========================================================================
  // 👥 TAB 5: CLASS GROUP COHORTS
  // =========================================================================
  const [selectedCg, setSelectedCg] = useState<ClassGroup | null>(null);
  const [cgDialogMode, setCgDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isCgDialogOpen, setIsCgDialogOpen] = useState(false);

  const { data: cgRes, isLoading: isCgLoading, error: cgError, refetch: refetchCgs } = useQuery({
    queryKey: ['academic_class_groups'],
    queryFn: () => academicApi.listClassGroups(),
  });
  const classGroups = cgRes?.data?.data?.items || [];

  const createCgMutation = useMutation({
    mutationFn: (data: ClassGroupCreateRequest) => academicApi.createClassGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_class_groups'] });
      toast.success('Class group cohort created successfully');
      setIsCgDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to create class group')),
  });

  const updateCgMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClassGroupUpdateRequest }) =>
      academicApi.updateClassGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_class_groups'] });
      toast.success('Class group cohort updated successfully');
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to update class group')),
  });

  const deleteCgMutation = useMutation({
    mutationFn: (id: string) => academicApi.deleteClassGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_class_groups'] });
      toast.success('Class group cohort deleted successfully');
      setIsCgDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to delete class group')),
  });

  const cgColumns: ProColumn<ClassGroup>[] = [
    {
      id: 'cohort',
      header: 'Cohort Identity',
      accessorFn: (row) => {
        const cCode = courseCodeMap.get(row.course_id) || 'Course';
        const dCode = deptCodeMap.get(row.department_id) || '';
        const yr = formatOrdinalYear(row.year);
        return `${cCode} ${dCode} ${yr} Section ${row.section}`;
      },
      cell: (val, row) => {
        const cCode = courseCodeMap.get(row.course_id) || '';
        const dCode = deptCodeMap.get(row.department_id) || '';
        const cName = courseMap.get(row.course_id) || 'Course';
        const dName = deptMap.get(row.department_id) || 'Department';
        const yr = formatOrdinalYear(row.year);
        const headline = `${cCode} ${dCode} ${yr} Section ${row.section}`.trim();

        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-foreground tracking-tight">
                {headline}
              </span>
              <p className="text-xs text-muted-foreground">
                {cName} • {dName}
              </p>
            </div>
          </div>
        );
      },
      sortable: true,
    },
    {
      id: 'year',
      header: 'Year',
      accessorKey: 'year',
      cell: (val) => <Badge variant="outline" className="text-xs font-semibold">{formatOrdinalYear(val)}</Badge>,
      sortable: true,
      align: 'center',
      width: '120px',
    },
    {
      id: 'section',
      header: 'Section',
      accessorKey: 'section',
      cell: (val) => (
        <span className="font-mono text-xs font-bold uppercase bg-muted px-2.5 py-1 rounded border border-border">
          Sec {val}
        </span>
      ),
      sortable: true,
      align: 'center',
      width: '110px',
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: (val) => (
        <Badge variant={val ? 'default' : 'secondary'} className="text-xs">
          {val ? 'Active' : 'Inactive'}
        </Badge>
      ),
      sortable: true,
      align: 'center',
      width: '110px',
    },
  ];

  const cgFields: EntityField<ClassGroup>[] = [
    {
      key: 'course_id',
      label: 'Degree Course',
      type: 'select',
      required: true,
      options: courses.map((c) => ({ label: `${c.name} (${c.code})`, value: c.id })),
      renderView: (val) => <span className="text-sm font-medium">{courseMap.get(val) || val}</span>,
    },
    {
      key: 'department_id',
      label: 'Department',
      type: 'select',
      required: true,
      options: departments.map((d) => ({ label: `${d.name} (${d.code})`, value: d.id })),
      renderView: (val) => <span className="text-sm font-medium">{deptMap.get(val) || val}</span>,
    },
    { key: 'year', label: 'Academic Year (1-6)', type: 'number', required: true, defaultValue: 1 },
    { key: 'section', label: 'Section (e.g. A, B, C)', type: 'text', required: true, placeholder: 'A' },
    { key: 'status', label: 'Active Status', type: 'switch', defaultValue: true },
  ];

  // =========================================================================
  // 🎉 TAB 6: HOLIDAY CALENDAR
  // =========================================================================
  const [selectedHol, setSelectedHol] = useState<Holiday | null>(null);
  const [holDialogMode, setHolDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isHolDialogOpen, setIsHolDialogOpen] = useState(false);

  const { data: holRes, isLoading: isHolLoading, error: holError, refetch: refetchHols } = useQuery({
    queryKey: ['academic_holidays'],
    queryFn: () => academicApi.listHolidays(),
  });
  const holidays = holRes?.data?.data?.items || [];

  const createHolMutation = useMutation({
    mutationFn: (data: HolidayCreateRequest) => academicApi.createHoliday(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_holidays'] });
      toast.success('Holiday registered successfully');
      setIsHolDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to register holiday')),
  });

  const updateHolMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: HolidayUpdateRequest }) =>
      academicApi.updateHoliday(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_holidays'] });
      toast.success('Holiday updated successfully');
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to update holiday')),
  });

  const deleteHolMutation = useMutation({
    mutationFn: (id: string) => academicApi.deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_holidays'] });
      toast.success('Holiday deleted successfully');
      setIsHolDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to delete holiday')),
  });

  const holidayColumns: ProColumn<Holiday>[] = [
    {
      id: 'date',
      header: 'Holiday Date',
      accessorKey: 'date',
      cell: (val) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-amber-500" />
          <span className="font-mono text-xs font-semibold">{val}</span>
        </div>
      ),
      sortable: true,
      width: '160px',
    },
    {
      id: 'name',
      header: 'Occasion / Holiday Name',
      accessorKey: 'name',
      cell: (val, row) => (
        <span className="font-semibold text-foreground">{row.name}</span>
      ),
      sortable: true,
    },
    {
      id: 'applies_to',
      header: 'Applicable Scope',
      accessorFn: (row) => (row.applies_to ? deptMap.get(row.applies_to) || 'Department Specific' : 'Campus Wide'),
      cell: (val, row) => (
        <Badge variant={row.applies_to ? 'outline' : 'default'} className="text-xs">
          {row.applies_to ? deptMap.get(row.applies_to) || 'Department' : 'Entire Campus'}
        </Badge>
      ),
      sortable: true,
    },
  ];

  const holidayFields: EntityField<Holiday>[] = [
    { key: 'name', label: 'Holiday Title / Occasion', type: 'text', required: true, placeholder: 'e.g. Independence Day' },
    { key: 'date', label: 'Date', type: 'date', required: true },
    {
      key: 'applies_to',
      label: 'Applicable Scope',
      type: 'select',
      options: [
        { label: 'Entire Campus (All Departments)', value: 'none' },
        ...departments.map((d) => ({ label: `Only ${d.name} (${d.code})`, value: d.id })),
      ],
      renderView: (val) => (
        <span className="text-sm font-medium">{val && val !== 'none' ? deptMap.get(val) || 'Department' : 'Entire Campus'}</span>
      ),
    },
  ];

  // Handlers for Save operations
  const handleSaveDept = async (formData: Record<string, any>, item: Department | null) => {
    const payload = {
      name: formData.name,
      code: String(formData.code || '').toUpperCase().trim(),
      department_type: formData.department_type,
      is_active: Boolean(formData.is_active),
      hod_user_id: formData.hod_user_id && formData.hod_user_id !== 'none' ? formData.hod_user_id : null,
    };
    if (item) await updateDeptMutation.mutateAsync({ id: item.id, data: payload });
    else await createDeptMutation.mutateAsync(payload);
  };

  const handleSaveCourse = async (formData: Record<string, any>, item: Course | null) => {
    const payload = {
      name: formData.name,
      code: String(formData.code || '').toUpperCase().trim(),
      duration_years: Number(formData.duration_years),
      is_active: Boolean(formData.is_active),
    };
    if (item) await updateCourseMutation.mutateAsync({ id: item.id, data: payload });
    else await createCourseMutation.mutateAsync(payload);
  };

  const handleSaveTerm = async (formData: Record<string, any>, item: AcademicTerm | null) => {
    const payload = {
      name: formData.name,
      start_date: formData.start_date,
      end_date: formData.end_date,
      is_current: Boolean(formData.is_current),
    };
    if (item) await updateTermMutation.mutateAsync({ id: item.id, data: payload });
    else await createTermMutation.mutateAsync(payload);
  };

  const handleSaveSubject = async (formData: Record<string, any>, item: Subject | null) => {
    const payload = {
      code: String(formData.code || '').toUpperCase().trim(),
      name: formData.name,
      department_id: formData.department_id,
      credits: Number(formData.credits),
      status: Boolean(formData.status),
    };
    if (item) await updateSubMutation.mutateAsync({ id: item.id, data: payload });
    else await createSubMutation.mutateAsync(payload);
  };

  const handleSaveCg = async (formData: Record<string, any>, item: ClassGroup | null) => {
    const payload = {
      course_id: formData.course_id,
      department_id: formData.department_id,
      year: Number(formData.year),
      section: String(formData.section || '').toUpperCase().trim(),
      status: Boolean(formData.status),
    };
    if (item) await updateCgMutation.mutateAsync({ id: item.id, data: payload });
    else await createCgMutation.mutateAsync(payload);
  };

  const handleSaveHoliday = async (formData: Record<string, any>, item: Holiday | null) => {
    const payload = {
      name: formData.name,
      date: formData.date,
      applies_to: formData.applies_to && formData.applies_to !== 'none' ? formData.applies_to : null,
    };
    if (item) await updateHolMutation.mutateAsync({ id: item.id, data: payload });
    else await createHolMutation.mutateAsync(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto border-b border-border bg-transparent p-0 rounded-none h-auto gap-2">
          <TabsTrigger
            value="departments"
            className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-muted/50 data-[state=active]:text-primary"
          >
            <Building2 className="h-4 w-4" />
            Departments ({departments.length})
          </TabsTrigger>
          <TabsTrigger
            value="courses"
            className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-muted/50 data-[state=active]:text-primary"
          >
            <BookOpen className="h-4 w-4" />
            Degree Courses ({courses.length})
          </TabsTrigger>
          <TabsTrigger
            value="terms"
            className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-muted/50 data-[state=active]:text-primary"
          >
            <Calendar className="h-4 w-4" />
            Terms / Semesters ({terms.length})
          </TabsTrigger>
          <TabsTrigger
            value="subjects"
            className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-muted/50 data-[state=active]:text-primary"
          >
            <BookMarked className="h-4 w-4" />
            Subjects ({subjects.length})
          </TabsTrigger>
          <TabsTrigger
            value="class-groups"
            className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-muted/50 data-[state=active]:text-primary"
          >
            <Users className="h-4 w-4" />
            Class Groups ({classGroups.length})
          </TabsTrigger>
          <TabsTrigger
            value="holidays"
            className="flex items-center gap-2 rounded-t-lg border-b-2 border-transparent px-4 py-3 text-sm font-medium data-[state=active]:border-primary data-[state=active]:bg-muted/50 data-[state=active]:text-primary"
          >
            <Palmtree className="h-4 w-4" />
            Holidays ({holidays.length})
          </TabsTrigger>
        </TabsList>

        {/* 🏢 Departments Tab Content */}
        <TabsContent value="departments" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setSelectedDept(null);
                setDeptDialogMode('create');
                setIsDeptDialogOpen(true);
              }}
              className="gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Add Department
            </Button>
          </div>
          <ProTable
            columns={deptColumns}
            data={departments}
            isLoading={!deptRes}
            onRowClick={(dept) => {
              setSelectedDept(dept);
              setDeptDialogMode('view');
              setIsDeptDialogOpen(true);
            }}
            rowKey={(row) => row.id}
            searchPlaceholder="Search departments by name or code..."
            exportFileName="departments-list"
            emptyTitle="No departments found"
            emptyDescription="Create your first department to organize degree courses and faculty members."
          />
        </TabsContent>

        {/* 🎓 Courses Tab Content */}
        <TabsContent value="courses" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setSelectedCourse(null);
                setCourseDialogMode('create');
                setIsCourseDialogOpen(true);
              }}
              className="gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Add Degree Course
            </Button>
          </div>
          <ProTable
            columns={courseColumns}
            data={courses}
            isLoading={!courseRes}
            onRowClick={(c) => {
              setSelectedCourse(c);
              setCourseDialogMode('view');
              setIsCourseDialogOpen(true);
            }}
            rowKey={(row) => row.id}
            searchPlaceholder="Search degree courses by name or code..."
            exportFileName="courses-list"
            emptyTitle="No degree courses found"
            emptyDescription="Create your first degree course program."
          />
        </TabsContent>

        {/* 📅 Terms Tab Content */}
        <TabsContent value="terms" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setSelectedTerm(null);
                setTermDialogMode('create');
                setIsTermDialogOpen(true);
              }}
              className="gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Add Academic Term
            </Button>
          </div>
          <ProTable
            columns={termColumns}
            data={terms}
            isLoading={isTermsLoading}
            error={termsError}
            onRetry={refetchTerms}
            onRowClick={(term) => {
              setSelectedTerm(term);
              setTermDialogMode('view');
              setIsTermDialogOpen(true);
            }}
            rowKey={(row) => row.id}
            searchPlaceholder="Search academic terms..."
            exportFileName="academic-terms-list"
            emptyTitle="No academic terms found"
            emptyDescription="Define your academic terms or semester schedules."
          />
        </TabsContent>

        {/* 📚 Subjects Tab Content */}
        <TabsContent value="subjects" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setSelectedSubject(null);
                setSubDialogMode('create');
                setIsSubDialogOpen(true);
              }}
              className="gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Add Subject
            </Button>
          </div>
          <ProTable
            columns={subjectColumns}
            data={subjects}
            isLoading={isSubLoading}
            error={subError}
            onRetry={refetchSubs}
            onRowClick={(sub) => {
              setSelectedSubject(sub);
              setSubDialogMode('view');
              setIsSubDialogOpen(true);
            }}
            rowKey={(row) => row.id}
            searchPlaceholder="Search subject catalog by title or code..."
            exportFileName="subjects-catalog"
            emptyTitle="No subjects found"
            emptyDescription="Add subjects to your academic catalog."
          />
        </TabsContent>

        {/* 👥 Class Groups Tab Content */}
        <TabsContent value="class-groups" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setSelectedCg(null);
                setCgDialogMode('create');
                setIsCgDialogOpen(true);
              }}
              className="gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Add Class Group Cohort
            </Button>
          </div>
          <ProTable
            columns={cgColumns}
            data={classGroups}
            isLoading={isCgLoading}
            error={cgError}
            onRetry={refetchCgs}
            onRowClick={(cg) => {
              setSelectedCg(cg);
              setCgDialogMode('view');
              setIsCgDialogOpen(true);
            }}
            rowKey={(row) => row.id}
            searchPlaceholder="Search class cohorts..."
            exportFileName="class-group-cohorts"
            emptyTitle="No class group cohorts found"
            emptyDescription="Create student cohort class groups for attendance and timetables."
          />
        </TabsContent>

        {/* 🎉 Holidays Tab Content */}
        <TabsContent value="holidays" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setSelectedHol(null);
                setHolDialogMode('create');
                setIsHolDialogOpen(true);
              }}
              className="gap-1.5 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Register Holiday
            </Button>
          </div>
          <ProTable
            columns={holidayColumns}
            data={holidays}
            isLoading={isHolLoading}
            error={holError}
            onRetry={refetchHols}
            onRowClick={(hol) => {
              setSelectedHol(hol);
              setHolDialogMode('view');
              setIsHolDialogOpen(true);
            }}
            rowKey={(row) => row.id}
            searchPlaceholder="Search holiday calendar..."
            exportFileName="holidays-calendar"
            emptyTitle="No holidays registered"
            emptyDescription="Register campus holidays to calculate attendance and timetable schedules."
          />
        </TabsContent>
      </Tabs>

      {/* 🏢 Department Modal */}
      <EntityViewEditDialog
        isOpen={isDeptDialogOpen}
        onClose={() => setIsDeptDialogOpen(false)}
        entityName="Department"
        data={selectedDept}
        fields={deptFields}
        initialMode={deptDialogMode}
        onSave={handleSaveDept}
        isSaving={createDeptMutation.isPending || updateDeptMutation.isPending}
        canDelete={true}
        onDelete={(item) => deleteDeptMutation.mutateAsync(item.id)}
        isDeleting={deleteDeptMutation.isPending}
      />

      {/* 🎓 Course Modal */}
      <EntityViewEditDialog
        isOpen={isCourseDialogOpen}
        onClose={() => setIsCourseDialogOpen(false)}
        entityName="Degree Course"
        data={selectedCourse}
        fields={courseFields}
        initialMode={courseDialogMode}
        onSave={handleSaveCourse}
        isSaving={createCourseMutation.isPending || updateCourseMutation.isPending}
        canDelete={true}
        onDelete={(item) => deleteCourseMutation.mutateAsync(item.id)}
        isDeleting={deleteCourseMutation.isPending}
      />

      {/* 📅 Term Modal */}
      <EntityViewEditDialog
        isOpen={isTermDialogOpen}
        onClose={() => setIsTermDialogOpen(false)}
        entityName="Academic Term"
        data={selectedTerm}
        fields={termFields}
        initialMode={termDialogMode}
        onSave={handleSaveTerm}
        isSaving={createTermMutation.isPending || updateTermMutation.isPending}
        canDelete={true}
        onDelete={(item) => deleteTermMutation.mutateAsync(item.id)}
        isDeleting={deleteTermMutation.isPending}
      />

      {/* 📚 Subject Modal */}
      <EntityViewEditDialog
        isOpen={isSubDialogOpen}
        onClose={() => setIsSubDialogOpen(false)}
        entityName="Subject"
        data={selectedSubject}
        fields={subjectFields}
        initialMode={subDialogMode}
        onSave={handleSaveSubject}
        isSaving={createSubMutation.isPending || updateSubMutation.isPending}
        canDelete={true}
        onDelete={(item) => deleteSubMutation.mutateAsync(item.id)}
        isDeleting={deleteSubMutation.isPending}
      />

      {/* 👥 Class Group Modal */}
      <EntityViewEditDialog
        isOpen={isCgDialogOpen}
        onClose={() => setIsCgDialogOpen(false)}
        entityName="Class Group Cohort"
        data={selectedCg}
        fields={cgFields}
        initialMode={cgDialogMode}
        onSave={handleSaveCg}
        isSaving={createCgMutation.isPending || updateCgMutation.isPending}
        canDelete={true}
        onDelete={(item) => deleteCgMutation.mutateAsync(item.id)}
        isDeleting={deleteCgMutation.isPending}
      />

      {/* 🎉 Holiday Modal */}
      <EntityViewEditDialog
        isOpen={isHolDialogOpen}
        onClose={() => setIsHolDialogOpen(false)}
        entityName="Holiday"
        data={selectedHol}
        fields={holidayFields}
        initialMode={holDialogMode}
        onSave={handleSaveHoliday}
        isSaving={createHolMutation.isPending || updateHolMutation.isPending}
        canDelete={true}
        onDelete={(item) => deleteHolMutation.mutateAsync(item.id)}
        isDeleting={deleteHolMutation.isPending}
      />
    </div>
  );
}

export default AcademicManagement;
