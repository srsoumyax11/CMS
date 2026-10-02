import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField } from '@/components/shared/form/FormField';
import { SwitchField } from '@/components/shared/form/SwitchField';
import type { EntityField } from './types';
import { cn } from '@/lib/utils';

export interface EntityFormViewProps<T> {
  item: T | null;
  fields: EntityField<T>[];
  formData: Record<string, any>;
  errors: Record<string, string>;
  onChange: (key: string, value: any) => void;
  isCreateMode?: boolean;
  className?: string;
}

export function EntityFormView<T>({
  item,
  fields,
  formData,
  errors,
  onChange,
  isCreateMode = false,
  className,
}: EntityFormViewProps<T>) {
  // Only render editable fields in form mode
  const editableFields = fields.filter((f) => {
    if (f.editable === false) return false;
    return true;
  });

  return (
    <div className={cn('space-y-4 py-1', className)}>
      {editableFields.map((field) => {
        const fieldKey = String(field.key);
        const value = formData[fieldKey];
        const error = errors[fieldKey];

        // 1. Custom Editor
        if (field.renderEdit) {
          return (
            <FormField
              key={fieldKey}
              id={fieldKey}
              label={field.label}
              required={field.required}
              error={error}
              helperText={field.description}
            >
              {field.renderEdit(
                value,
                (newVal) => onChange(fieldKey, newVal),
                item,
                formData
              )}
            </FormField>
          );
        }

        // 2. Switch Field
        if (field.type === 'switch') {
          return (
            <SwitchField
              key={fieldKey}
              id={fieldKey}
              label={field.label}
              description={field.description}
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(fieldKey, checked)}
            />
          );
        }

        // 3. Textarea Field
        if (field.type === 'textarea') {
          return (
            <FormField
              key={fieldKey}
              id={fieldKey}
              label={field.label}
              required={field.required}
              error={error}
              helperText={field.description}
            >
              <Textarea
                id={fieldKey}
                value={value ?? ''}
                onChange={(e) => onChange(fieldKey, e.target.value)}
                placeholder={field.placeholder}
                rows={4}
                className="bg-background"
              />
            </FormField>
          );
        }

        // 4. Select Field
        if (field.type === 'select') {
          const EMPTY_SENTINEL = '__unassigned_none__';
          const resolvedValue =
            value === '' || value === null || value === undefined
              ? EMPTY_SENTINEL
              : String(value);

          return (
            <FormField
              key={fieldKey}
              id={fieldKey}
              label={field.label}
              required={field.required}
              error={error}
              helperText={field.description}
            >
              <Select
                value={resolvedValue}
                onValueChange={(newVal) =>
                  onChange(fieldKey, newVal === EMPTY_SENTINEL ? '' : newVal)
                }
              >
                <SelectTrigger id={fieldKey} className="bg-background">
                  <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((opt) => {
                    const itemValue =
                      opt.value === '' || opt.value === null || opt.value === undefined
                        ? EMPTY_SENTINEL
                        : String(opt.value);

                    return (
                      <SelectItem key={itemValue} value={itemValue}>
                        {opt.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </FormField>
          );
        }

        // 5. Default Inputs (text, number, email, password)
        const inputType =
          field.type === 'number'
            ? 'number'
            : field.type === 'email'
            ? 'email'
            : field.type === 'password'
            ? 'password'
            : 'text';

        return (
          <FormField
            key={fieldKey}
            id={fieldKey}
            label={field.label}
            required={field.required}
            error={error}
            helperText={field.description}
          >
            <Input
              id={fieldKey}
              type={inputType}
              value={value ?? ''}
              onChange={(e) => {
                const val =
                  field.type === 'number'
                    ? e.target.value === ''
                      ? ''
                      : Number(e.target.value)
                    : e.target.value;
                onChange(fieldKey, val);
              }}
              placeholder={field.placeholder}
              className="bg-background"
            />
          </FormField>
        );
      })}
    </div>
  );
}
