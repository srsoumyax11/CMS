import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complaintsApi } from '@/api/complaintsApi';
import { QUERY_KEYS } from '@/lib/constants';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ImageIcon, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import type { ComplaintCategory } from '@/types/api';

const categoryLabels: Record<ComplaintCategory, string> = {
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  wifi: 'Wi-Fi',
  cleanliness: 'Cleanliness',
  furniture: 'Furniture',
  security: 'Security',
  other: 'Other',
};

export function ComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.COMPLAINT, id],
    queryFn: () => complaintsApi.getById(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => complaintsApi.cancel(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.COMPLAINT, id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_COMPLAINTS] });
      toast.success('Complaint cancelled');
      setShowCancel(false);
    },
    onError: () => toast.error('Failed to cancel complaint'),
  });

  const complaint = data?.data?.data;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  const canCancel = complaint.status === 'open' || complaint.status === 'in_progress';

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Complaints
      </Button>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">
                {categoryLabels[complaint.category]} Complaint
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Filed on {format(new Date(complaint.created_at), 'MMMM d, yyyy')}
              </p>
            </div>
            <StatusBadge status={complaint.status} type="complaint" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Location</p>
              <p className="text-sm text-foreground">
                {complaint.location_hostel}
                {complaint.location_room ? ` · Room ${complaint.location_room}` : ''}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Visibility</p>
              <p className="text-sm capitalize text-foreground">{complaint.visibility}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Description</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {complaint.description}
            </p>
          </div>

          {complaint.photo_url && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Photo</p>
              <a
                href={complaint.photo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-primary hover:bg-accent"
              >
                <ImageIcon className="h-4 w-4" />
                View Photo
              </a>
            </div>
          )}

          {complaint.updated_at && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Last Updated</p>
              <p className="text-sm text-foreground">
                {format(new Date(complaint.updated_at), 'MMMM d, yyyy')}
              </p>
            </div>
          )}

          {canCancel && (
            <div className="pt-2">
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowCancel(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Complaint
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showCancel}
        onOpenChange={setShowCancel}
        title="Cancel this complaint?"
        description="This will mark the complaint as cancelled. This action cannot be undone."
        confirmLabel="Yes, cancel it"
        variant="destructive"
        onConfirm={() => cancelMutation.mutate()}
      />
    </div>
  );
}
