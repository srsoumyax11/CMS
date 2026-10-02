import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface FormFieldProps {
  id?: string;
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  required,
  error,
  helperText,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label
          htmlFor={id}
          className={cn(
            'text-sm font-medium leading-none text-foreground flex items-center gap-1',
            error && 'text-destructive'
          )}
        >
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      {children}

      {error ? (
        <p className="text-xs font-medium text-destructive animate-in fade-in duration-200">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
