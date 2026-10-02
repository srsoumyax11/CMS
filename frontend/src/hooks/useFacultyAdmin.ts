import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { QUERY_KEYS } from '@/lib/constants';
import { toast } from 'sonner';
import { useState } from 'react';
import type { AccountStatus, FacultyCreateRequest, AdminItemResponse, FacultyItemResponse } from '@/types/api';
import { useAdminList } from '@/hooks/useAdminList';
import { getErrorMessage } from '@/lib/error-utils';

export function useFacultyAdmin() {
  const queryClient = useQueryClient();

  const facultyList = useAdminList<FacultyItemResponse, string | undefined>(
    [QUERY_KEYS.FACULTY],
    (filter) => adminApi.listFaculty({ status: filter as AccountStatus }),
    undefined
  );

  const adminList = useAdminList<AdminItemResponse, string | undefined>(
    [QUERY_KEYS.ADMINS],
    (filter) => adminApi.listAdmins({ status: filter as AccountStatus }),
    undefined
  );

  const createMutation = useMutation({
    mutationFn: (data: FacultyCreateRequest) => adminApi.createFaculty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FACULTY] });
      toast.success('Faculty member created');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to create faculty member')),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminApi.updateFaculty(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FACULTY] });
      toast.success('Faculty member updated');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to update faculty member')),
  });

  return {
    facultyList,
    adminList,
    createMutation,
    editMutation,
  };
}
