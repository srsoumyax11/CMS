import React, { useState, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, ArrowUp, ArrowDown, Database } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { TableToolbar } from './TableToolbar';
import { TablePagination } from './TablePagination';
import { TableBulkActions } from './TableBulkActions';
import type { ProTableProps, SortDirection, TableDensity } from './types';
import { cn } from '@/lib/utils';

export function ProTable<T>({
  columns,
  data,
  isLoading = false,
  error,
  onRetry,
  rowKey,
  onRowClick,
  searchPlaceholder = 'Search records...',
  enableSearch = true,
  enablePagination = true,
  initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  enableSelection = false,
  selectedRows: controlledSelectedRows,
  onSelectionChange,
  bulkActions,
  filters,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching the current filter criteria.',
  emptyIcon,
  emptyAction,
  toolbarActions,
  exportFileName = 'export-data',
  enableExport = true,
  enableDensity = true,
  enableColumnVisibility = true,
  defaultSort,
  className,
}: ProTableProps<T>) {
  // ── 1. Search & Filter State ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    filters?.forEach((f) => {
      if (f.defaultValue !== undefined) {
        initial[f.id] = f.defaultValue;
      }
    });
    return initial;
  });

  // ── 2. Sorting State ──────────────────────────────────────────────────
  const [sortColumnId, setSortColumnId] = useState<string | null>(defaultSort?.columnId ?? null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSort?.direction ?? null);

  // ── 3. Pagination State ───────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // ── 4. Density & Column Visibility ────────────────────────────────────
  const [density, setDensity] = useState<TableDensity>('normal');
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string>>(
    () => new Set(columns.map((c) => c.id))
  );

  // ── 5. Row Selection State ────────────────────────────────────────────
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<Set<string>>(new Set());

  // Determine currently selected keys based on controlled or internal state
  const selectedKeys = useMemo(() => {
    if (controlledSelectedRows !== undefined) {
      return new Set(controlledSelectedRows.map(rowKey));
    }
    return internalSelectedKeys;
  }, [controlledSelectedRows, internalSelectedKeys, rowKey]);

  const handleSelectionToggle = useCallback(
    (row: T) => {
      const key = rowKey(row);
      const nextKeys = new Set(selectedKeys);
      if (nextKeys.has(key)) {
        nextKeys.delete(key);
      } else {
        nextKeys.add(key);
      }

      if (controlledSelectedRows === undefined) {
        setInternalSelectedKeys(nextKeys);
      }
      if (onSelectionChange) {
        const nextSelected = data.filter((item) => nextKeys.has(rowKey(item)));
        onSelectionChange(nextSelected);
      }
    },
    [data, rowKey, selectedKeys, controlledSelectedRows, onSelectionChange]
  );

  const handleClearSelection = useCallback(() => {
    if (controlledSelectedRows === undefined) {
      setInternalSelectedKeys(new Set());
    }
    if (onSelectionChange) {
      onSelectionChange([]);
    }
  }, [controlledSelectedRows, onSelectionChange]);

  // ── 6. Column Visibility Handler ──────────────────────────────────────
  const handleToggleColumnVisibility = useCallback((columnId: string) => {
    setVisibleColumnIds((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        // Prevent hiding the last remaining column
        if (next.size > 1) {
          next.delete(columnId);
        }
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  // ── 7. Sorting Toggle Handler ─────────────────────────────────────────
  const handleSortToggle = useCallback(
    (columnId: string) => {
      if (sortColumnId !== columnId) {
        setSortColumnId(columnId);
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumnId(null);
        setSortDirection(null);
      }
    },
    [sortColumnId, sortDirection]
  );

  // ── 8. Search & Filter Processing ─────────────────────────────────────
  const filteredData = useMemo(() => {
    let result = [...(data || [])];

    // Apply Filter definitions
    if (filters && filters.length > 0) {
      filters.forEach((filter) => {
        const activeVal = activeFilters[filter.id];
        if (activeVal !== undefined && activeVal !== null && activeVal !== '' && activeVal !== 'all') {
          if (filter.filterFn) {
            result = result.filter((row) => filter.filterFn!(row, activeVal));
          } else {
            // Default exact matching on accessor
            const targetCol = columns.find((c) => c.id === filter.id);
            if (targetCol) {
              result = result.filter((row) => {
                const val = targetCol.accessorFn
                  ? targetCol.accessorFn(row)
                  : targetCol.accessorKey
                  ? (row as any)[targetCol.accessorKey]
                  : null;
                return val === activeVal;
              });
            }
          }
        }
      });
    }

    // Apply Global Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const searchableCols = columns.filter((col) => col.searchable !== false);

      result = result.filter((row) => {
        return searchableCols.some((col) => {
          let val = col.accessorFn
            ? col.accessorFn(row)
            : col.accessorKey
            ? (row as any)[col.accessorKey]
            : null;

          if (val === null || val === undefined) return false;
          if (typeof val === 'object') {
            val = JSON.stringify(val);
          }
          return String(val).toLowerCase().includes(query);
        });
      });
    }

    // Apply Sorting
    if (sortColumnId && sortDirection) {
      const activeCol = columns.find((c) => c.id === sortColumnId);
      if (activeCol) {
        result.sort((a, b) => {
          let aVal = activeCol.accessorFn
            ? activeCol.accessorFn(a)
            : activeCol.accessorKey
            ? (a as any)[activeCol.accessorKey]
            : null;
          let bVal = activeCol.accessorFn
            ? activeCol.accessorFn(b)
            : activeCol.accessorKey
            ? (b as any)[activeCol.accessorKey]
            : null;

          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
          if (bVal == null) return sortDirection === 'asc' ? -1 : 1;

          if (typeof aVal === 'string' && typeof bVal === 'string') {
            return sortDirection === 'asc'
              ? aVal.localeCompare(bVal)
              : bVal.localeCompare(aVal);
          }

          if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }

    return result;
  }, [data, columns, filters, activeFilters, searchQuery, sortColumnId, sortDirection]);

  // ── 9. Pagination Slicing ─────────────────────────────────────────────
  const paginatedData = useMemo(() => {
    if (!enablePagination) return filteredData;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, enablePagination, currentPage, pageSize]);

  // Reset page when search or filters change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleFilterChange = (filterId: string, val: any) => {
    setActiveFilters((prev) => ({ ...prev, [filterId]: val }));
    setCurrentPage(1);
  };

  // ── 10. Select All Visible Rows Handler ───────────────────────────────
  const allVisibleSelected = useMemo(() => {
    if (paginatedData.length === 0) return false;
    return paginatedData.every((row) => selectedKeys.has(rowKey(row)));
  }, [paginatedData, selectedKeys, rowKey]);

  const handleSelectAllVisible = useCallback(() => {
    const nextKeys = new Set(selectedKeys);
    if (allVisibleSelected) {
      paginatedData.forEach((row) => nextKeys.delete(rowKey(row)));
    } else {
      paginatedData.forEach((row) => nextKeys.add(rowKey(row)));
    }

    if (controlledSelectedRows === undefined) {
      setInternalSelectedKeys(nextKeys);
    }
    if (onSelectionChange) {
      const nextSelected = data.filter((item) => nextKeys.has(rowKey(item)));
      onSelectionChange(nextSelected);
    }
  }, [allVisibleSelected, paginatedData, selectedKeys, rowKey, controlledSelectedRows, onSelectionChange, data]);

  // ── 11. Export Handler ────────────────────────────────────────────────
  const handleExport = useCallback(
    (format: 'csv' | 'json') => {
      const exportRows = selectedKeys.size > 0
        ? data.filter((row) => selectedKeys.has(rowKey(row)))
        : filteredData;

      const activeColumns = columns.filter((col) => visibleColumnIds.has(col.id));

      if (format === 'json') {
        const jsonContent = JSON.stringify(exportRows, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportFileName}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const headers = activeColumns.map((c) =>
          typeof c.header === 'string' ? `"${c.header.replace(/"/g, '""')}"` : `"${c.id}"`
        );
        const csvRows = exportRows.map((row) => {
          return activeColumns
            .map((col) => {
              const val = col.accessorFn
                ? col.accessorFn(row)
                : col.accessorKey
                ? (row as any)[col.accessorKey]
                : '';
              const strVal = val == null ? '' : String(val).replace(/"/g, '""');
              return `"${strVal}"`;
            })
            .join(',');
        });

        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportFileName}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [columns, data, exportFileName, filteredData, rowKey, selectedKeys, visibleColumnIds]
  );

  // ── 12. Density CSS Classes ───────────────────────────────────────────
  const cellPaddingClass = useMemo(() => {
    switch (density) {
      case 'compact':
        return 'py-1.5 px-3 text-xs';
      case 'relaxed':
        return 'py-4 px-4 text-sm';
      default:
        return 'py-2.5 px-4 text-sm';
    }
  }, [density]);

  // ── 13. Visible Columns Filtered ──────────────────────────────────────
  const activeColumns = useMemo(() => {
    return columns.filter((col) => visibleColumnIds.has(col.id));
  }, [columns, visibleColumnIds]);

  // ── Error State ───────────────────────────────────────────────────────
  if (error) {
    return (
      <ErrorState
        title="Failed to load table data"
        description={error?.message || 'An error occurred while fetching records.'}
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className={cn('space-y-3.5', className)}>
      {/* Table Toolbar */}
      <TableToolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        searchPlaceholder={searchPlaceholder}
        enableSearch={enableSearch}
        columns={columns}
        visibleColumnIds={visibleColumnIds}
        onToggleColumnVisibility={handleToggleColumnVisibility}
        density={density}
        onDensityChange={setDensity}
        enableDensity={enableDensity}
        enableColumnVisibility={enableColumnVisibility}
        enableExport={enableExport}
        onExport={handleExport}
        filters={filters}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        toolbarActions={toolbarActions}
      />

      {/* Bulk Actions Notification Bar */}
      {enableSelection && (
        <TableBulkActions
          selectedCount={selectedKeys.size}
          onClearSelection={handleClearSelection}
          actions={
            bulkActions
              ? bulkActions(
                  data.filter((r) => selectedKeys.has(rowKey(r))),
                  handleClearSelection
                )
              : undefined
          }
        />
      )}

      {/* Main Table Grid */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent border-b">
                {/* Checkbox Column */}
                {enableSelection && (
                  <TableHead className="w-10 px-3 text-center">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={handleSelectAllVisible}
                      aria-label="Select all visible rows"
                    />
                  </TableHead>
                )}

                {/* Column Headers */}
                {activeColumns.map((col) => {
                  const isSorted = sortColumnId === col.id;
                  const isSortable = col.sortable !== false;

                  return (
                    <TableHead
                      key={col.id}
                      style={{ width: col.width }}
                      className={cn(
                        'font-semibold text-xs tracking-wider text-muted-foreground uppercase select-none',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right',
                        col.headerClassName
                      )}
                    >
                      {isSortable ? (
                        <button
                          type="button"
                          onClick={() => handleSortToggle(col.id)}
                          className={cn(
                            'inline-flex items-center gap-1.5 hover:text-foreground transition-colors group',
                            col.align === 'center' && 'mx-auto',
                            col.align === 'right' && 'ml-auto'
                          )}
                        >
                          <span>
                            {typeof col.header === 'function'
                              ? col.header({ column: col })
                              : col.header}
                          </span>
                          <span className="text-muted-foreground/60 group-hover:text-foreground">
                            {isSorted && sortDirection === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-primary" />
                            ) : isSorted && sortDirection === 'desc' ? (
                              <ArrowDown className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                          </span>
                        </button>
                      ) : typeof col.header === 'function' ? (
                        col.header({ column: col })
                      ) : (
                        col.header
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                // Skeleton loading rows
                Array.from({ length: pageSize > 10 ? 10 : pageSize }).map((_, rIdx) => (
                  <TableRow key={rIdx} className="hover:bg-transparent">
                    {enableSelection && (
                      <TableCell className="w-10 px-3 text-center">
                        <Skeleton className="h-4 w-4 rounded mx-auto" />
                      </TableCell>
                    )}
                    {activeColumns.map((col) => (
                      <TableCell key={col.id} className={cellPaddingClass}>
                        <Skeleton className="h-4 w-4/5" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginatedData.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell
                    colSpan={activeColumns.length + (enableSelection ? 1 : 0)}
                    className="h-64 text-center"
                  >
                    <EmptyState
                      icon={emptyIcon || <Database className="h-8 w-8 text-muted-foreground" />}
                      title={emptyTitle}
                      description={emptyDescription}
                      action={
                        emptyAction || (searchQuery ? (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            Clear search filter
                          </button>
                        ) : undefined)
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                // Rendered Data Rows
                paginatedData.map((row, rowIdx) => {
                  const key = rowKey(row);
                  const isSelected = selectedKeys.has(key);

                  return (
                    <TableRow
                      key={key}
                      data-state={isSelected ? 'selected' : undefined}
                      className={cn(
                        'transition-colors border-b last:border-0',
                        onRowClick && 'cursor-pointer hover:bg-muted/40',
                        isSelected && 'bg-primary/5 hover:bg-primary/10'
                      )}
                      onClick={(e) => {
                        // Prevent row click if clicking checkbox, buttons, links, or dropdowns
                        const target = e.target as HTMLElement;
                        if (
                          target.closest('button') ||
                          target.closest('input[type="checkbox"]') ||
                          target.closest('a') ||
                          target.closest('[role="menuitem"]')
                        ) {
                          return;
                        }
                        if (onRowClick) {
                          onRowClick(row);
                        }
                      }}
                    >
                      {/* Selection Checkbox */}
                      {enableSelection && (
                        <TableCell className="w-10 px-3 text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSelectionToggle(row)}
                            aria-label={`Select row ${key}`}
                          />
                        </TableCell>
                      )}

                      {/* Data Cells */}
                      {activeColumns.map((col) => {
                        const rawValue = col.accessorFn
                          ? col.accessorFn(row)
                          : col.accessorKey
                          ? (row as any)[col.accessorKey]
                          : null;

                        return (
                          <TableCell
                            key={col.id}
                            className={cn(
                              cellPaddingClass,
                              col.align === 'center' && 'text-center',
                              col.align === 'right' && 'text-right',
                              col.className
                            )}
                          >
                            {col.cell
                              ? col.cell(rawValue, row, rowIdx)
                              : rawValue != null
                              ? String(rawValue)
                              : '—'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {enablePagination && !isLoading && filteredData.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filteredData.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={pageSizeOptions}
          />
        )}
      </div>
    </div>
  );
}
