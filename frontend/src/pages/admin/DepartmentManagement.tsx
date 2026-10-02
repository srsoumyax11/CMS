import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { getErrorMessage } from '@/lib/error-utils';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn, type TableFilterDef } from '@/components/shared/pro-table';
import { EntityViewEditDialog, type EntityField } from '@/components/shared/entity-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, User } from 'lucide-react';
import { toast } from 'sonner';
import type { Department, DepartmentCreateRequest, DepartmentUpdateRequest } from '@/types/api';

export function DepartmentManagement() {
  const queryClient = useQueryClient();
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch departments data
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['departments'],
    queryFn: () => adminApi.listDepartments(),
  });
  const departments = response?.data?.data || [];

  // Fetch faculty for HOD assignment
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

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: DepartmentCreateRequest) => adminApi.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['metadata', 'departments'] });
      toast.success('Department created successfully');
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to create department'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DepartmentUpdateRequest }) =>
      adminApi.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['metadata', 'departments'] });
      toast.success('Department updated successfully');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to update department'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['metadata', 'departments'] });
      toast.success('Department deleted successfully');
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to delete department. It may be in use.'));
    },
  });

  // Table Columns
  const columns: ProColumn<Department>[] = [
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

  // Filters
  const filters: TableFilterDef<Department>[] = [
    {
      id: 'is_active',
      label: 'Status',
      defaultValue: 'all',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Active', value: true },
        { label: 'Inactive', value: false },
      ],
      filterFn: (row, val) => row.is_active === val,
    },
    {
      id: 'department_type',
      label: 'Type',
      defaultValue: 'all',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Academic', value: 'academic' },
        { label: 'Administrative', value: 'administrative' },
      ],
      filterFn: (row, val) => row.department_type === val,
    },
  ];

  // Entity Modal Fields (View + Edit + Create)
  const fields: EntityField<Department>[] = [
    {
      key: 'name',
      label: 'Department Name',
      type: 'text',
      required: true,
      placeholder: 'e.g. Computer Science & Engineering',
    },
    {
      key: 'code',
      label: 'Department Code',
      type: 'text',
      required: true,
      placeholder: 'e.g. CSE',
    },
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
      placeholder: 'Select a faculty member (Optional)',
      options: [
        { label: 'None / Unassigned', value: 'none' },
        ...facultyList.map((f) => ({ label: `${f.name} (${f.designation || 'Faculty'})`, value: f.id })),
      ],
      renderView: (val) => (
        <span className="text-sm font-medium">
          {val && val !== 'none' ? facultyMap.get(val) || 'Assigned' : 'Not assigned'}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Active Status',
      type: 'switch',
      description: 'Allow students and faculty to be enrolled and assigned to this department.',
      defaultValue: true,
    },
  ];

  const handleSave = async (formData: Record<string, any>, item: Department | null) => {
    const payload = {
      name: formData.name,
      code: formData.code,
      department_type: formData.department_type,
      is_active: Boolean(formData.is_active),
      hod_user_id: formData.hod_user_id && formData.hod_user_id !== 'none' ? formData.hod_user_id : null,
    };

    if (item) {
      await updateMutation.mutateAsync({ id: item.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const handleRowClick = (dept: Department) => {
    setSelectedDept(dept);
    setDialogMode('view');
    setIsDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setSelectedDept(null);
    setDialogMode('create');
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={handleOpenCreate} className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            Add Department
          </Button>
        }
      />

      <ProTable
        columns={columns}
        data={departments}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        rowKey={(row) => row.id}
        onRowClick={handleRowClick}
        filters={filters}
        searchPlaceholder="Search departments by name or code..."
        exportFileName="departments-list"
        emptyTitle="No departments found"
        emptyDescription="Create your first academic or administrative department to organize courses and faculty."
      />

      <EntityViewEditDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        entityName="Department"
        data={selectedDept}
        fields={fields}
        initialMode={dialogMode}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        canDelete={true}
        onDelete={(item) => deleteMutation.mutateAsync(item.id)}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
export default DepartmentManagement;
