import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentCreateSchema, type StudentCreateFormValues } from '@/schemas/validation-schemas';
import type { Course, Department, StudentCreateRequest } from '@/types/api';
import { useEffect } from 'react';

interface StudentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StudentCreateRequest) => void;
  isPending: boolean;
  courses: Course[];
  departments: Department[];
}

export function StudentCreateModal({ isOpen, onClose, onSubmit, isPending, courses, departments }: StudentCreateModalProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<StudentCreateFormValues>({
    resolver: zodResolver(studentCreateSchema),
    defaultValues: { name: '', email: '', password: '', course_id: '', department_id: '', year: 1, hostel: '' }
  });

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const handleFormSubmit = (data: StudentCreateFormValues) => {
    onSubmit(data as StudentCreateRequest);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Student</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                {...register('name')}
                placeholder="e.g., John Doe"
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                {...register('email')}
                placeholder="e.g., john@example.com"
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                {...register('password')}
                placeholder="Minimum 8 characters"
              />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Course</Label>
              <Controller
                name="course_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.course_id && <p className="text-xs text-red-500">{errors.course_id.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Controller
                name="department_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.code} - {d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.department_id && <p className="text-xs text-red-500">{errors.department_id.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Year</Label>
                <Controller
                  name="year"
                  control={control}
                  render={({ field }) => (
                    <Select 
                      onValueChange={(val) => field.onChange(parseInt(val))} 
                      value={field.value ? String(field.value) : ''}
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
                  )}
                />
                {errors.year && <p className="text-xs text-red-500">{errors.year.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Hostel (Optional)</Label>
                <Input
                  {...register('hostel')}
                  placeholder="e.g., A101"
                />
                {errors.hostel && <p className="text-xs text-red-500">{errors.hostel.message}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              type="submit"
              disabled={isPending}
            >
              {isPending ? 'Creating...' : 'Create Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
