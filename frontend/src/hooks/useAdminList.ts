import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export function useAdminList<T, F = string>(
  queryKey: readonly unknown[],
  fetchFn: (filter?: F) => Promise<{ data: { data: T[] } }>,
  initialFilter?: F
) {
  const [filter, setFilter] = useState<F | undefined>(initialFilter);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...queryKey, filter],
    queryFn: () => fetchFn(filter),
  });

  const items = data?.data?.data ?? [];

  return {
    items,
    isLoading,
    error,
    filter,
    setFilter,
    refetch,
  };
}
