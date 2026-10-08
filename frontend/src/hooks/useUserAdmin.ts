import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/adminApi';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/error-utils';

export function useUserAdmin() {
  const queryClient = useQueryClient();
  const QUERY_KEY = 'admin_users';

  const usersList = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => adminApi.listUsers(),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('User updated successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Failed to update user')),
  });

  return {
    usersList,
    editMutation,
  };
}
