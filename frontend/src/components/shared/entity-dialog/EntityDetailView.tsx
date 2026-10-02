import React from 'react';
import { Badge } from '@/components/ui/badge';
import { format, isValid } from 'date-fns';
import type { EntityField } from './types';
import { cn } from '@/lib/utils';

export interface EntityDetailViewProps<T> {
  data: T;
  fields: EntityField<T>[];
  className?: string;
}

export function EntityDetailView<T>({
  data,
  fields,
  className,
}: EntityDetailViewProps<T>) {
  // Group fields by section (if any)
  const sections = React.useMemo(() => {
    const map = new Map<string, EntityField<T>[]>();
    const defaultKey = 'General Information';

    fields.forEach((field) => {
      const sec = field.section || defaultKey;
      if (!map.has(sec)) {
        map.set(sec, []);
      }
      map.get(sec)!.push(field);
    });

    return Array.from(map.entries()).map(([title, items]) => ({
      title,
      items,
      isDefault: title === defaultKey,
    }));
  }, [fields]);

  const renderFieldValue = (field: EntityField<T>, value: any) => {
    if (field.renderView) {
      return field.renderView(value, data);
    }

    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground italic text-xs">Not specified</span>;
    }

    switch (field.type) {
      case 'switch':
        return (
          <Badge variant={value ? 'default' : 'secondary'} className="text-xs font-normal">
            {value ? 'Active' : 'Inactive'}
          </Badge>
        );

      case 'date': {
        const d = new Date(value);
        return (
          <span className="text-sm font-medium text-foreground">
            {isValid(d) ? format(d, 'MMM d, yyyy, h:mm a') : String(value)}
          </span>
        );
      }

      case 'select': {
        const matchingOpt = field.options?.find((o) => o.value === value);
        return (
          <span className="text-sm font-medium text-foreground">
            {matchingOpt ? matchingOpt.label : String(value)}
          </span>
        );
      }

      case 'badge':
        return (
          <Badge variant="outline" className="text-xs font-normal capitalize">
            {String(value)}
          </Badge>
        );

      default:
        return (
          <span className="text-sm font-medium text-foreground break-words">
            {String(value)}
          </span>
        );
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {sections.map(({ title, items, isDefault }, sIdx) => (
        <div key={title} className="space-y-3">
          {(!isDefault || sections.length > 1) && (
            <div className="border-b pb-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {title}
              </h4>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((field) => {
              const rawValue = (data as any)[field.key];
              const isFullWidth = field.type === 'textarea' || field.type === 'custom';

              return (
                <div
                  key={String(field.key)}
                  className={cn('space-y-1', isFullWidth && 'sm:col-span-2')}
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {field.label}
                  </p>
                  <div className="pt-0.5">
                    {renderFieldValue(field, rawValue)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
