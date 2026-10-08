import { useState, useMemo } from 'react';
import { useMetadata } from '@/hooks/useMetadata';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn, type TableFilterDef } from '@/components/shared/pro-table';
import { EntityViewEditDialog, type EntityField } from '@/components/shared/entity-dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2 } from 'lucide-react';
import type { FacultyItemResponse, AccountStatus, EmploymentStatus, Department } from '@/types/api';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/config/permissions';
import { useFacultyAdmin } from '@/hooks/useFacultyAdmin';
import { FacultyCreateModal } from './components/FacultyCreateModal';
import { useDialogState } from '@/hooks/useDialogState';

export function FacultyManagement() {
  const { facultyList, createMutation, editMutation } = useFacultyAdmin();
  const [deptTab, setDeptTab] = useState<'academic' | 'administrative'>('academic');

  const { departments } = useMetadata();
  const activeDepartments = useMemo(() => departments.filter((d) => d.is_active), [departments]);

  // Map departments by ID to easily inspect department_type
  const deptMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach((d) => map.set(d.id, d));
    return map;
  }, [departments]);

  // Categorize faculty members by department type
  const academicFaculty = useMemo(() => {
    return (facultyList.items || []).filter((f) => {
      const dept = deptMap.get(f.department_id);
      return !dept || dept.department_type === 'academic';
    });
  }, [facultyList.items, deptMap]);

  const administrativeFaculty = useMemo(() => {
    return (facultyList.items || []).filter((f) => {
      const dept = deptMap.get(f.department_id);
      return dept?.department_type === 'administrative';
    });
  }, [facultyList.items, deptMap]);

  const createModal = useDialogState();

  // Unified View + Edit dialog for Faculty
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyItemResponse | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');

  const handleRowClick = (faculty: FacultyItemResponse) => {
    setSelectedFaculty(faculty);
    setDialogMode('view');
    setIsDetailsOpen(true);
  };

  const handleEditClick = (faculty: FacultyItemResponse) => {
    setSelectedFaculty(faculty);
    setDialogMode('edit');
    setIsDetailsOpen(true);
  };

  // Faculty Table Columns
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
              <span className="font-semibold text-foreground">{row.name}</span>
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
      header: 'Account',
      accessorKey: 'account_status',
      cell: (val) => <StatusBadge status={val} type="account" />,
      sortable: true,
      width: '110px',
      align: 'center',
    },
    {
      id: 'employment_status',
      header: 'Employment',
      accessorKey: 'employment_status',
      cell: (val) => (
        <Badge variant={val === 'active' ? 'default' : 'outline'} className="capitalize text-xs font-normal">
          {val.replace('_', ' ')}
        </Badge>
      ),
      sortable: true,
      width: '120px',
      align: 'center',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (val, row) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <PermissionGuard permission={PERMISSIONS.FACULTY_PROFILE.EDIT}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleEditClick(row)}
              aria-label={`Edit ${row.name}`}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          </PermissionGuard>
        </div>
      ),
      width: '80px',
      align: 'right',
      sortable: false,
    },
  ];

  // Faculty Filters
  const facultyFilters: TableFilterDef<FacultyItemResponse>[] = [
    {
      id: 'account_status',
      label: 'Account Status',
      defaultValue: 'all',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Pending', value: 'pending' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Rejected', value: 'rejected' },
      ],
      filterFn: (row, val) => row.account_status === val,
    },
  ];

  // Fields for EntityViewEditDialog
  const facultyFields: EntityField<FacultyItemResponse>[] = [
    {
      key: 'name',
      label: 'Full Name',
      type: 'text',
      required: true,
      section: 'Personal Information',
    },
    {
      key: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      section: 'Personal Information',
    },
    {
      key: 'user_id',
      label: 'Staff ID',
      type: 'text',
      required: true,
      section: 'Personal Information',
    },
    {
      key: 'department_id',
      label: 'Department',
      type: 'select',
      required: true,
      options: activeDepartments.map((d) => ({ label: `${d.name} (${d.code})`, value: d.id })),
      renderView: (_, item) => (
        <span className="text-sm font-medium">{item.department_name}</span>
      ),
      section: 'Academic Assignment',
    },
    {
      key: 'designation',
      label: 'Academic Designation',
      type: 'text',
      required: true,
      placeholder: 'e.g. Associate Professor, Department Head',
      section: 'Academic Assignment',
    },
    {
      key: 'is_hod',
      label: 'Head of Department (HOD)',
      type: 'badge',
      editable: false,
      renderView: (val) => (
        <Badge variant={val ? 'default' : 'secondary'} className="text-xs">
          {val ? 'Yes (HOD)' : 'No'}
        </Badge>
      ),
      section: 'Academic Assignment',
    },
    {
      key: 'account_status',
      label: 'Account Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Pending', value: 'pending' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Rejected', value: 'rejected' },
      ],
      renderView: (val) => <StatusBadge status={val} type="account" />,
      section: 'Status & Moderation',
    },
    {
      key: 'employment_status',
      label: 'Employment Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Active', value: 'active' },
        { label: 'On Leave', value: 'on_leave' },
        { label: 'Resigned', value: 'resigned' },
        { label: 'Retired', value: 'retired' },
        { label: 'Terminated', value: 'terminated' },
      ],
      renderView: (val) => (
        <Badge variant={val === 'active' ? 'default' : 'outline'} className="capitalize text-xs">
          {String(val).replace('_', ' ')}
        </Badge>
      ),
      section: 'Status & Moderation',
    },
  ];

  const handleSaveFaculty = async (formData: Record<string, any>, item: FacultyItemResponse | null) => {
    if (!item) return;

    await editMutation.mutateAsync({
      id: item.id,
      data: {
        name: formData.name,
        email: formData.email,
        user_id: formData.user_id,
        department_id: formData.department_id,
        designation: formData.designation,
        account_status: formData.account_status as AccountStatus,
        employment_status: formData.employment_status as EmploymentStatus,
      },
    });

    facultyList.refetch();
  };

  if (facultyList.error) {
    return (
      <ErrorState
        onRetry={() => {
          facultyList.refetch();
        }}
      />
    );
  }

  const currentFacultyData = deptTab === 'academic' ? academicFaculty : administrativeFaculty;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <PermissionGuard permission={PERMISSIONS.FACULTY_PROFILE.CREATE}>
            <Button onClick={() => createModal.open()} className="gap-1.5 shadow-xs">
              <Plus className="h-4 w-4" />
              Add Faculty
            </Button>
          </PermissionGuard>
        }
      />

      {/* Department Navigation Tabs */}
      <Tabs
        value={deptTab}
        onValueChange={(val) => setDeptTab(val as 'academic' | 'administrative')}
        className="w-full sm:w-auto"
      >
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="academic" className="text-xs font-medium">
            Academic Departments ({academicFaculty.length})
          </TabsTrigger>
          <TabsTrigger value="administrative" className="text-xs font-medium">
            Administrative Departments ({administrativeFaculty.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <ProTable
        columns={facultyColumns}
        data={currentFacultyData}
        isLoading={facultyList.isLoading}
        rowKey={(row) => row.id}
        onRowClick={handleRowClick}
        filters={facultyFilters}
        searchPlaceholder={
          deptTab === 'academic'
            ? 'Search academic faculty by name, ID, department, designation, or email...'
            : 'Search administrative staff by name, ID, department, designation, or email...'
        }
        exportFileName={
          deptTab === 'academic' ? 'academic-faculty-directory' : 'administrative-staff-directory'
        }
        emptyTitle={
          deptTab === 'academic'
            ? 'No academic faculty members found'
            : 'No administrative staff members found'
        }
        emptyDescription={
          deptTab === 'academic'
            ? 'There are no academic faculty members matching the selected filters.'
            : 'There are no administrative staff members matching the selected filters.'
        }
      />

      {/* Global View + Edit Dialog */}
      <EntityViewEditDialog
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        entityName="Faculty Profile"
        data={selectedFaculty}
        fields={facultyFields}
        initialMode={dialogMode}
        onSave={handleSaveFaculty}
        isSaving={editMutation.isPending}
        canEdit={true}
      />

      {/* Create Modal */}
      <FacultyCreateModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onSubmit={(data) => {
          createMutation.mutate(data, {
            onSuccess: () => createModal.close(),
          });
        }}
        isPending={createMutation.isPending}
        departments={activeDepartments}
      />
    </div>
  );
}
export default FacultyManagement;
