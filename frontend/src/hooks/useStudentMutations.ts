import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { QUERY_KEYS } from '@/lib/constants';
import { toast } from 'sonner';
import type { StudentCreateRequest, AccountStatus, AcademicStatus } from '@/types/api';
import { getErrorMessage } from '@/lib/error-utils';

export function useStudentMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: StudentCreateRequest) => adminApi.createStudent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENTS] });
      toast.success('Student created successfully');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to create student')),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { account_status?: AccountStatus; academic_status?: AcademicStatus; status_note?: string } }) =>
      adminApi.updateStudentStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENTS] });
      toast.success('Student status updated');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to update student status')),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      adminApi.updateStudentDetails(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STUDENTS] });
      toast.success('Student details updated');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to update student details')),
  });

  return {
    createMutation,
    updateStatusMutation,
    editMutation,
  };
}
