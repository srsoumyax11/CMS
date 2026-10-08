import { useState } from 'react';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn } from '@/components/shared/pro-table';
import { EntityViewEditDialog } from '@/components/shared/entity-dialog/EntityViewEditDialog';
import type { EntityField } from '@/components/shared/entity-dialog/types';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserAdmin } from '@/hooks/useUserAdmin';
import { Edit2 } from 'lucide-react';
import type { UserManagementItemResponse, AccountStatus } from '@/types/api';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/config/permissions';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function AllUsersManagement() {
  const { usersList, editMutation } = useUserAdmin();

  const [selectedUser, setSelectedUser] = useState<UserManagementItemResponse | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit'>('view');

  const handleRowClick = (user: UserManagementItemResponse) => {
    setSelectedUser(user);
    setDialogMode('view');
    setIsDetailsOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, user: UserManagementItemResponse) => {
    e.stopPropagation();
    setSelectedUser(user);
    setDialogMode('edit');
    setIsDetailsOpen(true);
  };

  const handleSave = async (data: any) => {
    if (!selectedUser) return;
    await editMutation.mutateAsync({
      id: selectedUser.id,
      data,
    });
    setIsDetailsOpen(false);
  };

  const columns: ProColumn<UserManagementItemResponse>[] = [
    {
      id: 'user',
      header: 'User',
      accessorFn: (row: UserManagementItemResponse) => row.name,
      cell: (_, row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${row.name}`} />
            <AvatarFallback>{row.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{row.name}</span>
            <span className="text-xs text-muted-foreground">{row.email}</span>
          </div>
        </div>
      ),
      sortable: true,
      searchable: true,
    },
    {
      id: 'user_type',
      header: 'Type',
      accessorKey: 'user_type',
      cell: (value) => (
        <Badge variant="outline" className="capitalize">
          {value as string}
        </Badge>
      ),
      sortable: true,
      searchable: true,
    },
    {
      id: 'phone',
      header: 'Phone',
      accessorKey: 'phone',
      cell: (value) => <span className="text-sm">{(value as string) || '-'}</span>,
    },
    {
      id: 'created_at',
      header: 'Joined',
      accessorKey: 'created_at',
      cell: (value) => {
        const val = value as string;
        if (!val) return '-';
        return <span className="text-sm">{format(new Date(val), 'MMM d, yyyy')}</span>;
      },
      sortable: true,
    },
    {
      id: 'status',
      header: 'Account Status',
      accessorKey: 'account_status',
      cell: (value) => <StatusBadge status={value as AccountStatus} type="account" />,
      sortable: true,
      searchable: true,
    },
    {
      id: 'actions',
      header: '',
      cell: (_, row) => (
        <PermissionGuard permission={PERMISSIONS.USER.EDIT}>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => handleEditClick(e, row)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        </PermissionGuard>
      ),
    }
  ];

  const userFields: EntityField<UserManagementItemResponse>[] = [
    { key: 'name', label: 'Full Name', type: 'text', required: true, section: 'Basic Info' },
    { key: 'email', label: 'Email', type: 'text', section: 'Basic Info', editable: false },
    { key: 'phone', label: 'Phone', type: 'text', section: 'Basic Info' },
    {
      key: 'user_type',
      label: 'User Type',
      type: 'select',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Student', value: 'student' },
        { label: 'Faculty', value: 'faculty' },
        { label: 'Staff', value: 'staff' },
        { label: 'Admin', value: 'admin' },
      ],
      required: true,
      section: 'Role & Status'
    },
    { key: 'target_role', label: 'Target Role', type: 'text', section: 'Role & Status' },
    {
      key: 'account_status',
      label: 'Account Status',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Pending', value: 'pending' },
        { label: 'Suspended', value: 'suspended' },
      ],
      required: true,
      section: 'Role & Status'
    },
    { key: 'status_note', label: 'Status Note (Reason)', type: 'textarea', section: 'Role & Status' },
    { key: 'email_notifications', label: 'Email Notifications', type: 'switch', section: 'Security & Preferences' },
    { key: 'in_app_alerts', label: 'In-App Alerts', type: 'switch', section: 'Security & Preferences' },
    { key: 'is_2fa_enabled', label: '2FA Enabled', type: 'switch', section: 'Security & Preferences' },
  ];

  if (usersList.isError) {
    return <ErrorState description="Failed to load users" onRetry={() => { usersList.refetch(); }} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Users"
        description="Manage all users on the platform"
      />

      <ProTable
        columns={columns}
        data={(usersList.data?.data?.data as unknown as UserManagementItemResponse[]) || []}
        isLoading={usersList.isLoading}
        searchPlaceholder="Search users..."
        onRowClick={handleRowClick}
        rowKey={(row) => row.id}
      />

      {isDetailsOpen && selectedUser && (
        <EntityViewEditDialog<UserManagementItemResponse>
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          entityName={selectedUser.name || 'User Details'}
          data={selectedUser}
          fields={userFields}
          initialMode={dialogMode}
          onSave={handleSave}
          isSaving={editMutation.isPending}
          canEdit={true}
        />
      )}
    </div>
  );
}
