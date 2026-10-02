import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/authApi';
import { adminApi } from '@/api/adminApi';
import { useMetadata } from '@/hooks/useMetadata';
import { QUERY_KEYS } from '@/lib/constants';
import { DataTable } from '@/components/shared/DataTable';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Users, Loader2, Pencil, ShieldAlert, Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { FacultyItemResponse, FacultyCreateRequest, AccountStatus, EmploymentStatus, AdminItemResponse } from '@/types/api';
import { PasswordRequirements } from '@/components/shared/PasswordRequirements';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PermissionGuard } from '@/components/auth/PermissionGuard';


export function FacultyManagement() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<FacultyItemResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDetails, setShowDetails] = useState<FacultyItemResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [roleTab, setRoleTab] = useState<string>('faculty');

  const [form, setForm] = useState<Omit<FacultyCreateRequest, 'user_id'>>({
    email: '',
    password: '',
    name: '',
    course_id: '',
    department_id: '',
    designation: '',
    role_id: undefined,
  });
  const [formErrors, setFormErrors] = useState<{ course?: boolean; dept?: boolean }>({});
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  useEffect(() => {
    if (!form.email) {
      setEmailError(null);
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setEmailError("Invalid email format");
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsCheckingEmail(true);
      try {
        const response = await authApi.checkEmail(form.email);
        if (!response.data.data) {
          setEmailError("Email is already registered");
        } else {
          setEmailError(null);
        }
      } catch (err) {
        setEmailError("Failed to verify email");
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [form.email]);
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    user_id: string;
    photo_url: string;
    department_id: string;
    designation: string;
    account_status: AccountStatus;
    employment_status: EmploymentStatus;
  }>({
    name: '',
    email: '',
    user_id: '',
    photo_url: '',
    department_id: '',
    designation: '',
    account_status: 'active',
    employment_status: 'active',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !showEdit) return;
    try {
      setIsUploadingPhoto(true);
      const res = await adminApi.uploadUserPhoto(showEdit.id, e.target.files[0]);
      if (res.data.success) {
        toast.success("Photo uploaded successfully");
        setEditForm(prev => ({ ...prev, photo_url: res.data.data?.photo_url || '' }));
        setShowEdit(prev => prev ? ({ ...prev, photo_url: res.data.data?.photo_url || '' }) : null);
        refetch();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to upload photo");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePhotoRemove = () => {
    if (!showEdit) return;
    setEditForm(prev => ({ ...prev, photo_url: '' }));
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.FACULTY, statusFilter],
    queryFn: () => adminApi.listFaculty({ status: statusFilter as AccountStatus}),
  });

  const { courses, departments, roles, isLoading: metadataLoading } = useMetadata();
  const activeDepartments = departments.filter(d => d.is_active);

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
      setForm({ email: '', password: '', name: '', course_id: '', department_id: '', designation: '', role_id: undefined });
    },
    onError: () => toast.error('Failed to create faculty member'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof editForm }) =>
      adminApi.updateFaculty(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FACULTY] });
      toast.success('Faculty member updated');
      setIsEditing(false);
    },
    onError: () => toast.error('Failed to update faculty member'),
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: FacultyItemResponse) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={row.photo_url || ""} alt={row.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {row.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (row: FacultyItemResponse) => row.department_name,
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
        return <StatusBadge status={row.account_status} type="account" />;
      },
    },
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
        return <StatusBadge status={row.account_status} type="account" />;
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
        <PermissionGuard permission="faculty:create">
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Faculty
          </Button>
        </PermissionGuard>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Tabs value={roleTab} onValueChange={setRoleTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="faculty">Faculty</TabsTrigger>
            <TabsTrigger value="admin">Administrators</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Select value={statusFilter ?? 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={roleTab === 'admin' ? 'admins' : 'faculty'} className="w-full mt-2">
        <TabsContent value="faculty">
          <DataTable
            columns={columns}
            data={faculty?.filter(f => roleTab === 'hod' ? f.is_hod : !f.is_hod) ?? []}
            isLoading={isLoading}
            rowKey={(row) => row.id}
            onRowClick={(row) => {
              setEditForm({ 
                name: row.name, 
                email: row.email,
                user_id: row.user_id,
                photo_url: row.photo_url || '',
                department_id: row.department_id, 
                designation: row.designation, 
                account_status: row.account_status,
                employment_status: row.employment_status
              });
              setIsEditing(false);
              setShowEdit(row);
            }}
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
              let hasError = false;
              const newErrors: { course?: boolean; dept?: boolean } = {};
              
              if (!form.course_id) {
                newErrors.course = true;
                hasError = true;
              }
              if (!form.department_id) {
                newErrors.dept = true;
                hasError = true;
              }
              
              setFormErrors(newErrors);
              if (emailError) {
                toast.error("Please fix email errors before submitting");
                return;
              }
              
              if (hasError) {
                toast.error("Please fill in all mandatory fields");
                return;
              }
              
              createMutation.mutate(form);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="f-name">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="f-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="f-email" className={emailError ? "text-destructive" : ""}>Email <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="f-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={emailError ? "border-destructive pr-10" : "pr-10"}
                  required
                />
                {isCheckingEmail && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {emailError && (
                <p className="text-sm font-medium text-destructive">{emailError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-password">Password <span className="text-destructive">*</span></Label>
              <Input
                id="f-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <PasswordRequirements password={form.password} className="mt-2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="f-course">Course <span className="text-destructive">*</span></Label>
                <Select
                  value={form.course_id}
                  onValueChange={(val) => setForm({ ...form, course_id: val })}
                  required
                >
                  <SelectTrigger id="f-course" className={formErrors.course ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select Course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-dept">Department <span className="text-destructive">*</span></Label>
                <Select
                  value={form.department_id}
                  onValueChange={(val) => setForm({ ...form, department_id: val })}
                  required
                >
                  <SelectTrigger id="f-dept" className={formErrors.dept ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDepartments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.code} - {d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="f-desig">Designation <span className="text-destructive">*</span></Label>
              <Input
                id="f-desig"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-3">
              <Label>System Role</Label>
              <Select
                value={form.role_id || 'default'}
                onValueChange={(value) => setForm({ ...form, role_id: value === 'default' ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role (Defaults to Faculty)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Faculty (Default)</SelectItem>
                  {roles.filter(r => r.name !== 'Faculty' && r.name !== 'SuperAdmin' && r.name !== 'Student' && r.name !== 'HOD').map((role) => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <Dialog open={!!showEdit} onOpenChange={(open) => {
        if (!open) {
          setShowEdit(null);
          setIsEditing(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <DialogTitle>Faculty Details</DialogTitle>
            {showEdit && (
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (isEditing) {
                    if (
                      editForm.name === showEdit.name &&
                      editForm.email === showEdit.email &&
                      editForm.user_id === showEdit.user_id &&
                      editForm.photo_url === (showEdit.photo_url || '') &&
                      editForm.department_id === showEdit.department_id &&
                      editForm.designation === showEdit.designation &&
                      editForm.account_status === showEdit.account_status &&
                      editForm.employment_status === showEdit.employment_status
                    ) {
                      toast.info("No changes made");
                      setIsEditing(false);
                      return;
                    }
                    editMutation.mutate({ id: showEdit.id, data: editForm });
                  } else {
                    setIsEditing(true);
                  }
                }}
                disabled={editMutation.isPending}
              >
                {editMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!editMutation.isPending && (isEditing ? 'Save Changes' : 'Edit')}
              </Button>
            )}
          </DialogHeader>
          
          {showEdit && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4 border-b pb-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="relative group rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                      <Avatar className="h-16 w-16 group-hover:opacity-75 transition-opacity">
                        <AvatarImage src={editForm.photo_url || ""} alt={editForm.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                          {editForm.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isUploadingPhoto ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                          <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="w-6 h-6" />
                        </div>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      <Camera className="mr-2 h-4 w-4" />
                      Upload Photo
                    </DropdownMenuItem>
                    {editForm.photo_url && (
                      <DropdownMenuItem className="text-red-600 focus:bg-red-50" onClick={handlePhotoRemove}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove Photo
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{showEdit.name}</h3>
                  <p className="text-sm text-muted-foreground">{showEdit.designation}</p>
                  <p className="text-xs text-muted-foreground mt-1">{showEdit.user_id} &bull; {showEdit.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="e-name">Full Name</Label>
                    <Input
                      id="e-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      readOnly={!isEditing}
                      className={!isEditing ? "bg-muted/50 border-transparent focus-visible:ring-0" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-email">Email</Label>
                    <Input
                      id="e-email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      readOnly={!isEditing}
                      className={!isEditing ? "bg-muted/50 border-transparent focus-visible:ring-0" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-userid">User ID</Label>
                    <Input
                      id="e-userid"
                      value={editForm.user_id}
                      onChange={(e) => setEditForm({ ...editForm, user_id: e.target.value })}
                      readOnly={!isEditing}
                      className={!isEditing ? "bg-muted/50 border-transparent focus-visible:ring-0" : ""}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="e-dept">Department</Label>
                    <Select
                      value={editForm.department_id}
                      onValueChange={(val) => setEditForm({ ...editForm, department_id: val })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger id="e-dept" className={!isEditing ? "bg-muted/50 border-transparent focus:ring-0" : ""}>
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeDepartments.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.code} - {d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="e-desig">Designation</Label>
                    <Input
                      id="e-desig"
                      value={editForm.designation}
                      onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                      readOnly={!isEditing}
                      className={!isEditing ? "bg-muted/50 border-transparent focus-visible:ring-0" : ""}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Status</Label>
                    <Select
                      value={editForm.account_status}
                      onValueChange={(value) => setEditForm({ ...editForm, account_status: value as AccountStatus })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className={!isEditing ? "bg-muted/50 border-transparent focus:ring-0" : ""}>
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
                      disabled={!isEditing}
                    >
                      <SelectTrigger className={!isEditing ? "bg-muted/50 border-transparent focus:ring-0" : ""}>
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
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
