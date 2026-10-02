import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AccountStatus, AcademicStatus } from '@/types/api';
import { useState } from 'react';

export type UpdateActionPayload = {
  id: string;
  payload: { account_status?: AccountStatus; academic_status?: AcademicStatus; status_note?: string };
  label: string;
};

interface StudentActionModalProps {
  action: UpdateActionPayload | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string, payload: any) => void;
}

export function StudentActionModal({ action, isOpen, onClose, onConfirm }: StudentActionModalProps) {
  const [statusNote, setStatusNote] = useState('');

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
      setStatusNote('');
    }
  };

  const handleConfirm = () => {
    if (action) {
      onConfirm(action.id, { ...action.payload, status_note: statusNote || undefined });
      setStatusNote('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action ? `Confirm Update` : 'Confirm Action'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            {action ? `Are you sure you want to ${action.label}?` : ''}
          </p>
          {action && ['revision', 'suspended', 'rejected'].includes(action.payload.account_status ?? '') && (
            <div className="space-y-2">
              <Label htmlFor="status_note">Reason / Note (Optional)</Label>
              <Textarea
                id="status_note"
                placeholder="Provide a reason for this status change..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
