import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { getErrorMessage } from '@/lib/error-utils';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn } from '@/components/shared/pro-table';
import { EntityViewEditDialog, type EntityField } from '@/components/shared/entity-dialog';
import { Button } from '@/components/ui/button';
import { Plus, Landmark, Building2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Building } from '@/types/api';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const BuildingTypeBadge = ({ type }: { type: string }) => {
  switch (type) {
    case 'academic': return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20">Academic</Badge>;
    case 'hostel': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">Hostel</Badge>;
    case 'administrative': return <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20">Administrative</Badge>;
    case 'sports': return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">Sports</Badge>;
    default: return <Badge variant="outline" className="bg-muted text-muted-foreground border-border capitalize">{type}</Badge>;
  }
};

export function BuildingManagement() {
  const queryClient = useQueryClient();
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch data
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => adminApi.listBuildings(),
  });
  const buildings = response?.data?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createBuilding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast.success('Building created successfully');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to create building')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateBuilding(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast.success('Building updated successfully');
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to update building')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteBuilding(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast.success('Building deleted successfully');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to delete building')),
  });

  // Table Columns
  const columns: ProColumn<Building>[] = [
    {
      id: 'name',
      header: 'Building',
      accessorKey: 'name',
      cell: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-foreground">{val}</span>
            <p className="text-xs text-muted-foreground">Code: {row.code}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'building_type',
      header: 'Type',
      accessorKey: 'building_type',
      cell: (val) => <BuildingTypeBadge type={val} />,
      sortable: true,
    },
    {
      id: 'total_floors',
      header: 'Floors',
      accessorKey: 'total_floors',
      sortable: true,
      align: 'center',
    },
    {
      id: 'is_active',
      header: 'Status',
      accessorKey: 'is_active',
      cell: (val) => (
        <div className="flex items-center gap-1.5">
          {val ? (
            <><CheckCircle2 className="h-4 w-4 text-green-500" /> <span className="text-sm font-medium">Active</span></>
          ) : (
            <><XCircle className="h-4 w-4 text-red-500" /> <span className="text-sm font-medium text-muted-foreground">Inactive</span></>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      id: 'created_at',
      header: 'Added On',
      accessorKey: 'created_at',
      cell: (val) => <span className="text-sm text-muted-foreground">{format(new Date(val), 'MMM d, yyyy')}</span>,
      sortable: true,
    }
  ];

  // Entity Fields
  const fields: EntityField<Building>[] = [
    { key: 'name', label: 'Building Name', type: 'text', required: true },
    { key: 'code', label: 'Building Code', type: 'text', required: true, description: 'Short unique identifier e.g., "LIB" or "H1"' },
    { 
      key: 'building_type', 
      label: 'Building Type', 
      type: 'select', 
      required: true,
      defaultValue: 'academic',
      options: [
        { label: 'Academic', value: 'academic' },
        { label: 'Hostel', value: 'hostel' },
        { label: 'Administrative', value: 'administrative' },
        { label: 'Sports', value: 'sports' },
        { label: 'Other', value: 'other' }
      ]
    },
    { key: 'total_floors', label: 'Total Floors', type: 'number', required: true, defaultValue: 1 },
    { key: 'is_active', label: 'Is Active', type: 'switch', defaultValue: true },
  ];

  const handleSave = async (formData: Record<string, any>, item: Building | null) => {
    const payload = {
      name: formData.name,
      code: formData.code,
      building_type: formData.building_type,
      total_floors: Number(formData.total_floors),
      is_active: formData.is_active,
    };

    if (item) {
      await updateMutation.mutateAsync({ id: item.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buildings"
        description="Manage campus infrastructure and physical buildings"
        actions={
          <Button onClick={() => { setSelectedBuilding(null); setDialogMode('create'); setIsDialogOpen(true); }} className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            Add Building
          </Button>
        }
      />

      <ProTable
        columns={columns}
        data={buildings}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        rowKey={(row) => row.id}
        onRowClick={(row) => {
          setSelectedBuilding(row);
          setDialogMode('view');
          setIsDialogOpen(true);
        }}
        searchPlaceholder="Search buildings..."
        exportFileName="buildings"
      />

      <EntityViewEditDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        entityName="Building"
        data={selectedBuilding}
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

export default BuildingManagement;
