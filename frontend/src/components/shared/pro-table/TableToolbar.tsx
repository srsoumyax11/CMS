import { Search, X, SlidersHorizontal, Download, Columns3, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ProColumn, TableDensity, TableFilterDef } from './types';
import { cn } from '@/lib/utils';

export interface TableToolbarProps<T> {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  enableSearch?: boolean;
  columns: ProColumn<T>[];
  visibleColumnIds: Set<string>;
  onToggleColumnVisibility: (columnId: string) => void;
  density: TableDensity;
  onDensityChange: (density: TableDensity) => void;
  enableDensity?: boolean;
  enableColumnVisibility?: boolean;
  enableExport?: boolean;
  onExport: (format: 'csv' | 'json') => void;
  filters?: TableFilterDef<T>[];
  activeFilters: Record<string, any>;
  onFilterChange: (filterId: string, value: any) => void;
  toolbarActions?: React.ReactNode;
}

export function TableToolbar<T>({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  enableSearch = true,
  columns,
  visibleColumnIds,
  onToggleColumnVisibility,
  density,
  onDensityChange,
  enableDensity = true,
  enableColumnVisibility = true,
  enableExport = true,
  onExport,
  filters,
  activeFilters,
  onFilterChange,
  toolbarActions,
}: TableToolbarProps<T>) {
  const hideableColumns = columns.filter((col) => col.hideable !== false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        {enableSearch && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9 pr-8 h-9 text-sm bg-background"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Action Controls & Utilities */}
        <div className="flex items-center flex-wrap gap-2 justify-end">
          {/* Custom Toolbar Actions (e.g. Add Button) */}
          {toolbarActions}

          {/* Density Selector */}
          {enableDensity && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Density</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuLabel className="text-xs">Row Height</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDensityChange('compact')}
                  className="flex items-center justify-between text-xs"
                >
                  Compact
                  {density === 'compact' && <Check className="h-3.5 w-3.5" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDensityChange('normal')}
                  className="flex items-center justify-between text-xs"
                >
                  Normal
                  {density === 'normal' && <Check className="h-3.5 w-3.5" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDensityChange('relaxed')}
                  className="flex items-center justify-between text-xs"
                >
                  Relaxed
                  {density === 'relaxed' && <Check className="h-3.5 w-3.5" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Column Visibility Selector */}
          {enableColumnVisibility && hideableColumns.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium">
                  <Columns3 className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
                <DropdownMenuLabel className="text-xs">Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideableColumns.map((col) => {
                  const headerTitle =
                    typeof col.header === 'string' ? col.header : col.id;
                  const isVisible = visibleColumnIds.has(col.id);
                  return (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      checked={isVisible}
                      onCheckedChange={() => onToggleColumnVisibility(col.id)}
                      className="text-xs capitalize"
                    >
                      {headerTitle}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Export Actions */}
          {enableExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-medium">
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => onExport('csv')} className="text-xs">
                  Export as CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('json')} className="text-xs">
                  Export as JSON (.json)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Filter Tabs / Pills */}
      {filters && filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
          {filters.map((filter) => {
            const currentValue = activeFilters[filter.id] ?? filter.defaultValue ?? 'all';
            return (
              <div key={filter.id} className="flex items-center gap-1.5 text-xs">
                <span className="font-medium text-muted-foreground mr-1">{filter.label}:</span>
                <div className="flex flex-wrap gap-1">
                  {filter.options.map((opt) => {
                    const isSelected = currentValue === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => onFilterChange(filter.id, opt.value)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                          isSelected
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {opt.label}
                        {opt.count !== undefined && (
                          <span className={cn('ml-1 opacity-70 text-[10px]')}>({opt.count})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
