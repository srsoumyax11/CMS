import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '@/api/adminApi';
import { QUERY_KEYS } from '@/lib/constants';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn, type TableFilterDef } from '@/components/shared/pro-table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/config/permissions';
import { Plus, ShieldAlert, CheckCircle2, UserCheck, GraduationCap, Briefcase, UserCog, Users } from 'lucide-react';
import type { 
  StudentItemResponse, 
  FacultyItemResponse, 
  AdminItemResponse, 
  AccountStatus, 
  Department 
} from '@/types/api';
import { useAdminList } from '@/hooks/useAdminList';
import { useDialogState } from '@/hooks/useDialogState';
import { useStudentMutations } from '@/hooks/useStudentMutations';
import { useFacultyAdmin } from '@/hooks/useFacultyAdmin';
import { useMetadata } from '@/hooks/useMetadata';
import { StudentActionModal, type UpdateActionPayload } from './components/StudentActionModal';
import { StudentCreateModal } from './components/StudentCreateModal';
import { FacultyCreateModal } from './components/FacultyCreateModal';

export type UserRoleTab = 'all' | 'student' | 'faculty' | 'staff' | 'parent' | 'admin';

export function UserManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as UserRoleTab) || 'all';

  const setActiveTab = (tab: UserRoleTab) => {
    setSearchParams((prev) => {
      prev.set('tab', tab);
      return prev;
    });
  };

  const { departments, courses } = useMetadata();

  // ── 1. Data Fetching for All Role Types ──
  const { items: allUsers, isLoading: loadingAll } = useAdminList<any, string | undefined>(
    [QUERY_KEYS.ADMIN_USERS],
    () => adminApi.listUsers({ limit: 200 }),
    undefined
  );

  const { items: students, isLoading: loadingStudents, refetch: refetchStudents } = useAdminList<StudentItemResponse, string | undefined>(
    [QUERY_KEYS.STUDENTS],
    (filter) => adminApi.listStudents({ status: filter as AccountStatus }),
    undefined
  );

  const { facultyList, createMutation: createFacultyMutation } = useFacultyAdmin();
  const { createMutation: createStudentMutation, updateStatusMutation } = useStudentMutations();

  const { items: adminList, isLoading: loadingAdmins } = useAdminList<AdminItemResponse, string | undefined>(
    [QUERY_KEYS.ADMINS],
    (filter) => adminApi.listAdmins({ status: filter as AccountStatus }),
    undefined
  );

  // Department mapping helper
  const deptMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach((d) => map.set(d.id, d));
    return map;
  }, [departments]);

  // Categorize Faculty vs Staff by department type
  const academicFaculty = useMemo(() => {
    return (facultyList.items || []).filter((f) => {
      const dept = deptMap.get(f.department_id);
      return !dept || dept.department_type === 'academic';
    });
  }, [facultyList.items, deptMap]);

  const administrativeStaff = useMemo(() => {
    return (facultyList.items || []).filter((f) => {
      const dept = deptMap.get(f.department_id);
      return dept?.department_type === 'administrative';
    });
  }, [facultyList.items, deptMap]);

  const adminUsers = useMemo(() => {
    return (allUsers || []).filter((u: any) => u.user_type === 'admin');
  }, [allUsers]);

  const parentUsers = useMemo(() => {
    return (allUsers || []).filter((u: any) => u.user_type === 'parent');
  }, [allUsers]);

  const studentUsers = useMemo(() => {
    return students.length > 0 ? students : (allUsers || []).filter((u: any) => u.user_type === 'student');
  }, [students, allUsers]);

  const academicFacultyUsers = useMemo(() => {
    return academicFaculty.length > 0 ? academicFaculty : (allUsers || []).filter((u: any) => u.user_type === 'faculty');
  }, [academicFaculty, allUsers]);

  const staffUsers = useMemo(() => {
    return administrativeStaff.length > 0 ? administrativeStaff : (allUsers || []).filter((u: any) => u.user_type === 'staff');
  }, [administrativeStaff, allUsers]);

  // Modals state
  const createStudentModal = useDialogState();
  const createFacultyModal = useDialogState();
  const [pendingAction, setPendingAction] = useState<UpdateActionPayload | null>(null);

  const handleStudentAction = (student: StudentItemResponse, actionType: 'approve' | 'reject') => {
    if (actionType === 'approve') {
      setPendingAction({
        id: student.id,
        payload: { account_status: 'active' },
        label: `Approve student account for ${student.name}`,
      });
    } else {
      setPendingAction({
        id: student.id,
        payload: { account_status: 'rejected' },
        label: `Reject student application for ${student.name}`,
      });
    }
  };

  // ── Column Definitions ──

  // All Users Table Columns
  const allUsersColumns: ProColumn<any>[] = [
    {
      id: 'name',
      header: 'User Account',
      accessorKey: 'name',
      cell: (val, row) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 border">
            <AvatarImage src={row.photo_url || undefined} alt={row.name || row.email} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {(row.name || row.email || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground text-sm">{row.name || 'Unnamed User'}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'user_type',
      header: 'Role',
      accessorKey: 'user_type',
      cell: (val) => (
        <Badge variant="outline" className="capitalize text-xs font-medium bg-muted/40">
          {val || 'user'}
        </Badge>
      ),
      sortable: true,
      width: '120px',
    },
    {
      id: 'account_status',
      header: 'Account Status',
      accessorKey: 'account_status',
      cell: (val) => <StatusBadge status={val} type="account" />,
      sortable: true,
      width: '130px',
      align: 'center',
    },
  ];

  // Students Table Columns
  const studentColumns: ProColumn<StudentItemResponse>[] = [
    {
      id: 'name',
      header: 'Student Name',
      accessorKey: 'name',
      cell: (val, row) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {row.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="font-semibold text-foreground text-sm">{row.name}</span>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'registration_no',
      header: 'Reg No / Roll No',
      accessorKey: 'registration_no',
      cell: (val, row) => (
        <div>
          <span className="font-mono text-xs font-semibold text-foreground">{val || '—'}</span>
          {row.roll_no && <p className="text-[10px] text-muted-foreground">Roll: {row.roll_no}</p>}
        </div>
      ),
      sortable: true,
    },
    {
      id: 'department_name',
      header: 'Dept / Course',
      cell: (_, row) => (
        <div>
          <span className="text-xs font-medium text-foreground">{row.department_name || '—'}</span>
          <p className="text-[11px] text-muted-foreground">{row.course_name || '—'}</p>
        </div>
      ),
    },
    {
      id: 'academic_status',
      header: 'Academic',
      accessorKey: 'academic_status',
      cell: (val) => <StatusBadge status={val} type="academic" />,
      sortable: true,
      width: '110px',
    },
    {
      id: 'account_status',
      header: 'Account',
      accessorKey: 'account_status',
      cell: (val) => <StatusBadge status={val} type="account" />,
      sortable: true,
      width: '110px',
      align: 'center',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (_, row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {row.account_status === 'pending' && (
            <>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" onClick={() => handleStudentAction(row, 'approve')}>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleStudentAction(row, 'reject')}>
                <ShieldAlert className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      ),
      width: '90px',
      align: 'right',
    },
  ];

  // Faculty & Staff Table Columns
  const facultyColumns: ProColumn<FacultyItemResponse>[] = [
    {
      id: 'name',
      header: 'Faculty / Staff Member',
      accessorKey: 'name',
      cell: (val, row) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.photo_url || undefined} alt={row.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {row.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground text-sm">{row.name}</span>
              {row.is_hod && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-primary/15 text-primary border-primary/20">
                  HOD
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'user_id',
      header: 'Staff ID',
      accessorKey: 'user_id',
      cell: (val) => <span className="font-mono text-xs font-semibold text-foreground">{val}</span>,
      sortable: true,
      width: '120px',
    },
    {
      id: 'department_name',
      header: 'Department',
      accessorKey: 'department_name',
      cell: (val) => <span className="text-xs font-medium text-foreground">{val}</span>,
      sortable: true,
    },
    {
      id: 'designation',
      header: 'Designation',
      accessorKey: 'designation',
      cell: (val) => <span className="text-xs text-muted-foreground">{val}</span>,
      sortable: true,
    },
    {
      id: 'account_status',
      header: 'Account Status',
      accessorKey: 'account_status',
      cell: (val) => <StatusBadge status={val} type="account" />,
      sortable: true,
      width: '120px',
      align: 'center',
    },
  ];

  // Filters setup
  const accountStatusFilters: TableFilterDef<any>[] = [
    {
      id: 'account_status',
      label: 'Account Status',
      defaultValue: 'all',
      options: [
        { label: 'All Statuses', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Pending Approval', value: 'pending' },
        { label: 'Revision Required', value: 'revision' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Rejected', value: 'rejected' },
      ],
      filterFn: (row, val) => row.account_status === val,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'student' && (
              <PermissionGuard permission={PERMISSIONS.STUDENT_PROFILE.CREATE}>
                <Button onClick={() => createStudentModal.open()} className="gap-1.5 shadow-xs">
                  <Plus className="h-4 w-4" />
                  Add Student
                </Button>
              </PermissionGuard>
            )}
            {(activeTab === 'faculty' || activeTab === 'staff') && (
              <PermissionGuard permission={PERMISSIONS.FACULTY_PROFILE.CREATE}>
                <Button onClick={() => createFacultyModal.open()} className="gap-1.5 shadow-xs">
                  <Plus className="h-4 w-4" />
                  Add Staff / Faculty
                </Button>
              </PermissionGuard>
            )}
          </div>
        }
      />

      {/* Role Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as UserRoleTab)} className="w-full">
        <TabsList className="bg-muted/60 p-1 flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs font-medium gap-1.5">
            <Users className="h-3.5 w-3.5" />
            All Users ({allUsers.length})
          </TabsTrigger>
          <TabsTrigger value="student" className="text-xs font-medium gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            Students ({studentUsers.length})
          </TabsTrigger>
          <TabsTrigger value="faculty" className="text-xs font-medium gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            Faculty ({academicFacultyUsers.length})
          </TabsTrigger>
          <TabsTrigger value="staff" className="text-xs font-medium gap-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            Staff ({staffUsers.length})
          </TabsTrigger>
          <TabsTrigger value="parent" className="text-xs font-medium gap-1.5">
            <UserCog className="h-3.5 w-3.5" />
            Parents ({parentUsers.length})
          </TabsTrigger>
          <TabsTrigger value="admin" className="text-xs font-medium gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            Administrators ({adminUsers.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Dynamic Data Table Rendering based on activeTab */}
      {activeTab === 'all' && (
        <ProTable
          columns={allUsersColumns}
          data={allUsers}
          isLoading={loadingAll}
          rowKey={(row) => row.id}
          filters={accountStatusFilters}
          searchPlaceholder="Search all platform users by name or email..."
          exportFileName="all-platform-users"
          emptyTitle="No platform users found"
        />
      )}

      {activeTab === 'student' && (
        <ProTable
          columns={studentColumns}
          data={studentUsers}
          isLoading={loadingStudents}
          rowKey={(row) => row.id}
          filters={accountStatusFilters}
          searchPlaceholder="Search students by name, reg number, email..."
          exportFileName="student-directory"
          emptyTitle="No students found"
        />
      )}

      {activeTab === 'faculty' && (
        <ProTable
          columns={facultyColumns}
          data={academicFacultyUsers}
          isLoading={facultyList.isLoading}
          rowKey={(row) => row.id}
          filters={accountStatusFilters}
          searchPlaceholder="Search academic faculty by name, staff ID, department..."
          exportFileName="faculty-directory"
          emptyTitle="No academic faculty members found"
        />
      )}

      {activeTab === 'staff' && (
        <ProTable
          columns={facultyColumns}
          data={staffUsers}
          isLoading={facultyList.isLoading}
          rowKey={(row) => row.id}
          filters={accountStatusFilters}
          searchPlaceholder="Search administrative staff members..."
          exportFileName="staff-directory"
          emptyTitle="No administrative staff found"
        />
      )}

      {activeTab === 'parent' && (
        <ProTable
          columns={allUsersColumns}
          data={parentUsers}
          isLoading={loadingAll}
          rowKey={(row) => row.id}
          filters={accountStatusFilters}
          searchPlaceholder="Search parent accounts..."
          exportFileName="parents-directory"
          emptyTitle="No parent accounts found"
        />
      )}

      {activeTab === 'admin' && (
        <ProTable
          columns={allUsersColumns}
          data={adminUsers}
          isLoading={loadingAll}
          rowKey={(row) => row.id}
          filters={accountStatusFilters}
          searchPlaceholder="Search administrator accounts..."
          exportFileName="administrators-directory"
          emptyTitle="No administrator accounts found"
        />
      )}

      {/* Creation Modals */}
      <StudentCreateModal
        isOpen={createStudentModal.isOpen}
        onClose={createStudentModal.close}
        onSubmit={(data) => {
          createStudentMutation.mutate(data, {
            onSuccess: () => createStudentModal.close(),
          });
        }}
        isPending={createStudentMutation.isPending}
        courses={courses}
        departments={departments}
      />

      <FacultyCreateModal
        isOpen={createFacultyModal.isOpen}
        onClose={createFacultyModal.close}
        onSubmit={(data) => {
          createFacultyMutation.mutate(data, {
            onSuccess: () => createFacultyModal.close(),
          });
        }}
        isPending={createFacultyMutation.isPending}
        departments={departments}
      />

      {/* Student Action Moderation Modal */}
      <StudentActionModal
        action={pendingAction}
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={async (id, payload) => {
          await updateStatusMutation.mutateAsync({
            id,
            payload,
          });
          setPendingAction(null);
          refetchStudents();
        }}
      />
    </div>
  );
}

export default UserManagement;
