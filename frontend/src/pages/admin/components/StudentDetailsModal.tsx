import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { StudentItemResponse } from '@/types/api';

interface StudentDetailsModalProps {
  student: StudentItemResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

export function StudentDetailsModal({ student, isOpen, onClose }: StudentDetailsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Student Details</DialogTitle>
        </DialogHeader>
        {student && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 border-b pb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{student.name}</h3>
                <p className="text-sm text-muted-foreground">{student.course_name} · {student.branch_name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Registration No.</p>
                <p className="font-medium text-foreground">{student.user_id || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Email Address</p>
                <p className="font-medium text-foreground truncate" title={student.email}>
                  {student.email}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Batch/Year</p>
                <p className="font-medium text-foreground">{student.year}</p>
              </div>
              <div className="space-y-1"></div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Account Status</p>
                <div className="mt-1">
                  <StatusBadge status={student.account_status} type="account" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Academic Status</p>
                <div className="mt-1">
                  {student.academic_status ? (
                    <StatusBadge status={student.academic_status} type="academic" />
                  ) : (
                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">
                      Incomplete
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
