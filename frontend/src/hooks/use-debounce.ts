import { useMemo, useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}

export function usePagination(initialPageSize: number = 20) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const pagination = useMemo(
    () => ({ skip: page * pageSize, limit: pageSize }),
    [page, pageSize]
  );

  const totalPages = (total: number) => Math.ceil(total / pageSize);

  return {
    page,
    pageSize,
    pagination,
    setPage,
    setPageSize,
    totalPages,
  };
}
