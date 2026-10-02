import { useState } from 'react';
import { useMetadata } from '@/hooks/useMetadata';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import type { FacultyItemResponse } from '@/types/api';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useFacultyAdmin } from '@/hooks/useFacultyAdmin';
import { FacultyTable } from './components/FacultyTable';
import { AdminTable } from './components/AdminTable';
import { FacultyCreateModal } from './components/FacultyCreateModal';
import { FacultyEditModal } from './components/FacultyEditModal';
import { useDialogState } from '@/hooks/useDialogState';

export function FacultyManagement() {
  const { facultyList, adminList, createMutation, editMutation } = useFacultyAdmin();
  const [roleTab, setRoleTab] = useState<string>('faculty');

  const { courses, departments, roles, isLoading: metadataLoading } = useMetadata();
  const activeDepartments = departments.filter(d => d.is_active);

  const createModal = useDialogState();
  const editModal = useDialogState<FacultyItemResponse>();

  if (facultyList.error || adminList.error) {
    return <ErrorState onRetry={() => { facultyList.refetch(); adminList.refetch(); }} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Staff & Admin Management</h2>
          <p className="text-sm text-muted-foreground">
            View and manage faculty and administrators
          </p>
        </div>
        <PermissionGuard permission="faculty:create">
          <Button onClick={() => createModal.open()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Faculty
          </Button>
        </PermissionGuard>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs value={roleTab} onValueChange={setRoleTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="faculty">Faculty</TabsTrigger>
            <TabsTrigger value="admin">Administrators</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Select 
          value={facultyList.filter ?? 'all'} 
          onValueChange={(v) => {
            facultyList.setFilter(v === 'all' ? undefined : v);
            adminList.setFilter(v === 'all' ? undefined : v);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={roleTab === 'admin' ? 'admins' : 'faculty'} className="w-full mt-2">
        <TabsContent value="faculty">
          <FacultyTable
            faculty={facultyList.items.filter(f => roleTab === 'hod' ? f.is_hod : !f.is_hod)}
            isLoading={facultyList.isLoading}
            onRowClick={(row) => editModal.open(row)}
          />
        </TabsContent>

        <TabsContent value="admins">
          <AdminTable
            admins={adminList.items}
            isLoading={adminList.isLoading}
          />
        </TabsContent>
      </Tabs>

      <FacultyCreateModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onSubmit={(data) => {
          createMutation.mutate(data, {
            onSuccess: () => createModal.close()
          });
        }}
        isPending={createMutation.isPending}
        courses={courses}
        departments={activeDepartments}
        roles={roles}
      />

      <FacultyEditModal
        faculty={editModal.data}
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        onSubmit={(id, data) => editMutation.mutate({ id, data }, {
          onSuccess: () => editModal.close()
        })}
        isPending={editMutation.isPending}
        departments={activeDepartments}
        onUploadSuccess={() => facultyList.refetch()}
      />
    </div>
  );
}
