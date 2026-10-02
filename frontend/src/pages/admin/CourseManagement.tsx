import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { getErrorMessage } from '@/lib/error-utils';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn, type TableFilterDef } from '@/components/shared/pro-table';
import { EntityViewEditDialog, type EntityField } from '@/components/shared/entity-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { Course, CourseCreateRequest, CourseUpdateRequest } from '@/types/api';

export function CourseManagement() {
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | 'create'>('view');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['admin_courses'],
    queryFn: () => adminApi.listCourses(),
  });
  const courses = response?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: CourseCreateRequest) => adminApi.createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_courses'] });
      queryClient.invalidateQueries({ queryKey: ['metadata', 'courses'] });
      toast.success('Course created successfully');
      setIsDialogOpen(false);
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
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(getErrorMessage(err, 'Failed to delete course. It may be in use.'));
    },
  });

  // Table Columns
  const columns: ProColumn<Course>[] = [
    {
      id: 'name',
      header: 'Course Name',
      accessorKey: 'name',
      cell: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="font-semibold text-foreground">{row.name}</span>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'duration_years',
      header: 'Duration',
      accessorKey: 'duration_years',
      cell: (val) => (
        <span className="text-xs font-medium">
          {val} {val === 1 ? 'Year' : 'Years'}
        </span>
      ),
      sortable: true,
      width: '140px',
      align: 'center',
    },
    {
      id: 'is_active',
      header: 'Status',
      accessorKey: 'is_active',
      cell: (val) => (
        <Badge variant={val ? 'default' : 'secondary'} className="text-xs">
          {val ? 'Active' : 'Inactive'}
        </Badge>
      ),
      sortable: true,
      width: '120px',
      align: 'center',
    },
  ];

  // Filters
  const filters: TableFilterDef<Course>[] = [
    {
      id: 'is_active',
      label: 'Status',
      defaultValue: 'all',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Active', value: true },
        { label: 'Inactive', value: false },
      ],
      filterFn: (row, val) => row.is_active === val,
    },
  ];

  // Entity Modal Fields (View + Edit + Create)
  const fields: EntityField<Course>[] = [
    {
      key: 'name',
      label: 'Course Name',
      type: 'text',
      required: true,
      placeholder: 'e.g. Bachelor of Technology (B.Tech)',
    },
    {
      key: 'duration_years',
      label: 'Duration (Years)',
      type: 'number',
      required: true,
      defaultValue: 4,
      validate: (val) => {
        const num = Number(val);
        if (isNaN(num) || num < 1 || num > 7) {
          return 'Duration must be between 1 and 7 years';
        }
        return null;
      },
    },
    {
      key: 'is_active',
      label: 'Active Status',
      type: 'switch',
      description: 'Allow new students to enroll in this course degree program.',
      defaultValue: true,
    },
  ];

  const handleSave = async (formData: Record<string, any>, item: Course | null) => {
    const payload = {
      name: formData.name,
      duration_years: Number(formData.duration_years),
      is_active: Boolean(formData.is_active),
    };

    if (item) {
      await updateMutation.mutateAsync({ id: item.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const handleRowClick = (course: Course) => {
    setSelectedCourse(course);
    setDialogMode('view');
    setIsDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setSelectedCourse(null);
    setDialogMode('create');
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={handleOpenCreate} className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            Add Course
          </Button>
        }
      />

      <ProTable
        columns={columns}
        data={courses}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        rowKey={(row) => row.id}
        onRowClick={handleRowClick}
        filters={filters}
        searchPlaceholder="Search courses by degree program name..."
        exportFileName="courses-list"
        emptyTitle="No courses found"
        emptyDescription="Create your first degree course program to begin student admissions and enrollment."
      />

      <EntityViewEditDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        entityName="Course"
        data={selectedCourse}
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
export default CourseManagement;
