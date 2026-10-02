import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TableBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function TableBulkActions({
  selectedCount,
  onClearSelection,
  actions,
  className,
}: TableBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20 text-foreground animate-in fade-in slide-in-from-top-2 duration-300',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {selectedCount}
        </span>
        <span className="text-xs font-semibold">
          {selectedCount === 1 ? 'item selected' : 'items selected'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3 mr-1" /> Clear
        </Button>
      </div>

      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
