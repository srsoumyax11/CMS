import type { ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export type TableDensity = 'compact' | 'normal' | 'relaxed';

export interface ProColumn<T> {
  id: string;
  header: ReactNode | ((context: { column: ProColumn<T> }) => ReactNode);
  accessorKey?: keyof T | string;
  accessorFn?: (row: T) => any;
  cell?: (value: any, row: T, index: number) => ReactNode;
  sortable?: boolean;
  searchable?: boolean;
  hideable?: boolean;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  width?: string | number;
}

export interface TableFilterOption {
  label: string;
  value: any;
  count?: number;
}

export interface TableFilterDef<T> {
  id: string;
  label: string;
  options: TableFilterOption[];
  defaultValue?: any;
  filterFn?: (row: T, filterValue: any) => boolean;
}

export interface ProTableProps<T> {
  columns: ProColumn<T>[];
  data: T[];
  isLoading?: boolean;
  error?: any;
  onRetry?: () => void;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  searchPlaceholder?: string;
  enableSearch?: boolean;
  enablePagination?: boolean;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  enableSelection?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (selected: T[]) => void;
  bulkActions?: (selected: T[], clearSelection: () => void) => ReactNode;
  filters?: TableFilterDef<T>[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  toolbarActions?: ReactNode;
  exportFileName?: string;
  enableExport?: boolean;
  enableDensity?: boolean;
  enableColumnVisibility?: boolean;
  defaultSort?: { columnId: string; direction: 'asc' | 'desc' };
  className?: string;
}
