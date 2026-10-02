import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/lib/error-utils';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Edit2, Plus, Trash2, Loader2, BookOpen } from 'lucide-react';
import type { Course, CourseCreateRequest, CourseUpdateRequest } from '@/types/api';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { Badge } from '@/components/ui/badge';

export function CourseManagement() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Course | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    is_active: boolean;
    duration_years: number;
  }>({
    name: '',
    is_active: true,
    duration_years: 4,
  });

  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin_courses'],
    queryFn: () => adminApi.listCourses(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CourseCreateRequest) => adminApi.createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_courses'] });
      // Invalidate metadata as well to update dropdowns
      queryClient.invalidateQueries({ queryKey: ['metadata', 'courses'] });
      toast.success('Course created successfully');
      setShowCreate(false);
      setFormData({ name: '', is_active: true, duration_years: 4 });
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to create course'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CourseUpdateRequest }) =>
      adminApi.updateCourse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_courses'] });
      queryClient.invalidateQueries({ queryKey: ['metadata', 'courses'] });
      toast.success('Course updated successfully');
      setShowEdit(null);
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to update course'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_courses'] });
      queryClient.invalidateQueries({ queryKey: ['metadata', 'courses'] });
      toast.success('Course deleted successfully');
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to delete course. It may be in use.'));
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;
    updateMutation.mutate({
      id: showEdit.id,
      data: {
        name: formData.name,
        is_active: formData.is_active,
        duration_years: formData.duration_years,
      },
    });
  };

  const openEdit = (course: Course) => {
    setFormData({ 
      name: course.name, 
      is_active: course.is_active,
      duration_years: course.duration_years || 4
    });
    setShowEdit(course);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState title="Failed to load courses" description={error?.message} onRetry={refetch} />;
  }

  const courses = response?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-1">Manage degree programs and courses</p>
        </div>
        <Button onClick={() => {
          setFormData({ name: '', is_active: true, duration_years: 4 });
          setShowCreate(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Course
        </Button>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course Name</TableHead>
              <TableHead>Duration (Years)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24">
                  <EmptyState 
                    icon={<BookOpen className="h-6 w-6" />}
                    title="No courses found"
                    description="Get started by creating a new course (e.g., B.Tech, M.Tech)."
                  />
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course: Course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.name}</TableCell>
                  <TableCell>{course.duration_years}</TableCell>
                  <TableCell>
                    <Badge variant={course.is_active ? 'default' : 'secondary'}>
                      {course.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(course)} aria-label={`Edit ${course.name}`}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Delete ${course.name}`}
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${course.name}?`)) {
                          deleteMutation.mutate(course.id);
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

      <Dialog open={showCreate || !!showEdit} onOpenChange={(open) => {
        if (!open) {
          setShowCreate(false);
          setShowEdit(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{showEdit ? 'Edit Course' : 'Create Course'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={showEdit ? handleUpdate : handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. B.Tech"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration_years">Duration (Years)</Label>
              <Input
                id="duration_years"
                type="number"
                min="1"
                max="7"
                value={formData.duration_years}
                onChange={(e) => setFormData({ ...formData, duration_years: parseInt(e.target.value) || 4 })}
                required
              />
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
    </div>
  );
}
