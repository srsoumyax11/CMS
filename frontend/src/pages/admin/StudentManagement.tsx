import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { metadataApi } from '@/api/metadataApi';
import { adminApi } from '@/api/adminApi';
import { QUERY_KEYS } from '@/lib/constants';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn, type TableFilterDef } from '@/components/shared/pro-table';
import { EntityViewEditDialog, type EntityField } from '@/components/shared/entity-dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/config/permissions';
import { Check, X, Plus, MoreVertical, Edit2 } from 'lucide-react';
import type { StudentItemResponse, AccountStatus, AcademicStatus, Course, Department } from '@/types/api';
import { useAdminList } from '@/hooks/useAdminList';
import { useDialogState } from '@/hooks/useDialogState';
import { useStudentMutations } from '@/hooks/useStudentMutations';
import { StudentActionModal, type UpdateActionPayload } from './components/StudentActionModal';
import { StudentCreateModal } from './components/StudentCreateModal';

export function StudentManagement() {
  const {
    items: students,
    isLoading,
    error,
    refetch,
  } = useAdminList<StudentItemResponse, string | undefined>(
    [QUERY_KEYS.STUDENTS],
    (filter) => adminApi.listStudents({ status: filter as AccountStatus }),
    undefined
  );

  const { data: coursesResponse } = useQuery({
    queryKey: [QUERY_KEYS.COURSES],
    queryFn: () => metadataApi.getCourses(),
  });

  const { data: deptsResponse } = useQuery({
    queryKey: [QUERY_KEYS.DEPARTMENTS],
    queryFn: () => metadataApi.getDepartments(),
  });

  const courses: Course[] = coursesResponse?.data?.data ?? [];
  const departments: Department[] = deptsResponse?.data?.data ?? [];

  const { createMutation, updateStatusMutation, editMutation } = useStudentMutations();

  // Dialog states
  const createModal = useDialogState();
  const actionModal = useDialogState<UpdateActionPayload>();

  // Unified View + Edit dialog for student details
  const [selectedStudent, setSelectedStudent] = useState<StudentItemResponse | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleRowClick = (student: StudentItemResponse) => {
    setSelectedStudent(student);
    setDialogMode('view');
    setIsDetailsOpen(true);
  };

  const handleEditClick = (student: StudentItemResponse) => {
    setSelectedStudent(student);
    setDialogMode('edit');
    setIsDetailsOpen(true);
  };

  // ProTable Columns
  const columns: ProColumn<StudentItemResponse>[] = [
    {
      id: 'name',
      header: 'Student Name',
      accessorKey: 'name',
      cell: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-semibold text-foreground">{row.name}</span>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'user_id',
      header: 'Reg No.',
      accessorKey: 'user_id',
      cell: (val) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {val || 'N/A'}
        </span>
      ),
      sortable: true,
      width: '130px',
    },
    {
      id: 'academic_program',
      header: 'Course & Dept',
      accessorFn: (row) => `${row.course_name} ${row.department_name}`,
      cell: (val, row) => (
        <span className="text-xs text-foreground">
          {row.course_name} · {row.department_name} ({row.year} Year)
        </span>
      ),
    },
    {
      id: 'account_status',
      header: 'Account',
      accessorKey: 'account_status',
      cell: (val) => <StatusBadge status={val} type="account" />,
      sortable: true,
      width: '120px',
      align: 'center',
    },
    {
      id: 'academic_status',
      header: 'Standing',
      accessorKey: 'academic_status',
      cell: (val) => {
        if (!val) {
          return (
            <Badge variant="outline" className="text-xs bg-muted/40 text-muted-foreground">
              Incomplete
            </Badge>
          );
        }
        return <StatusBadge status={val} type="academic" />;
      },
      sortable: true,
      width: '120px',
      align: 'center',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (val, row) => {
        return (
          <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
            {row.account_status === 'pending' && (
              <PermissionGuard permission={PERMISSIONS.STUDENT_PROFILE.EDIT}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  title="Approve"
                  aria-label={`Approve ${row.name}`}
                  onClick={() =>
                    actionModal.open({
                      id: row.id,
                      payload: { account_status: 'active' },
                      label: 'approve account',
                    })
                  }
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  title="Reject"
                  aria-label={`Reject ${row.name}`}
                  onClick={() =>
                    actionModal.open({
                      id: row.id,
                      payload: { account_status: 'rejected' },
                      label: 'reject account',
                    })
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </PermissionGuard>
            )}

            <PermissionGuard permission={PERMISSIONS.STUDENT_PROFILE.EDIT}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Edit Profile"
                aria-label={`Edit ${row.name}`}
                onClick={() => handleEditClick(row)}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </PermissionGuard>

            <PermissionGuard permission={PERMISSIONS.STUDENT_PROFILE.EDIT}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`More actions for ${row.name}`}>
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-xs">
                  <DropdownMenuLabel className="text-xs">Account Status</DropdownMenuLabel>
                  {(['active', 'suspended', 'revision', 'rejected'] as AccountStatus[]).map((status) => (
                    <DropdownMenuItem
                      key={`acc-${status}`}
                      disabled={row.account_status === status}
                      onClick={() =>
                        actionModal.open({
                          id: row.id,
                          payload: { account_status: status },
                          label: `mark account as ${status}`,
                        })
                      }
                      className="capitalize text-xs"
                    >
                      Mark as {status}
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs">Academic Status</DropdownMenuLabel>
                  {(['enrolled', 'graduated', 'dropped', 'expelled'] as AcademicStatus[]).map((status) => (
                    <DropdownMenuItem
                      key={`acad-${status}`}
                      disabled={row.academic_status === status}
                      onClick={() =>
                        actionModal.open({
                          id: row.id,
                          payload: { academic_status: status },
                          label: `mark academic standing as ${status}`,
                        })
                      }
                      className="capitalize text-xs"
                    >
                      Mark as {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </PermissionGuard>
          </div>
        );
      },
      width: '130px',
      align: 'right',
      sortable: false,
    },
  ];

  // Filters
  const filters: TableFilterDef<StudentItemResponse>[] = [
    {
      id: 'account_status',
      label: 'Status',
      defaultValue: 'all',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Pending', value: 'pending' },
        { label: 'Active', value: 'active' },
        { label: 'Revision', value: 'revision' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Rejected', value: 'rejected' },
      ],
      filterFn: (row, val) => row.account_status === val,
    },
  ];

  // Fields for EntityViewEditDialog
  const studentFields: EntityField<StudentItemResponse>[] = [
    {
      key: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      section: 'Identity Details',
    },
    {
      key: 'user_id',
      label: 'Registration Number',
      type: 'text',
      editable: false,
      section: 'Identity Details',
    },
    {
      key: 'email',
      label: 'Email Address',
      type: 'email',
      editable: false,
      section: 'Identity Details',
    },
    {
      key: 'course_id',
      label: 'Course',
      type: 'select',
      required: true,
      options: courses.map((c) => ({ label: `${c.name} (${c.code || 'N/A'})`, value: c.id })),
      renderView: (_, item) => (
        <span className="text-sm font-medium">{item.course_name}</span>
      ),
      section: 'Academic Details',
    },
    {
      key: 'department_id',
      label: 'Department',
      type: 'select',
      required: true,
      options: departments.map((d) => ({ label: `${d.name} (${d.code})`, value: d.id })),
      renderView: (_, item) => (
        <span className="text-sm font-medium">{item.department_name}</span>
      ),
      section: 'Academic Details',
    },
    {
      key: 'year',
      label: 'Academic Year / Batch',
      type: 'number',
      required: true,
      defaultValue: 1,
      section: 'Academic Details',
    },
    {
      key: 'account_status',
      label: 'Account Status',
      type: 'badge',
      editable: false,
      renderView: (val) => <StatusBadge status={val} type="account" />,
      section: 'Account & Moderation',
    },
    {
      key: 'academic_status',
      label: 'Academic Standing',
      type: 'badge',
      editable: false,
      renderView: (val) => (val ? <StatusBadge status={val} type="academic" /> : 'Incomplete'),
      section: 'Account & Moderation',
    },
    {
      key: 'status_note',
      label: 'Moderation / Status Note',
      type: 'text',
      editable: false,
      section: 'Account & Moderation',
    },
  ];

  const handleSaveStudent = async (formData: Record<string, any>, item: StudentItemResponse | null) => {
    if (!item) return;

    await editMutation.mutateAsync({
      id: item.id,
      payload: {
        name: formData.name,
        course_id: formData.course_id,
        department_id: formData.department_id,
        year: Number(formData.year),
        hostel: formData.hostel || null,
      },
    });

    refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <PermissionGuard permission={PERMISSIONS.STUDENT_PROFILE.CREATE}>
            <Button onClick={() => createModal.open()} className="gap-1.5 shadow-xs">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </PermissionGuard>
        }
      />

      <ProTable
        columns={columns}
        data={students}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        rowKey={(row) => row.id}
        onRowClick={handleRowClick}
        filters={filters}
        searchPlaceholder="Search students by name, reg no, course, or email..."
        exportFileName="students-directory"
        emptyTitle="No students found"
        emptyDescription="There are no student accounts matching this filter criteria."
      />

      {/* Global View + Edit Dialog */}
      <EntityViewEditDialog
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        entityName="Student Profile"
        data={selectedStudent}
        fields={studentFields}
        initialMode={dialogMode}
        onSave={handleSaveStudent}
        isSaving={editMutation.isPending}
        canEdit={true}
      />

      {/* Quick Action Modal (Approve / Reject / Change status) */}
      <StudentActionModal
        action={actionModal.data}
        isOpen={actionModal.isOpen}
        onClose={actionModal.close}
        onConfirm={(id, payload) => {
          updateStatusMutation.mutate({ id, payload });
          actionModal.close();
        }}
      />

      {/* Create Modal */}
      <StudentCreateModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onSubmit={(data) => {
          createMutation.mutate(data);
          createModal.close();
        }}
        isPending={createMutation.isPending}
        courses={courses}
        departments={departments}
      />
    </div>
  );
}
export default StudentManagement;
