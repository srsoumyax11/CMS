import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complaintsApi } from '@/api/complaintsApi';
import { adminApi } from '@/api/adminApi';
import { QUERY_KEYS } from '@/lib/constants';
import { toast } from 'sonner';
import { useState } from 'react';
import type { ComplaintStatus, ComplaintCategory, ComplaintListParams } from '@/types/api';
import { getErrorMessage } from '@/lib/error-utils';

export function useComplaintAdmin() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<ComplaintCategory | undefined>();
  const [hostelFilter, setHostelFilter] = useState('');

  const params: ComplaintListParams = {
    status: statusFilter,
    category: categoryFilter,
    hostel: hostelFilter || undefined,
  };

  const listQuery = useQuery({
    queryKey: [QUERY_KEYS.ADMIN_COMPLAINTS, params],
    queryFn: () => complaintsApi.listAll(params),
  });

  const facultyQuery = useQuery({
    queryKey: [QUERY_KEYS.FACULTY],
    queryFn: () => adminApi.listFaculty(),
  });

  const recurringQuery = useQuery({
    queryKey: [QUERY_KEYS.RECURRING_ISSUES],
    queryFn: () => complaintsApi.getRecurring(),
  });

  const ageingQuery = useQuery({
    queryKey: [QUERY_KEYS.AGEING_COMPLAINTS],
    queryFn: () => complaintsApi.getAgeing(),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ComplaintStatus }) =>
      complaintsApi.updateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_COMPLAINTS] });
      toast.success('Complaint status updated');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to update status')),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, facultyId }: { id: string; facultyId: string }) =>
      complaintsApi.assign(id, { assigned_to: facultyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_COMPLAINTS] });
      toast.success('Complaint assigned');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to assign complaint')),
  });

  return {
    filters: {
      statusFilter,
      setStatusFilter,
      categoryFilter,
      setCategoryFilter,
      hostelFilter,
      setHostelFilter,
    },
    queries: {
      listQuery,
      facultyQuery,
      recurringQuery,
      ageingQuery,
    },
    mutations: {
      statusMutation,
      assignMutation,
    },
  };
}
