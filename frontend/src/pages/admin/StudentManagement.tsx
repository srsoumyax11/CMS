import { useQuery } from '@tanstack/react-query';
import { metadataApi } from '@/api/metadataApi';
import { QUERY_KEYS } from '@/lib/constants';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import type { StudentItemResponse, AccountStatus, Course, Department } from '@/types/api';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import type { StudentUpdateFormValues } from '@/schemas/validation-schemas';

import { useAdminList } from '@/hooks/useAdminList';
import { useDialogState } from '@/hooks/useDialogState';
import { useStudentMutations } from '@/hooks/useStudentMutations';
import { adminApi } from '@/api/adminApi';

import { StudentTable } from './components/StudentTable';
import { StudentDetailsModal } from './components/StudentDetailsModal';
import { StudentActionModal, type UpdateActionPayload } from './components/StudentActionModal';
import { StudentCreateModal } from './components/StudentCreateModal';
import { StudentEditModal } from './components/StudentEditModal';
import { useState } from 'react';

export function StudentManagement() {
  const { items: students, isLoading, error, filter: statusFilter, setFilter: setStatusFilter, refetch } = useAdminList<StudentItemResponse, string | undefined>(
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

  const detailsModal = useDialogState<StudentItemResponse>();
  const createModal = useDialogState();
  const actionModal = useDialogState<UpdateActionPayload>();
  
  // Custom state for edit modal since it needs id + initialData
  const [editModalId, setEditModalId] = useState<string | null>(null);
  const [editModalData, setEditModalData] = useState<StudentUpdateFormValues | null>(null);

  const handleEditClick = (row: StudentItemResponse) => {
    setEditModalId(row.id);
    setEditModalData({
      name: row.name,
      course_id: row.course_id || '',
      department_id: row.department_id || '',
      year: row.year,
      hostel: row.hostel || '',
    });
  };

  const closeEditModal = () => {
    setEditModalId(null);
    setEditModalData(null);
  };

  if (error) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-foreground">Student Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage student accounts and academic lifecycles
          </p>
        </div>
        <PermissionGuard permission="students:create">
          <Button onClick={() => createModal.open()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </PermissionGuard>
      </div>

      <Tabs defaultValue="all" value={statusFilter || 'all'} onValueChange={(val) => setStatusFilter(val === 'all' ? undefined : val)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="suspended">Suspended</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      <StudentTable 
        students={students}
        isLoading={isLoading}
        onRowClick={detailsModal.open}
        onUpdateAction={actionModal.open}
        onEditClick={handleEditClick}
      />

      <StudentDetailsModal 
        student={detailsModal.data}
        isOpen={detailsModal.isOpen}
        onClose={detailsModal.close}
      />

      <StudentActionModal 
        action={actionModal.data}
        isOpen={actionModal.isOpen}
        onClose={actionModal.close}
        onConfirm={(id, payload) => {
          updateStatusMutation.mutate({ id, payload });
          actionModal.close();
        }}
      />

      <StudentCreateModal 
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        isPending={createMutation.isPending}
        courses={courses}
        departments={departments}
        onSubmit={(data) => {
          createMutation.mutate(data, {
            onSuccess: () => createModal.close()
          });
        }}
      />

      <StudentEditModal 
        id={editModalId}
        initialData={editModalData}
        isOpen={!!editModalId}
        onClose={closeEditModal}
        isPending={editMutation.isPending}
        courses={courses}
        departments={departments}
        onSubmit={(id, payload) => {
          editMutation.mutate({ id, payload }, {
            onSuccess: () => closeEditModal()
          });
        }}
      />
    </div>
  );
}
