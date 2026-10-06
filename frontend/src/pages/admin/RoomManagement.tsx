import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { getErrorMessage } from '@/lib/error-utils';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn } from '@/components/shared/pro-table';
import { EntityViewEditDialog, type EntityField } from '@/components/shared/entity-dialog';
import { Button } from '@/components/ui/button';
import { Plus, Key, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Room } from '@/types/api';

export function RoomManagement() {
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');

  // Fetch buildings for filter & dropdown
  const { data: buildingsRes } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => adminApi.listBuildings(),
  });
  const buildings = buildingsRes?.data?.data || [];

  // Fetch rooms
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['rooms', selectedBuildingId],
    queryFn: () => adminApi.listRooms(selectedBuildingId === 'all' ? undefined : selectedBuildingId),
  });
  const rooms = response?.data?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Room created successfully');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to create room')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.updateRoom(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Room updated successfully');
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to update room')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Room deleted successfully');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to delete room')),
  });

  // Table Columns
  const columns: ProColumn<Room>[] = [
    {
      id: 'room_number',
      header: 'Room',
      accessorKey: 'room_number',
      cell: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Key className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-foreground">{val}</span>
            <p className="text-xs text-muted-foreground">{row.building_name}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'room_type',
      header: 'Type',
      accessorKey: 'room_type',
      sortable: true,
      cell: (val) => <span className="capitalize">{val}</span>
    },
    {
      id: 'floor',
      header: 'Floor',
      accessorKey: 'floor',
      sortable: true,
      align: 'center',
    },
    {
      id: 'capacity',
      header: 'Capacity',
      accessorKey: 'capacity',
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
    }
  ];

  const buildingOptions = useMemo(() => {
    return buildings.map(b => ({ label: `${b.name} (${b.code})`, value: b.id }));
  }, [buildings]);

  // Entity Fields
  const fields: EntityField<Room>[] = [
    { 
      key: 'building_id', 
      label: 'Building', 
      type: 'select', 
      required: true,
      options: buildingOptions
    },
    { key: 'room_number', label: 'Room Number', type: 'text', required: true, placeholder: 'e.g., 101, A-304' },
    { 
      key: 'room_type', 
      label: 'Room Type', 
      type: 'select', 
      required: true,
      defaultValue: 'classroom',
      options: [
        { label: 'Classroom', value: 'classroom' },
        { label: 'Laboratory', value: 'laboratory' },
        { label: 'Hostel Room', value: 'hostel_room' },
        { label: 'Staff Room', value: 'staff_room' },
        { label: 'Auditorium', value: 'auditorium' },
        { label: 'Other', value: 'other' }
      ]
    },
    { key: 'floor', label: 'Floor Level', type: 'number', required: true, defaultValue: 0 },
    { key: 'capacity', label: 'Capacity (People)', type: 'number', required: true, defaultValue: 30 },
    { key: 'is_active', label: 'Is Active', type: 'switch', defaultValue: true },
  ];

  const handleSave = async (formData: Record<string, any>, item: Room | null) => {
    const payload = {
      building_id: formData.building_id,
      room_number: formData.room_number,
      room_type: formData.room_type,
      floor: Number(formData.floor),
      capacity: Number(formData.capacity),
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
        title="Rooms"
        description="Manage rooms, capacities, and layout data"
        actions={
          <div className="flex gap-2">
            <select
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
            >
              <option value="all">All Buildings</option>
              {buildingOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Button onClick={() => { setSelectedRoom(null); setDialogMode('create'); setIsDialogOpen(true); }} className="gap-1.5 shadow-xs whitespace-nowrap">
              <Plus className="h-4 w-4" />
              Add Room
            </Button>
          </div>
        }
      />

      <ProTable
        columns={columns}
        data={rooms}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        rowKey={(row) => row.id}
        onRowClick={(row) => {
          setSelectedRoom(row);
          setDialogMode('view');
          setIsDialogOpen(true);
        }}
        searchPlaceholder="Search rooms..."
        exportFileName="rooms"
      />

      <EntityViewEditDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        entityName="Room"
        data={selectedRoom}
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

export default RoomManagement;
