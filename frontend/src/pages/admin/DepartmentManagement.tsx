import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Edit2, Plus, Trash2, Loader2, Building2 } from 'lucide-react';
import type { Department, DepartmentCreateRequest, DepartmentUpdateRequest } from '@/types/api';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Badge } from '@/components/ui/badge';

export function DepartmentManagement() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Department | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    department_type: 'academic' | 'administrative';
    is_active: boolean;
    hod_user_id: string | null;
  }>({
    name: '',
    code: '',
    department_type: 'academic',
    is_active: true,
    hod_user_id: null,
  });

  const [pendingUpdate, setPendingUpdate] = useState<{ id: string; data: DepartmentUpdateRequest } | null>(null);

  const { data: facultyRes } = useQuery({
    queryKey: ['admin_faculty'],
    queryFn: () => adminApi.listFaculty(),
  });
  const facultyList = facultyRes?.data?.data || [];

  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['departments'],
    queryFn: () => adminApi.listDepartments(),
  });

  const createMutation = useMutation({
    mutationFn: (data: DepartmentCreateRequest) => adminApi.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['metadata', 'departments'] });
      toast.success('Department created successfully');
      setShowCreate(false);
      setFormData({ name: '', code: '', department_type: 'academic', is_active: true, hod_user_id: null });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create department');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DepartmentUpdateRequest }) =>
      adminApi.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['metadata', 'departments'] });
      toast.success('Department updated successfully');
      setShowEdit(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update department');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['metadata', 'departments'] });
      toast.success('Department deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete department. It may be in use.');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;

    const data: DepartmentUpdateRequest = {
      name: formData.name,
      code: formData.code,
      department_type: formData.department_type,
      is_active: formData.is_active,
      hod_user_id: formData.hod_user_id,
    };

    // If changing an existing HOD to a new person (or removing them), ask for confirmation
    if (showEdit.hod_user_id && showEdit.hod_user_id !== formData.hod_user_id) {
       setPendingUpdate({ id: showEdit.id, data });
    } else {
       updateMutation.mutate({ id: showEdit.id, data });
    }
  };

  const confirmUpdate = () => {
    if (pendingUpdate) {
      updateMutation.mutate(pendingUpdate);
      setPendingUpdate(null);
    }
  };

  const openEdit = (dept: Department) => {
    setFormData({ 
      name: dept.name, 
      code: dept.code, 
      department_type: dept.department_type || 'academic',
      is_active: dept.is_active,
      hod_user_id: dept.hod_user_id || null
    });
    setShowEdit(dept);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState title="Failed to load departments" description={error?.message} onRetry={refetch} />;
  }

  const departments = response?.data?.data || [];
  const academicDepts = departments.filter((d: Department) => d.department_type === 'academic');
  const adminDepts = departments.filter((d: Department) => d.department_type === 'administrative');

  const renderTable = (depts: Department[], type: string) => (
    <div className="border rounded-md bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {depts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24">
                <EmptyState 
                  icon={<Building2 className="h-6 w-6" />}
                  title={`No ${type} departments found`}
                  description="Get started by creating a new department."
                />
              </TableCell>
            </TableRow>
          ) : (
            depts.map((dept) => (
              <TableRow key={dept.id}>
                <TableCell className="font-medium">{dept.name}</TableCell>
                <TableCell>{dept.code}</TableCell>
                <TableCell>
                  <Badge variant={dept.is_active ? 'default' : 'secondary'}>
                    {dept.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(dept)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${dept.name}?`)) {
                        deleteMutation.mutate(dept.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground mt-1">Manage academic and administrative departments</p>
        </div>
      </div>

      <Tabs defaultValue="academic" className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="academic">Academic Departments</TabsTrigger>
            <TabsTrigger value="administrative">Administrative Departments</TabsTrigger>
          </TabsList>

          <Button onClick={() => {
            setFormData({ name: '', code: '', department_type: 'academic', is_active: true, hod_user_id: null });
            setShowCreate(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        </div>

        <TabsContent value="academic" className="space-y-4">
          {renderTable(academicDepts, 'academic')}
        </TabsContent>

        <TabsContent value="administrative" className="space-y-4">
          {renderTable(adminDepts, 'administrative')}
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate || !!showEdit} onOpenChange={(open) => {
        if (!open) {
          setShowCreate(false);
          setShowEdit(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{showEdit ? 'Edit Department' : 'Create Department'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={showEdit ? handleUpdate : handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Computer Science"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. CSE"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Department Type</Label>
              <Select
                value={formData.department_type}
                onValueChange={(val: 'academic' | 'administrative') => setFormData({ ...formData, department_type: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic">Academic Department</SelectItem>
                  <SelectItem value="administrative">Administrative Department</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Head of Department</Label>
              <Select
                value={formData.hod_user_id || 'none'}
                onValueChange={(val) => setFormData({ ...formData, hod_user_id: val === 'none' ? null : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select HOD" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {facultyList.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name} ({f.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
              />
              <Label htmlFor="is_active">Active Status</Label>
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => {
                setShowCreate(false);
                setShowEdit(null);
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {showEdit ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!pendingUpdate} onOpenChange={(open) => !open && setPendingUpdate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Head of Department?</AlertDialogTitle>
            <AlertDialogDescription>
              This department already has an assigned Head of Department. 
              Assigning a new person will automatically remove the "HOD" role from the current head and assign it to the new one. 
              Are you sure you want to proceed with this replacement?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUpdate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Replacement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
