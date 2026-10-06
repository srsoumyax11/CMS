import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { getErrorMessage } from '@/lib/error-utils';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn } from '@/components/shared/pro-table';
import { EntityViewEditDialog, type EntityField } from '@/components/shared/entity-dialog';
import { Button } from '@/components/ui/button';
import { Plus, Filter, Users, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { AudienceGroup, AudienceGroupCreateRequest, AudienceGroupUpdateRequest } from '@/types/api';
import { format } from 'date-fns';

export function AudienceGroupManagement() {
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<AudienceGroup | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch data
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['audience_groups'],
    queryFn: () => adminApi.listAudienceGroups(),
  });
  const groups = response?.data?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: AudienceGroupCreateRequest) => adminApi.createAudienceGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience_groups'] });
      toast.success('Audience group created successfully');
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to create audience group'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AudienceGroupUpdateRequest }) =>
      adminApi.updateAudienceGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience_groups'] });
      toast.success('Audience group updated successfully');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to update audience group'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteAudienceGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience_groups'] });
      toast.success('Audience group deleted successfully');
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to delete audience group'));
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => adminApi.syncAudienceGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience_groups'] });
      toast.success('Audience group synced successfully');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to sync audience group'));
    },
  });

  // Table Columns
  const columns: ProColumn<AudienceGroup>[] = [
    {
      id: 'name',
      header: 'Group Name',
      accessorKey: 'name',
      cell: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-foreground">{row.name}</span>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.description}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'member_count',
      header: 'Members',
      accessorKey: 'member_count',
      cell: (val) => (
        <div className="flex items-center gap-1.5 font-medium">
          <Users className="h-4 w-4 text-muted-foreground" />
          {val}
        </div>
      ),
      sortable: true,
      align: 'center',
    },
    {
      id: 'updated_at',
      header: 'Last Synced',
      accessorKey: 'updated_at',
      cell: (val) => <span className="text-sm text-muted-foreground">{format(new Date(val), 'MMM d, yyyy HH:mm')}</span>,
      sortable: true,
    },
    {
      id: 'actions',
      header: '',
      accessorKey: 'id',
      cell: (val, row) => (
        <div className="flex justify-end pr-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => syncMutation.mutate(row.id)}
            disabled={syncMutation.isPending && syncMutation.variables === row.id}
            className="text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${syncMutation.isPending && syncMutation.variables === row.id ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>
      ),
      width: '100px',
    }
  ];

  // Entity Fields
  const fields: EntityField<AudienceGroup>[] = [
    {
      key: 'name',
      label: 'Group Name',
      type: 'text',
      required: true,
      placeholder: 'e.g., All First Year CSE Students',
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      required: false,
      placeholder: 'Briefly describe this audience...',
    },
    {
      key: 'filters',
      label: 'Filter Rules (JSON)',
      type: 'textarea',
      description: 'Define matching criteria. Example: {"year": 1}',
      required: true,
      defaultValue: '{\n  "year": null,\n  "department_id": null,\n  "course_id": null\n}',
      validate: (val) => {
        try {
          if (typeof val === 'string') JSON.parse(val);
          return null;
        } catch {
          return 'Must be valid JSON';
        }
      },
      renderView: (val) => (
        <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(val, null, 2)}
        </pre>
      ),
    },
  ];

  const handleSave = async (formData: Record<string, any>, item: AudienceGroup | null) => {
    let parsedFilters = {};
    try {
      parsedFilters = typeof formData.filters === 'string' ? JSON.parse(formData.filters) : formData.filters;
    } catch {
      toast.error('Invalid JSON in filters');
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      filters: parsedFilters,
    };

    if (item) {
      await updateMutation.mutateAsync({ id: item.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const handleRowClick = (group: AudienceGroup) => {
    // Stringify filters for the form
    const groupWithStrFilters = {
      ...group,
      filters: typeof group.filters === 'object' ? JSON.stringify(group.filters, null, 2) : group.filters
    };
    setSelectedGroup(groupWithStrFilters as any);
    setDialogMode('view');
    setIsDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setSelectedGroup(null);
    setDialogMode('create');
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={handleOpenCreate} className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            Create Audience Group
          </Button>
        }
      />

      <ProTable
        columns={columns}
        data={groups}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        rowKey={(row) => row.id}
        onRowClick={handleRowClick}
        searchPlaceholder="Search audience groups..."
        exportFileName="audience-groups"
        emptyTitle="No audience groups found"
        emptyDescription="Create your first audience group to target notices to specific students."
      />

      <EntityViewEditDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        entityName="Audience Group"
        data={selectedGroup}
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

export default AudienceGroupManagement;
