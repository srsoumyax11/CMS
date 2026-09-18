import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { QUERY_KEYS } from '@/lib/constants';
import { DataTable } from '@/components/shared/DataTable';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Users, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { FacultyItemResponse, FacultyCreateRequest } from '@/types/api';

export function FacultyManagement() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<FacultyItemResponse | null>(null);
  const [showDetails, setShowDetails] = useState<FacultyItemResponse | null>(null);

  const [form, setForm] = useState<Omit<FacultyCreateRequest, 'user_id'>>({
    email: '',
    password: '',
    name: '',
    department: '',
    designation: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    department: '',
    designation: '',
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.FACULTY],
    queryFn: () => adminApi.listFaculty(),
  });

  const faculty: FacultyItemResponse[] = data?.data?.data ?? [];

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
      key: 'actions',
      header: '',
      render: (row: FacultyItemResponse) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            setEditForm({ name: row.name, department: row.department, designation: row.designation });
            setShowEdit(row);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (error) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Faculty Management</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage faculty accounts
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Faculty
        </Button>
      </div>

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
                <div className="space-y-1">
                  <p className="text-muted-foreground">Status</p>
                  <div className="flex items-center">
                    <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2" />
                    <span className="font-medium text-foreground capitalize">
                      {showDetails.is_active ? 'Active' : 'Inactive'}
                    </span>
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
