import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Loader2, X, Check } from 'lucide-react';
import { EntityDetailView } from './EntityDetailView';
import { EntityFormView } from './EntityFormView';
import type { EntityViewEditDialogProps } from './types';
import { cn } from '@/lib/utils';

export function EntityViewEditDialog<T>({
  isOpen,
  onClose,
  entityName,
  data,
  fields,
  initialMode = 'view',
  onSave,
  isSaving = false,
  canEdit = true,
  canDelete = false,
  onDelete,
  isDeleting = false,
  deleteConfirmMessage,
  customHeaderExtra,
  className,
}: EntityViewEditDialogProps<T>) {
  const [mode, setMode] = useState<'view' | 'edit' | 'create'>(initialMode);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form data when item changes or modal opens
  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false);
      return;
    }

    setMode(initialMode);
    setErrors({});

    const initialValues: Record<string, any> = {};
    fields.forEach((field) => {
      const fieldKey = String(field.key);
      if (initialMode === 'create' || !data) {
        initialValues[fieldKey] =
          field.defaultValue !== undefined
            ? field.defaultValue
            : field.type === 'switch'
            ? true
            : '';
      } else {
        const existingVal = (data as any)[fieldKey];
        initialValues[fieldKey] =
          existingVal !== undefined && existingVal !== null ? existingVal : '';
      }
    });

    setFormData(initialValues);
  }, [isOpen, data, initialMode]);

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Clear error on change
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      if (field.editable === false && mode !== 'create') return;

      const fieldKey = String(field.key);
      const val = formData[fieldKey];

      // Required check
      if (field.required) {
        if (val === undefined || val === null || val === '') {
          newErrors[fieldKey] = `${field.label} is required`;
        }
      }

      // Custom validation
      if (field.validate && !newErrors[fieldKey]) {
        const customErr = field.validate(val, formData);
        if (customErr) {
          newErrors[fieldKey] = customErr;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await onSave(formData, data);
      if (mode === 'create') {
        onClose();
      } else {
        // Return to view mode with updated optimistic values
        setMode('view');
      }
    } catch {
      // Error handled by parent or toast
    }
  };

  const handleCancelEdit = () => {
    if (mode === 'create') {
      onClose();
    } else {
      // Revert form data back to original data
      const revertValues: Record<string, any> = {};
      fields.forEach((f) => {
        const k = String(f.key);
        revertValues[k] = data ? (data as any)[k] ?? '' : '';
      });
      setFormData(revertValues);
      setErrors({});
      setMode('view');
    }
  };

  // Header Title
  const dialogTitle = useMemo(() => {
    if (mode === 'create') {
      return `Create New ${entityName}`;
    }
    if (mode === 'edit') {
      return `Edit ${entityName}`;
    }
    const nameVal = data ? (data as any).name || (data as any).title : null;
    return nameVal ? String(nameVal) : `${entityName} Details`;
  }, [mode, entityName, data]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn('sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden', className)}>
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/20 shrink-0">
          <div className="flex items-center justify-between gap-4 pr-6">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {dialogTitle}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {mode === 'view'
                  ? `Viewing comprehensive properties and values for this ${entityName.toLowerCase()}.`
                  : mode === 'edit'
                  ? `Update the details below and save your changes.`
                  : `Fill in the required information to create a new ${entityName.toLowerCase()}.`}
              </DialogDescription>
            </div>

            {/* Top Action Buttons (Edit & Delete toggles) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {customHeaderExtra && customHeaderExtra(data, mode)}

              {mode === 'view' && canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMode('edit')}
                  className="h-8 gap-1.5 text-xs font-medium"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}

              {mode === 'view' && canDelete && onDelete && data && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Delete ${entityName}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Delete Confirmation Overlay */}
        {showDeleteConfirm && (
          <div className="p-4 mx-6 my-2 rounded-lg bg-destructive/10 border border-destructive/20 animate-in fade-in duration-200">
            <p className="text-xs font-semibold text-destructive">
              {deleteConfirmMessage || `Are you sure you want to delete this ${entityName.toLowerCase()}? This action cannot be undone.`}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                variant="destructive"
                disabled={isDeleting}
                onClick={async () => {
                  if (data && onDelete) {
                    await onDelete(data);
                    setShowDeleteConfirm(false);
                    onClose();
                  }
                }}
                className="h-7 text-xs"
              >
                {isDeleting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Confirm Delete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {mode === 'view' && data ? (
            <EntityDetailView data={data} fields={fields} />
          ) : (
            <form id="entity-form" onSubmit={handleSubmit}>
              <EntityFormView
                item={data}
                fields={fields}
                formData={formData}
                errors={errors}
                onChange={handleFieldChange}
                isCreateMode={mode === 'create'}
              />
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="px-6 py-3 border-t bg-muted/20 shrink-0 flex items-center justify-between sm:justify-between">
          {mode === 'view' ? (
            <div className="w-full flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="entity-form"
                size="sm"
                disabled={isSaving}
                className="gap-1.5"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {mode === 'create' ? `Create ${entityName}` : 'Save Changes'}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
