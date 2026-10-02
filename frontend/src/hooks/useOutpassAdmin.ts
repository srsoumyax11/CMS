import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { outpassesApi } from '@/api/outpassesApi';
import { QUERY_KEYS } from '@/lib/constants';
import { UI_CONFIG } from '@/config';
import { toast } from 'sonner';
import { useState } from 'react';
import type { OutpassStatus, OutpassListParams, OutpassResponse } from '@/types/api';
import { getErrorMessage } from '@/lib/error-utils';

export function useOutpassAdmin() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<OutpassStatus | undefined>();
  const [overdueFilter, setOverdueFilter] = useState<boolean | undefined>();

  const params: OutpassListParams = {
    status: statusFilter,
    is_overdue: overdueFilter,
  };

  const listQuery = useQuery({
    queryKey: [QUERY_KEYS.ADMIN_OUTPASSES, params],
    queryFn: () => outpassesApi.listAll(params),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => outpassesApi.approve(id),
    onMutate: async (id) => {
      if (!UI_CONFIG.ENABLE_OPTIMISTIC_UPDATES) return { previous: null };
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.ADMIN_OUTPASSES] });
      const previous = queryClient.getQueryData([QUERY_KEYS.ADMIN_OUTPASSES, params]);
      queryClient.setQueryData([QUERY_KEYS.ADMIN_OUTPASSES, params], (old: any) => {
        if (!old?.data?.data?.items) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: {
              ...old.data.data,
              items: old.data.data.items.map((o: OutpassResponse) => 
                o.id === id ? { ...o, status: 'approved' } : o
              )
            }
          }
        };
      });
      return { previous };
    },
    onSuccess: () => {
      toast.success('Outpass approved');
    },
    onError: (err: any, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.ADMIN_OUTPASSES, params], context.previous);
      }
      toast.error(getErrorMessage(err, 'Failed to approve outpass'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_OUTPASSES] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      outpassesApi.reject(id, { note: note || null }),
    onMutate: async ({ id }) => {
      if (!UI_CONFIG.ENABLE_OPTIMISTIC_UPDATES) return { previous: null };
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.ADMIN_OUTPASSES] });
      const previous = queryClient.getQueryData([QUERY_KEYS.ADMIN_OUTPASSES, params]);
      queryClient.setQueryData([QUERY_KEYS.ADMIN_OUTPASSES, params], (old: any) => {
        if (!old?.data?.data?.items) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: {
              ...old.data.data,
              items: old.data.data.items.map((o: OutpassResponse) => 
                o.id === id ? { ...o, status: 'rejected' } : o
              )
            }
          }
        };
      });
      return { previous };
    },
    onSuccess: () => {
      toast.success('Outpass rejected');
    },
    onError: (err: any, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.ADMIN_OUTPASSES, params], context.previous);
      }
      toast.error(getErrorMessage(err, 'Failed to reject outpass'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_OUTPASSES] });
    },
  });

  const departMutation = useMutation({
    mutationFn: (id: string) => outpassesApi.depart(id),
    onMutate: async (id) => {
      if (!UI_CONFIG.ENABLE_OPTIMISTIC_UPDATES) return { previous: null };
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.ADMIN_OUTPASSES] });
      const previous = queryClient.getQueryData([QUERY_KEYS.ADMIN_OUTPASSES, params]);
      queryClient.setQueryData([QUERY_KEYS.ADMIN_OUTPASSES, params], (old: any) => {
        if (!old?.data?.data?.items) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: {
              ...old.data.data,
              items: old.data.data.items.map((o: OutpassResponse) => 
                o.id === id ? { ...o, status: 'active' } : o
              )
            }
          }
        };
      });
      return { previous };
    },
    onSuccess: () => {
      toast.success('Marked as departed');
    },
    onError: (err: any, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.ADMIN_OUTPASSES, params], context.previous);
      }
      toast.error(getErrorMessage(err, 'Failed to mark departure'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_OUTPASSES] });
    },
  });

  const returnMutation = useMutation({
    mutationFn: (id: string) => outpassesApi.return(id),
    onMutate: async (id) => {
      if (!UI_CONFIG.ENABLE_OPTIMISTIC_UPDATES) return { previous: null };
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.ADMIN_OUTPASSES] });
      const previous = queryClient.getQueryData([QUERY_KEYS.ADMIN_OUTPASSES, params]);
      queryClient.setQueryData([QUERY_KEYS.ADMIN_OUTPASSES, params], (old: any) => {
        if (!old?.data?.data?.items) return old;
        return {
          ...old,
          data: {
            ...old.data,
            data: {
              ...old.data.data,
              items: old.data.data.items.map((o: OutpassResponse) => 
                o.id === id ? { ...o, status: 'completed' } : o
              )
            }
          }
        };
      });
      return { previous };
    },
    onSuccess: () => {
      toast.success('Marked as returned');
    },
    onError: (err: any, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData([QUERY_KEYS.ADMIN_OUTPASSES, params], context.previous);
      }
      toast.error(getErrorMessage(err, 'Failed to mark return'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ADMIN_OUTPASSES] });
    },
  });

  return {
    filters: {
      statusFilter,
      setStatusFilter,
      overdueFilter,
      setOverdueFilter,
    },
    queries: {
      listQuery,
    },
    mutations: {
      approveMutation,
      rejectMutation,
      departMutation,
      returnMutation,
    },
  };
}
