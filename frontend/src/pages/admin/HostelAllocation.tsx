import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { getErrorMessage } from '@/lib/error-utils';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn } from '@/components/shared/pro-table';
import { EntityViewEditDialog, type EntityField } from '@/components/shared/entity-dialog';
import { Button } from '@/components/ui/button';
import { Plus, Home, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import type { HostelAllocation, StudentItemResponse } from '@/types/api';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const AllocationStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'active': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">Active</Badge>;
    case 'vacated': return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Vacated</Badge>;
    default: return <Badge variant="outline" className="capitalize">{status}</Badge>;
  }
};

export function HostelAllocation() {
  const queryClient = useQueryClient();
  const [selectedAllocation, setSelectedAllocation] = useState<HostelAllocation | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch data
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['hostel_allocations'],
    queryFn: () => adminApi.listHostelAllocations(),
  });
  const allocations = response?.data?.data || [];

  // Fetch students
  const { data: studentsRes } = useQuery({
    queryKey: ['students'],
    queryFn: () => adminApi.listStudents(),
  });
  const students = studentsRes?.data?.data || [];

  // Fetch buildings and rooms for dropdowns
  const { data: buildingsRes } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => adminApi.listBuildings(),
  });
  const buildings = buildingsRes?.data?.data || [];

  const { data: roomsRes } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => adminApi.listRooms(),
  });
  const rooms = roomsRes?.data?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createHostelAllocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel_allocations'] });
      toast.success('Room allocated successfully');
      setIsDialogOpen(false);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to allocate room')),
  });

  const vacateMutation = useMutation({
    mutationFn: (id: string) => adminApi.vacateHostelRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel_allocations'] });
      toast.success('Room marked as vacated');
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to vacate room')),
  });

  // Table Columns
  const columns: ProColumn<HostelAllocation>[] = [
    {
      id: 'student',
      header: 'Student',
      accessorKey: 'student_id',
      cell: (val, row) => {
        const st = students.find((s: StudentItemResponse) => s.id === val);
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Home className="h-4 w-4" />
            </div>
            <div>
              <span className="font-semibold text-foreground">{row.student_name || st?.name || 'Unknown'}</span>
              <p className="text-xs text-muted-foreground font-mono">{st?.user_id || val.substring(0, 8) + '...'}</p>
            </div>
          </div>
        );
      },
      sortable: true,
    },
    {
      id: 'room',
      header: 'Room',
      accessorKey: 'room_id',
      cell: (val, row) => {
        const room = rooms.find(r => r.id === val);
        const bldg = buildings.find(b => b.id === room?.building_id);
        return (
          <div className="flex flex-col">
            <span className="font-semibold">{row.room_number || room?.room_number || 'Unknown'}</span>
            <span className="text-xs text-muted-foreground">{row.building_name || bldg?.name || 'Unknown'}</span>
          </div>
        );
      },
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: (val) => <AllocationStatusBadge status={val} />,
      sortable: true,
    },
    {
      id: 'allocated_at',
      header: 'Allocated At',
      accessorKey: 'created_at',
      cell: (val) => <span className="text-sm font-medium">{format(new Date(val), 'MMM d, yyyy')}</span>,
      sortable: true,
    },
    {
      id: 'actions',
      header: '',
      accessorKey: 'id',
      cell: (val, row) => (
        <div className="flex justify-end pr-2" onClick={(e) => e.stopPropagation()}>
          {row.status === 'active' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => vacateMutation.mutate(row.id)}
              disabled={vacateMutation.isPending}
              className="h-7 text-xs"
            >
              <LogOut className="h-3 w-3 mr-1.5" /> Vacate
            </Button>
          )}
        </div>
      ),
      width: '100px',
    }
  ];

  const hostelBuildings = useMemo(() => buildings.filter(b => b.building_type === 'hostel'), [buildings]);
  const hostelRooms = useMemo(() => rooms.filter(r => hostelBuildings.some(b => b.id === r.building_id)), [rooms, hostelBuildings]);

  // Entity Fields
  const fields: EntityField<HostelAllocation>[] = [
    { 
      key: 'student_id', 
      label: 'Student', 
      type: 'select', 
      required: true,
      options: students.map((s: StudentItemResponse) => ({ label: `${s.name} (${s.user_id || s.email})`, value: s.id }))
    },
    { 
      key: 'room_id', 
      label: 'Room', 
      type: 'select', 
      required: true,
      options: hostelRooms.map(r => {
        const bldg = buildings.find(b => b.id === r.building_id);
        return { label: `${bldg?.name || 'Unknown'} - ${r.room_number}`, value: r.id };
      })
    },
  ];

  const handleSave = async (formData: Record<string, any>, item: HostelAllocation | null) => {
    if (!item) {
      await createMutation.mutateAsync({
        student_id: formData.student_id,
        room_id: formData.room_id,
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hostel Allocations"
        description="Allocate rooms to students and manage hostel capacities"
        actions={
          <Button onClick={() => { setSelectedAllocation(null); setDialogMode('create'); setIsDialogOpen(true); }} className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            Allocate Room
          </Button>
        }
      />

      <ProTable
        columns={columns}
        data={allocations}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        rowKey={(row) => row.id}
        searchPlaceholder="Search allocations..."
        exportFileName="hostel-allocations"
      />

      <EntityViewEditDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        entityName="Hostel Allocation"
        data={selectedAllocation}
        fields={fields}
        initialMode={dialogMode}
        onSave={handleSave}
        isSaving={createMutation.isPending}
        canEdit={false}
      />
    </div>
  );
}

export default HostelAllocation;
