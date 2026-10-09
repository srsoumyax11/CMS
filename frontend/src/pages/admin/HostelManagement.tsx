import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hostelApi, type HostelData, type HostelRoomData } from '@/api/hostelApi';
import { adminApi } from '@/api/adminApi';
import { QUERY_KEYS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/error-utils';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn } from '@/components/shared/pro-table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Building2,
  Home,
  Users,
  CheckCircle2,
  UserPlus,
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
  Shield,
  Loader2,
  Bed,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

export function HostelManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('buildings');

  // Modal States
  const [isAddHostelOpen, setIsAddHostelOpen] = useState(false);
  const [hostelName, setHostelName] = useState('');
  const [wardenId, setWardenId] = useState('');
  const [capacity, setCapacity] = useState('100');

  // Edit Hostel Modal State
  const [editingHostel, setEditingHostel] = useState<HostelData | null>(null);
  const [editHostelName, setEditHostelName] = useState('');
  const [editWardenId, setEditWardenId] = useState('');
  const [editCapacity, setEditCapacity] = useState('100');
  const [editStatus, setEditStatus] = useState<boolean>(true);

  // Delete Hostel Confirmation State
  const [hostelToDelete, setHostelToDelete] = useState<HostelData | null>(null);

  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [selectedHostelId, setSelectedHostelId] = useState<string>('');
  const [roomNumber, setRoomNumber] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('2');

  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [allocStudentId, setAllocStudentId] = useState('');
  const [allocHostelId, setAllocHostelId] = useState('');
  const [allocRoomNo, setAllocRoomNo] = useState('');

  // 1. Queries
  const { data: hostelsRes, isLoading: loadingHostels, refetch: refetchHostels } = useQuery({
    queryKey: [QUERY_KEYS.HOSTELS],
    queryFn: () => hostelApi.listHostels(),
  });

  const hostels = Array.isArray(hostelsRes?.data?.items) ? hostelsRes.data.items : [];

  const { data: roomsRes, isLoading: loadingRooms, refetch: refetchRooms } = useQuery({
    queryKey: [QUERY_KEYS.HOSTEL_ROOMS, selectedHostelId],
    queryFn: () => hostelApi.listRooms(selectedHostelId),
    enabled: !!selectedHostelId,
  });

  const rooms = Array.isArray(roomsRes?.data?.items) ? roomsRes.data.items : [];

  const { data: usersRes } = useQuery({
    queryKey: [QUERY_KEYS.ADMIN_USERS],
    queryFn: () => adminApi.listUsers(),
  });

  const allUsers = Array.isArray(usersRes?.data) ? usersRes.data : [];
  const wardens = useMemo(() => allUsers.filter((u: any) => u.user_type === 'staff' || u.user_type === 'admin' || u.user_type === 'faculty'), [allUsers]);
  const students = useMemo(() => allUsers.filter((u: any) => u.user_type === 'student'), [allUsers]);

  const userMap = useMemo(() => {
    const map = new Map<string, any>();
    allUsers.forEach((u: any) => {
      if (u?.id) map.set(u.id, u);
    });
    return map;
  }, [allUsers]);

  // Set default hostel for rooms tab
  useMemo(() => {
    if (hostels.length > 0 && !selectedHostelId) {
      setSelectedHostelId(hostels[0].id);
    }
  }, [hostels, selectedHostelId]);

  // 2. Mutations
  const createHostelMutation = useMutation({
    mutationFn: (data: { name: string; warden_user_id?: string | null; capacity?: number }) =>
      hostelApi.createHostel(data),
    onSuccess: () => {
      toast.success('Hostel building created successfully');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.HOSTELS] });
      setIsAddHostelOpen(false);
      setHostelName('');
      setWardenId('');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to create hostel building'));
    },
  });

  const updateHostelMutation = useMutation({
    mutationFn: ({ hostelId, data }: { hostelId: string; data: Partial<HostelData> }) =>
      hostelApi.updateHostel(hostelId, data),
    onSuccess: () => {
      toast.success('Hostel building updated successfully');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.HOSTELS] });
      setEditingHostel(null);
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to update hostel building'));
    },
  });

  const deleteHostelMutation = useMutation({
    mutationFn: (hostelId: string) => hostelApi.deleteHostel(hostelId),
    onSuccess: () => {
      toast.success('Hostel building deleted successfully');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.HOSTELS] });
      setHostelToDelete(null);
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to delete hostel building'));
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: ({ hostelId, data }: { hostelId: string; data: { room_number: string; capacity?: number } }) =>
      hostelApi.createRoom(hostelId, data),
    onSuccess: () => {
      toast.success('Room added to hostel successfully');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.HOSTEL_ROOMS, selectedHostelId] });
      setIsAddRoomOpen(false);
      setRoomNumber('');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to add room'));
    },
  });

  const allocateMutation = useMutation({
    mutationFn: (payload: { student_user_id: string; hostel_id: string; room_number: string }) =>
      hostelApi.allocateRoom(payload),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Room allocated successfully');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.HOSTELS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.HOSTEL_ROOMS, allocHostelId] });
      setIsAllocateOpen(false);
      setAllocStudentId('');
      setAllocRoomNo('');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to allocate room'));
    },
  });

  const deallocateMutation = useMutation({
    mutationFn: (studentUserId: string) => hostelApi.deallocateRoom(studentUserId),
    onSuccess: () => {
      toast.info('Student room assignment vacated');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.HOSTELS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.HOSTEL_ROOMS] });
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to deallocate room'));
    },
  });

  const handleCreateHostel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostelName.trim()) return;
    createHostelMutation.mutate({
      name: hostelName.trim(),
      warden_user_id: wardenId || null,
      capacity: parseInt(capacity) || 100,
    });
  };

  const openEditHostel = (hostel: HostelData) => {
    setEditingHostel(hostel);
    setEditHostelName(hostel.name || '');
    setEditWardenId(hostel.warden_user_id || '');
    setEditCapacity(hostel.capacity ? String(hostel.capacity) : '100');
    setEditStatus(hostel.status);
  };

  const handleUpdateHostel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHostel || !editHostelName.trim()) return;
    updateHostelMutation.mutate({
      hostelId: editingHostel.id,
      data: {
        name: editHostelName.trim(),
        warden_user_id: editWardenId || null,
        capacity: parseInt(editCapacity) || 100,
        status: editStatus,
      },
    });
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHostelId || !roomNumber.trim()) return;
    createRoomMutation.mutate({
      hostelId: selectedHostelId,
      data: {
        room_number: roomNumber.trim(),
        capacity: parseInt(roomCapacity) || 2,
      },
    });
  };

  const handleAllocate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocStudentId || !allocHostelId || !allocRoomNo) {
      toast.error('Please select student, hostel building, and room number.');
      return;
    }
    allocateMutation.mutate({
      student_user_id: allocStudentId,
      hostel_id: allocHostelId,
      room_number: allocRoomNo,
    });
  };

  // 3. ProTable Columns for Hostel Buildings
  const hostelColumns: ProColumn<HostelData>[] = [
    {
      id: 'name',
      header: 'Hostel Building',
      accessorKey: 'name',
      cell: (val) => (
        <div className="flex items-center gap-2.5 py-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-foreground text-sm block">{String(val)}</span>
            <span className="text-xs text-muted-foreground">Residence Block</span>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'warden',
      header: 'Assigned Warden',
      cell: (_, row) => {
        const warden = row.warden_user_id ? userMap.get(row.warden_user_id) : null;
        if (!warden) {
          return <span className="text-xs text-muted-foreground italic">Unassigned</span>;
        }
        return (
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">{warden.name}</span>
          </div>
        );
      },
    },
    {
      id: 'capacity',
      header: 'Building Capacity',
      accessorKey: 'capacity',
      cell: (val) => (
        <Badge variant="outline" className="font-mono text-xs">
          {val ? `${val} Beds` : 'Unspecified'}
        </Badge>
      ),
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: (val) => (
        <Badge
          variant="outline"
          className={val ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-muted text-muted-foreground'}
        >
          {val ? 'Operational' : 'Maintenance'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (_, row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs gap-1.5 text-primary hover:bg-primary/10"
            onClick={() => {
              setSelectedHostelId(row.id);
              setActiveTab('rooms');
            }}
          >
            <Bed className="w-3.5 h-3.5" /> Rooms
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => openEditHostel(row)}
            title="Edit Building Details"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => setHostelToDelete(row)}
            title="Delete Hostel Building"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
      align: 'right',
      width: '180px',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchHostels();
                if (selectedHostelId) refetchRooms();
              }}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setIsAddHostelOpen(true)} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Add Hostel Building
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="buildings" className="gap-2">
            <Building2 className="w-4 h-4" /> Buildings ({hostels.length})
          </TabsTrigger>
          <TabsTrigger value="rooms" className="gap-2">
            <Bed className="w-4 h-4" /> Rooms & Occupancy
          </TabsTrigger>
          <TabsTrigger value="allocate" className="gap-2">
            <UserPlus className="w-4 h-4" /> Room Allocation
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: HOSTEL BUILDINGS */}
        <TabsContent value="buildings" className="space-y-6">
          <ProTable
            data={hostels}
            columns={hostelColumns}
            isLoading={loadingHostels}
            rowKey={(row) => row.id}
            searchPlaceholder="Search hostel buildings..."
            emptyTitle="No Hostel Buildings Registered"
            emptyDescription="Create your first hostel building to manage room allocations."
          />
        </TabsContent>

        {/* TAB 2: ROOMS & OCCUPANCY MATRIX */}
        <TabsContent value="rooms" className="space-y-6">
          <Card className="shadow-card border-border bg-card">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold">Room Occupancy Matrix</CardTitle>
                <CardDescription>Inspect rooms and current bed occupancy for selected building.</CardDescription>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Select value={selectedHostelId} onValueChange={setSelectedHostelId}>
                  <SelectTrigger className="w-full sm:w-[220px] h-9 text-xs">
                    <SelectValue placeholder="Select Hostel Building" />
                  </SelectTrigger>
                  <SelectContent>
                    {hostels.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  onClick={() => setIsAddRoomOpen(true)}
                  disabled={!selectedHostelId}
                  className="gap-1.5 text-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Room
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {!selectedHostelId ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Please select a hostel building above to view room occupancy.
                </div>
              ) : loadingRooms ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : rooms.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No rooms created in this building yet. Click &quot;Add Room&quot; to create rooms.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {rooms.map((room) => {
                    const isFull = room.current_occupancy >= room.capacity;
                    const isEmpty = room.current_occupancy === 0;

                    return (
                      <Card key={room.id} className="border border-border/80 bg-background/50 hover:bg-background transition-all shadow-2xs">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Bed className="w-4 h-4 text-primary" />
                              <span className="font-bold text-sm font-mono">Room {room.room_number}</span>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                isFull
                                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]'
                                  : isEmpty
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]'
                                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]'
                              }
                            >
                              {isFull ? 'Full' : isEmpty ? 'Vacant' : 'Partial'}
                            </Badge>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Occupancy</span>
                              <span className="font-semibold text-foreground">
                                {room.current_occupancy} / {room.capacity} Beds
                              </span>
                            </div>
                            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isFull ? 'bg-rose-500' : isEmpty ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${Math.min(100, (room.current_occupancy / room.capacity) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: ROOM ALLOCATION */}
        <TabsContent value="allocate" className="space-y-6">
          <Card className="max-w-xl mx-auto shadow-card border-border">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" /> Allocate Student to Room
              </CardTitle>
              <CardDescription>Assign or transfer a student to a specific hostel room.</CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleAllocate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Select Student *</Label>
                  <Select value={allocStudentId} onValueChange={setAllocStudentId}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Search student..." />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.email}) {s.registration_no ? `- Reg: ${s.registration_no}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Select Hostel Building *</Label>
                  <Select value={allocHostelId} onValueChange={setAllocHostelId}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Select hostel..." />
                    </SelectTrigger>
                    <SelectContent>
                      {hostels.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Room Number *</Label>
                  <Input
                    placeholder="e.g. 101, 102"
                    value={allocRoomNo}
                    onChange={(e) => setAllocRoomNo(e.target.value)}
                    required
                    className="h-10 text-sm"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button type="submit" disabled={allocateMutation.isPending} className="gap-2 px-6">
                    {allocateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Allocate Room
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: ADD HOSTEL BUILDING */}
      <Dialog open={isAddHostelOpen} onOpenChange={setIsAddHostelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Create Hostel Building
            </DialogTitle>
            <DialogDescription>Register a new hostel block for student accommodation.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateHostel} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Building Name *</Label>
              <Input
                placeholder="e.g. Boys Hostel Block A or Gargi Hall"
                value={hostelName}
                onChange={(e) => setHostelName(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Assigned Warden</Label>
              <Select value={wardenId} onValueChange={setWardenId}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select warden user..." />
                </SelectTrigger>
                <SelectContent>
                  {wardens.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Total Bed Capacity</Label>
              <Input
                type="number"
                placeholder="100"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddHostelOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createHostelMutation.isPending} className="gap-2">
                {createHostelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save Hostel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: EDIT HOSTEL BUILDING */}
      <Dialog open={!!editingHostel} onOpenChange={(open) => !open && setEditingHostel(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" /> Edit Hostel Building
            </DialogTitle>
            <DialogDescription>Update details for {editingHostel?.name}.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateHostel} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Building Name *</Label>
              <Input
                placeholder="Building Name"
                value={editHostelName}
                onChange={(e) => setEditHostelName(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Assigned Warden</Label>
              <Select value={editWardenId} onValueChange={setEditWardenId}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select warden user..." />
                </SelectTrigger>
                <SelectContent>
                  {wardens.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} ({w.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Total Bed Capacity</Label>
              <Input
                type="number"
                value={editCapacity}
                onChange={(e) => setEditCapacity(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Operational Status</Label>
              <Select value={editStatus ? 'operational' : 'maintenance'} onValueChange={(val) => setEditStatus(val === 'operational')}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingHostel(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={updateHostelMutation.isPending} className="gap-2">
                {updateHostelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Building'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: DELETE HOSTEL CONFIRMATION */}
      <Dialog open={!!hostelToDelete} onOpenChange={(open) => !open && setHostelToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" /> Delete Hostel Building
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong className="text-foreground">{hostelToDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs text-destructive space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Side Effect Warning:
            </p>
            <p className="leading-relaxed">
              This action will remove the hostel building and its rooms. If any students are currently residing in this building, deletion will be blocked until students are reallocated.
            </p>
          </div>

          <DialogFooter className="pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setHostelToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteHostelMutation.isPending}
              onClick={() => hostelToDelete && deleteHostelMutation.mutate(hostelToDelete.id)}
              className="gap-2"
            >
              {deleteHostelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete Building
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ADD ROOM TO HOSTEL */}
      <Dialog open={isAddRoomOpen} onOpenChange={setIsAddRoomOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bed className="w-5 h-5 text-primary" /> Add Room to Hostel
            </DialogTitle>
            <DialogDescription>Define a room number and bed capacity.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRoom} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Room Number *</Label>
              <Input
                placeholder="e.g. 101, 102, 201"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Bed Capacity *</Label>
              <Select value={roomCapacity} onValueChange={setRoomCapacity}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select bed capacity..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Bed (Single Occupancy)</SelectItem>
                  <SelectItem value="2">2 Beds (Double Occupancy)</SelectItem>
                  <SelectItem value="3">3 Beds (Triple Occupancy)</SelectItem>
                  <SelectItem value="4">4 Beds (Quad Occupancy)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddRoomOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createRoomMutation.isPending} className="gap-2">
                {createRoomMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save Room
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HostelManagement;
