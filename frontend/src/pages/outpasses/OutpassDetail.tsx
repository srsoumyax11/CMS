import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { outpassesApi } from '@/api/outpassesApi';
import { QUERY_KEYS } from '@/lib/constants';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function OutpassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancel, setShowCancel] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.OUTPASS, id],
    queryFn: () => outpassesApi.getById(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: () => outpassesApi.cancel(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.OUTPASS, id] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_OUTPASSES] });
      toast.success('Outpass cancelled');
      setShowCancel(false);
    },
    onError: () => toast.error('Failed to cancel outpass'),
  });

  const outpass = data?.data?.data;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !outpass) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  const canCancel = outpass.status === 'pending' || outpass.status === 'approved';

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Outpasses
      </Button>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl">{outpass.destination}</CardTitle>
            <div className="flex items-center gap-2">
              <StatusBadge status={outpass.status} type="outpass" />
              {outpass.is_overdue && (
                <Badge variant="destructive" className="text-xs">
                  {outpass.overdue_hours}h overdue
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Reason</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{outpass.reason}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Departure</p>
              <p className="text-sm text-foreground">
                {format(new Date(outpass.departure_time), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Expected Return</p>
              <p className="text-sm text-foreground">
                {format(new Date(outpass.expected_return_time), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
          </div>

          {outpass.actual_return_time && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Actual Return</p>
              <p className="text-sm text-foreground">
                {format(new Date(outpass.actual_return_time), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground">Submitted</p>
            <p className="text-sm text-foreground">
              {format(new Date(outpass.created_at), 'MMM d, yyyy HH:mm')}
            </p>
          </div>

          {canCancel && (
            <div className="pt-2">
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowCancel(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Outpass
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showCancel}
        onOpenChange={setShowCancel}
        title="Cancel this outpass?"
        description="This will cancel your outpass request. This action cannot be undone."
        confirmLabel="Yes, cancel it"
        variant="destructive"
        onConfirm={() => cancelMutation.mutate()}
      />
    </div>
  );
}
