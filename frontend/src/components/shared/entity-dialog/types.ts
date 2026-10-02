import type { ReactNode } from 'react';

export type EntityFieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'password'
  | 'textarea'
  | 'switch'
  | 'select'
  | 'badge'
  | 'date'
  | 'custom';

export interface EntityFieldOption {
  label: string;
  value: any;
}

export interface EntityField<T> {
  key: keyof T | string;
  label: string;
  type: EntityFieldType;
  options?: EntityFieldOption[];
  editable?: boolean;
  required?: boolean;
  placeholder?: string;
  description?: string;
  section?: string;
  renderView?: (value: any, item: T) => ReactNode;
  renderEdit?: (
    value: any,
    onChange: (val: any) => void,
    item: T | null,
    formData: Record<string, any>
  ) => ReactNode;
  validate?: (value: any, formData: Record<string, any>) => string | null | undefined;
  defaultValue?: any;
}

export interface EntityViewEditDialogProps<T> {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  data: T | null;
  fields: EntityField<T>[];
  initialMode?: 'view' | 'edit' | 'create';
  onSave: (payload: Record<string, any>, item: T | null) => Promise<any> | void;
  isSaving?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onDelete?: (item: T) => Promise<any> | void;
  isDeleting?: boolean;
  deleteConfirmMessage?: string;
  customHeaderExtra?: (item: T | null, mode: 'view' | 'edit' | 'create') => ReactNode;
  className?: string;
}
