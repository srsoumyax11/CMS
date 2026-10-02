import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Loader2, Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminApi } from '@/api/adminApi';
import type { FacultyItemResponse, Department, AccountStatus, EmploymentStatus } from '@/types/api';

interface FacultyEditModalProps {
  faculty: FacultyItemResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: any) => void;
  isPending: boolean;
  departments: Department[];
  onUploadSuccess: () => void;
}

export function FacultyEditModal({ faculty, isOpen, onClose, onSubmit, isPending, departments, onUploadSuccess }: FacultyEditModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    user_id: '',
    photo_url: '',
    department_id: '',
    designation: '',
    account_status: 'active' as AccountStatus,
    employment_status: 'active' as EmploymentStatus,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    if (isOpen && faculty) {
      setEditForm({
        name: faculty.name,
        email: faculty.email,
        user_id: faculty.user_id,
        photo_url: faculty.photo_url || '',
        department_id: faculty.department_id,
        designation: faculty.designation,
        account_status: faculty.account_status,
        employment_status: faculty.employment_status,
      });
      setIsEditing(false);
    }
  }, [isOpen, faculty]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !faculty) return;
    try {
      setIsUploadingPhoto(true);
      const res = await adminApi.uploadUserPhoto(faculty.id, e.target.files[0]);
      if (res.data.success) {
        toast.success("Photo uploaded successfully");
        setEditForm(prev => ({ ...prev, photo_url: res.data.data?.photo_url || '' }));
        onUploadSuccess();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to upload photo");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePhotoRemove = () => {
    if (!faculty) return;
    setEditForm(prev => ({ ...prev, photo_url: '' }));
  };

  const handleSave = () => {
    if (!faculty) return;
    if (
      editForm.name === faculty.name &&
      editForm.email === faculty.email &&
      editForm.user_id === faculty.user_id &&
      editForm.photo_url === (faculty.photo_url || '') &&
      editForm.department_id === faculty.department_id &&
      editForm.designation === faculty.designation &&
      editForm.account_status === faculty.account_status &&
      editForm.employment_status === faculty.employment_status
    ) {
      toast.info("No changes made");
      setIsEditing(false);
      return;
    }
    onSubmit(faculty.id, editForm);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <DialogTitle>Faculty Details</DialogTitle>
          {faculty && (
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!isPending && (isEditing ? 'Save Changes' : 'Edit')}
            </Button>
          )}
        </DialogHeader>
        
        {faculty && (
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
                <h3 className="text-lg font-semibold text-foreground">{faculty.name}</h3>
                <p className="text-sm text-muted-foreground">{faculty.designation}</p>
                <p className="text-xs text-muted-foreground mt-1">{faculty.user_id} &bull; {faculty.email}</p>
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
                      {departments.map(d => (
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
  );
}
