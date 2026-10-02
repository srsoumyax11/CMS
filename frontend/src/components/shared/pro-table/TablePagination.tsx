import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  disabled?: boolean;
}

export function TablePagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  disabled = false,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-3 text-xs text-muted-foreground border-t">
      {/* Range and total indicator */}
      <div className="flex items-center gap-4">
        <span>
          Showing <strong className="font-semibold text-foreground">{startItem}</strong> to{' '}
          <strong className="font-semibold text-foreground">{endItem}</strong> of{' '}
          <strong className="font-semibold text-foreground">{totalItems}</strong> entries
        </span>

        {/* Rows per page selector */}
        <div className="flex items-center gap-1.5">
          <span>Rows per page:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => onPageSizeChange(Number(val))}
            disabled={disabled}
          >
            <SelectTrigger className="h-7 w-16 text-xs bg-background">
              <SelectValue placeholder={String(pageSize)} />
            </SelectTrigger>
            <SelectContent align="start">
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)} className="text-xs">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Page navigation controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onPageChange(1)}
          disabled={disabled || currentPage <= 1}
          aria-label="First page"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={disabled || currentPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <span className="px-2 text-xs font-medium text-foreground">
          Page {currentPage} of {totalPages}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={disabled || currentPage >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || currentPage >= totalPages}
          aria-label="Last page"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
