import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { QUERY_KEYS } from '@/lib/constants';
import { DataTable } from '@/components/shared/DataTable';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Users, Loader2, Pencil, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { FacultyItemResponse, FacultyCreateRequest, AccountStatus, EmploymentStatus, AdminItemResponse } from '@/types/api';

const accountStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  revision: { label: 'Revision', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  suspended: { label: 'Suspended', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
};

const employmentStatusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  on_leave: { label: 'On Leave', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  resigned: { label: 'Resigned', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  retired: { label: 'Retired', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  terminated: { label: 'Terminated', className: 'bg-red-100 text-red-700 border-red-200' },
};

export function FacultyManagement() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<FacultyItemResponse | null>(null);
  const [showDetails, setShowDetails] = useState<FacultyItemResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const [form, setForm] = useState<Omit<FacultyCreateRequest, 'user_id'>>({
    email: '',
    password: '',
    name: '',
    department: '',
    designation: '',
  });
  
  const [editForm, setEditForm] = useState<{
    name: string;
    department: string;
    designation: string;
    account_status: AccountStatus;
    employment_status: EmploymentStatus;
  }>({
    name: '',
    department: '',
    designation: '',
    account_status: 'active',
    employment_status: 'active',
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.FACULTY, statusFilter],
    queryFn: () => adminApi.listFaculty({ status: statusFilter as AccountStatus}),
  });

  const faculty: FacultyItemResponse[] = data?.data?.data ?? [];

  const { data: adminsData, isLoading: adminsLoading, error: adminsError, refetch: refetchAdmins } = useQuery({
    queryKey: [QUERY_KEYS.ADMINS, statusFilter],
    queryFn: () => adminApi.listAdmins({ status: statusFilter as AccountStatus}),
  });

  const admins: AdminItemResponse[] = adminsData?.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: FacultyCreateRequest) => adminApi.createFaculty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FACULTY] });
      toast.success('Faculty member created');
      setShowCreate(false);
      setForm({ email: '', password: '', name: '', department: '', designation: '' });
    },
    onError: () => toast.error('Failed to create faculty member'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof editForm }) =>
      adminApi.updateFaculty(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FACULTY] });
      toast.success('Faculty member updated');
      setShowEdit(null);
    },
    onError: () => toast.error('Failed to update faculty member'),
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: FacultyItemResponse) => (
        <span className="font-medium text-foreground">{row.name}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row: FacultyItemResponse) => (
        <span className="text-sm text-muted-foreground">{row.email}</span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (row: FacultyItemResponse) => row.department,
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (row: FacultyItemResponse) => row.designation,
    },
    {
      key: 'account_status',
      header: 'Account',
      render: (row: FacultyItemResponse) => {
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
      key: 'employment_status',
      header: 'Employment',
      render: (row: FacultyItemResponse) => {
        const config = employmentStatusConfig[row.employment_status] ?? {
          label: row.employment_status,
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
      header: '',
      render: (row: FacultyItemResponse) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            setEditForm({ 
              name: row.name, 
              department: row.department, 
              designation: row.designation, 
              account_status: row.account_status,
              employment_status: row.employment_status
            });
            setShowEdit(row);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    }
  ];

  const adminColumns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: AdminItemResponse) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{row.name || 'Unassigned'}</span>
          <span className="text-xs text-muted-foreground">{row.email}</span>
        </div>
      ),
    },
    {
      key: 'user_id',
      header: 'Admin ID',
      render: (row: AdminItemResponse) => (
        <span className="text-sm text-muted-foreground">{row.user_id}</span>
      ),
    },
    {
      key: 'account_status',
      header: 'Account Status',
      render: (row: AdminItemResponse) => {
        const config = accountStatusConfig[row.account_status];
        return (
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
        );
      },
    },
  ];

  if (error || adminsError) {
    return <ErrorState onRetry={() => { refetch(); refetchAdmins(); }} />;
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
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Faculty
        </Button>
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

      <Tabs defaultValue="faculty" className="w-full mt-2">
        <TabsList className="mb-4">
          <TabsTrigger value="faculty">Faculty Directory</TabsTrigger>
          <TabsTrigger value="admins">Administrators</TabsTrigger>
        </TabsList>

        <TabsContent value="faculty">
          <DataTable
            columns={columns}
            data={faculty}
            isLoading={isLoading}
            rowKey={(row) => row.id}
            onRowClick={(row) => setShowDetails(row)}
            emptyTitle="No faculty members"
            emptyDescription="There are no faculty accounts yet."
            emptyIcon={<Users className="h-6 w-6" />}
          />
        </TabsContent>

        <TabsContent value="admins">
          <DataTable
            columns={adminColumns}
            data={admins}
            isLoading={adminsLoading}
            rowKey={(row) => row.id}
            emptyTitle="No administrators found"
            emptyDescription="There are no admin accounts registered."
            emptyIcon={<ShieldAlert className="h-6 w-6" />}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Faculty Account</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate(form);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="f-name">Full Name</Label>
              <Input
                id="f-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="f-email">Email</Label>
              <Input
                id="f-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-password">Password</Label>
              <Input
                id="f-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="f-dept">Department</Label>
                <Input
                  id="f-dept"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-desig">Designation</Label>
                <Input
                  id="f-desig"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showEdit} onOpenChange={(open) => !open && setShowEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Faculty</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (showEdit) editMutation.mutate({ id: showEdit.id, data: editForm });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="e-name">Full Name</Label>
              <Input
                id="e-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-dept">Department</Label>
                <Input
                  id="e-dept"
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-desig">Designation</Label>
                <Input
                  id="e-desig"
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Status</Label>
                <Select
                  value={editForm.account_status}
                  onValueChange={(value) => setEditForm({ ...editForm, account_status: value as AccountStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="revision">Revision</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employment Status</Label>
                <Select
                  value={editForm.employment_status}
                  onValueChange={(value) => setEditForm({ ...editForm, employment_status: value as EmploymentStatus })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="resigned">Resigned</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editMutation.isPending}>
                {editMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showDetails} onOpenChange={(open) => !open && setShowDetails(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Faculty Details</DialogTitle>
          </DialogHeader>
          {showDetails && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 border-b pb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                  {showDetails.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{showDetails.name}</h3>
                  <p className="text-sm text-muted-foreground">{showDetails.designation}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Department</p>
                  <p className="font-medium text-foreground">{showDetails.department}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Email Address</p>
                  <p className="font-medium text-foreground truncate" title={showDetails.email}>
                    {showDetails.email}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">User ID</p>
                  <p className="font-medium text-foreground">{showDetails.user_id}</p>
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
                  <p className="text-muted-foreground">Employment Status</p>
                  <div className="mt-1">
                    <Badge variant="outline" className={employmentStatusConfig[showDetails.employment_status]?.className}>
                      {employmentStatusConfig[showDetails.employment_status]?.label || showDetails.employment_status}
                    </Badge>
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
