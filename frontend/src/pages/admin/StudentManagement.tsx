import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { metadataApi } from '@/api/metadataApi';
import { QUERY_KEYS } from '@/lib/constants';
import { DataTable } from '@/components/shared/DataTable';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Check, X, Users, MoreVertical, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import type { StudentItemResponse, AccountStatus, AcademicStatus, Course } from '@/types/api';

const accountStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  revision: { label: 'Revision', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  suspended: { label: 'Suspended', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
};

const academicStatusConfig: Record<string, { label: string; className: string }> = {
  enrolled: { label: 'Enrolled', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  graduated: { label: 'Graduated', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  dropped: { label: 'Dropped', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  expelled: { label: 'Expelled', className: 'bg-red-100 text-red-700 border-red-200' },
};

export function StudentManagement() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [showDetails, setShowDetails] = useState<StudentItemResponse | null>(null);
  
  const [updateAction, setUpdateAction] = useState<{
    id: string;
    payload: { account_status?: AccountStatus; academic_status?: AcademicStatus; status_note?: string };
    label: string;
  } | null>(null);
  const [statusNote, setStatusNote] = useState('');
  
  const [editAction, setEditAction] = useState<{
    id: string;
    payload: { name: string; course_id: string; branch_id: string; year: number; hostel: string };
  } | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.STUDENTS, statusFilter],
    queryFn: () => adminApi.listStudents({ status: statusFilter as AccountStatus }),
  });

  const { data: coursesResponse } = useQuery({
    queryKey: [QUERY_KEYS.COURSES],
    queryFn: () => metadataApi.getCourses(),
  });

  const courses: Course[] = coursesResponse?.data?.data ?? [];
  const selectedCourse = courses.find((c) => c.id === editAction?.payload.course_id);
  const branches = selectedCourse?.branches ?? [];

  const students: StudentItemResponse[] = data?.data?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      adminApi.updateStudentStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENTS] });
      toast.success('Student status updated');
      setUpdateAction(null);
    },
    onError: () => toast.error('Failed to update student status'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      adminApi.updateStudentDetails(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENTS] });
      toast.success('Student details updated');
      setEditAction(null);
    },
    onError: () => toast.error('Failed to update student details'),
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: StudentItemResponse) => (
        <span className="font-medium text-foreground">{row.name}</span>
      ),
    },
    {
      key: 'user_id',
      header: 'Reg No.',
      render: (row: StudentItemResponse) => (
        <span className="text-sm font-medium">{row.user_id || 'N/A'}</span>
      ),
    },
    {
      key: 'course',
      header: 'Course',
      render: (row: StudentItemResponse) => (
        <span className="text-sm text-foreground">
          {row.course_name} · {row.branch_name} ({row.year})
        </span>
      ),
    },
    {
      key: 'account_status',
      header: 'Account',
      render: (row: StudentItemResponse) => {
        const config = accountStatusConfig[row.account_status] ?? {
          label: row.account_status,
          className: 'bg-gray-100 text-gray-600 border-gray-200',
        };
        return (
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'academic_status',
      header: 'Academic',
      render: (row: StudentItemResponse) => {
        if (!row.academic_status) {
          return (
            <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
              Incomplete
            </Badge>
          );
        }
        const config = academicStatusConfig[row.academic_status] ?? {
          label: row.academic_status,
          className: 'bg-gray-100 text-gray-600 border-gray-200',
        };
        return (
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: StudentItemResponse) => {
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {row.account_status === 'pending' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                  title="Approve"
                  onClick={() => setUpdateAction({ 
                    id: row.id, 
                    payload: { account_status: 'active' },
                    label: 'approve account'
                  })}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                  title="Reject"
                  onClick={() => setUpdateAction({ 
                    id: row.id, 
                    payload: { account_status: 'rejected' },
                    label: 'reject account'
                  })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Edit Profile"
              onClick={() => setEditAction({
                id: row.id,
                payload: {
                  name: row.name,
                  course_id: row.course_id || '',
                  branch_id: row.branch_id || '',
                  year: row.year,
                  hostel: row.hostel || ''
                }
              })}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account Status</DropdownMenuLabel>
                {['active', 'suspended', 'revision', 'rejected'].map((status) => (
                  <DropdownMenuItem 
                    key={`acc-${status}`}
                    disabled={row.account_status === status}
                    onClick={() => setUpdateAction({ 
                      id: row.id, 
                      payload: { account_status: status as AccountStatus },
                      label: `mark account as ${status}`
                    })}
                    className="capitalize"
                  >
                    Mark as {status}
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Academic Status</DropdownMenuLabel>
                {['enrolled', 'graduated', 'dropped', 'expelled'].map((status) => (
                  <DropdownMenuItem 
                    key={`acad-${status}`}
                    disabled={row.academic_status === status}
                    onClick={() => setUpdateAction({ 
                      id: row.id, 
                      payload: { academic_status: status as AcademicStatus },
                      label: `mark academic standing as ${status}`
                    })}
                    className="capitalize"
                  >
                    Mark as {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  if (error) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Student Management</h2>
        <p className="text-sm text-muted-foreground">
          Manage student accounts and academic lifecycles
        </p>
      </div>

      <Tabs value={statusFilter ?? 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="suspended">Suspended</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={students}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => setShowDetails(row)}
        emptyTitle="No students found"
        emptyDescription="There are no students matching this filter."
        emptyIcon={<Users className="h-6 w-6" />}
      />

      <Dialog open={!!updateAction} onOpenChange={(open) => {
        if (!open) {
          setUpdateAction(null);
          setStatusNote('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{updateAction ? `Confirm Update` : 'Confirm Action'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {updateAction ? `Are you sure you want to ${updateAction.label}?` : ''}
            </p>
            {updateAction && ['revision', 'suspended', 'rejected'].includes(updateAction.payload.account_status ?? '') && (
              <div className="space-y-2">
                <Label htmlFor="status_note">Reason / Note (Optional)</Label>
                <Textarea
                  id="status_note"
                  placeholder="Provide a reason for this status change..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setUpdateAction(null);
              setStatusNote('');
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (updateAction) {
                updateMutation.mutate({ 
                  id: updateAction.id, 
                  payload: { ...updateAction.payload, status_note: statusNote || undefined } 
                });
              }
            }}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editAction} onOpenChange={(open) => !open && setEditAction(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Student Profile</DialogTitle>
          </DialogHeader>
          {editAction && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={editAction.payload.name}
                  onChange={(e) => setEditAction({ ...editAction, payload: { ...editAction.payload, name: e.target.value } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Course</Label>
                <Select
                  value={editAction.payload.course_id}
                  onValueChange={(val) => setEditAction({ ...editAction, payload: { ...editAction.payload, course_id: val, branch_id: '' } })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select
                  value={editAction.payload.branch_id}
                  onValueChange={(val) => setEditAction({ ...editAction, payload: { ...editAction.payload, branch_id: val } })}
                  disabled={!editAction.payload.course_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select
                    value={String(editAction.payload.year)}
                    onValueChange={(val) => setEditAction({ ...editAction, payload: { ...editAction.payload, year: parseInt(val) } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((y) => (
                        <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hostel">Hostel (Optional)</Label>
                  <Input
                    id="hostel"
                    value={editAction.payload.hostel}
                    onChange={(e) => setEditAction({ ...editAction, payload: { ...editAction.payload, hostel: e.target.value } })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAction(null)}>Cancel</Button>
            <Button onClick={() => {
              if (editAction) {
                editMutation.mutate({ id: editAction.id, payload: editAction.payload });
              }
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDetails} onOpenChange={(open) => !open && setShowDetails(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {showDetails && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 border-b pb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                  {showDetails.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{showDetails.name}</h3>
                  <p className="text-sm text-muted-foreground">{showDetails.course_name} · {showDetails.branch_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Registration No.</p>
                  <p className="font-medium text-foreground">{showDetails.user_id || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Email Address</p>
                  <p className="font-medium text-foreground truncate" title={showDetails.email}>
                    {showDetails.email}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Batch/Year</p>
                  <p className="font-medium text-foreground">{showDetails.year}</p>
                </div>
                <div className="space-y-1"></div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Account Status</p>
                  <div className="mt-1">
                    <Badge variant="outline" className={accountStatusConfig[showDetails.account_status]?.className}>
                      {accountStatusConfig[showDetails.account_status]?.label || showDetails.account_status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Academic Status</p>
                  <div className="mt-1">
                    {showDetails.academic_status ? (
                      <Badge variant="outline" className={academicStatusConfig[showDetails.academic_status]?.className}>
                        {academicStatusConfig[showDetails.academic_status]?.label || showDetails.academic_status}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
                        Incomplete
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
