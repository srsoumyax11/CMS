import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noticesApi } from '@/api/noticesApi';
import { QUERY_KEYS } from '@/lib/constants';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { UI_CONFIG } from '@/config';

export function NoticeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.NOTICE, id],
    queryFn: () => noticesApi.getById(id!),
    enabled: !!id,
  });

  const markReadMutation = useMutation({
    mutationFn: () => noticesApi.markRead(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTICES] });
    },
  });

  useEffect(() => {
    if (id) markReadMutation.mutate();
  }, [id]);

  const deleteMutation = useMutation({
    mutationFn: () => noticesApi.delete(id!),
    onSuccess: () => {
      // Optimistically remove from list cache so the user doesn't see it when navigating back
      if (UI_CONFIG.ENABLE_OPTIMISTIC_UPDATES) {
        queryClient.setQueryData([QUERY_KEYS.NOTICES], (oldData: any) => {
          if (!oldData?.data?.data?.items) return oldData;
          return {
            ...oldData,
            data: {
              ...oldData.data,
              data: {
                ...oldData.data.data,
                items: oldData.data.data.items.filter((item: any) => item.id !== id),
              }
            }
          };
        });
      }
      // Remove detail query to prevent 404s
      queryClient.removeQueries({ queryKey: [QUERY_KEYS.NOTICE, id] });
      
      // Still invalidate list in background to ensure sync
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTICES] });
      toast.success('Notice deleted');
      navigate(-1);
    },
    onError: () => toast.error('Failed to delete notice'),
  });

  const notice = data?.data?.data;

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

  if (error || !notice) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Notices
      </Button>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{notice.title}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {format(new Date(notice.created_at), 'MMMM d, yyyy')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {notice.content}
          </p>
          {notice.attachment_url && (() => {
            const isImage = /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(notice.attachment_url);
            
            if (isImage) {
              return (
                <div className="mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Attachment</p>
                  <a 
                    href={notice.attachment_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block max-w-2xl rounded-lg overflow-hidden border bg-muted/30 hover:opacity-90 transition-opacity"
                  >
                    <img 
                      src={notice.attachment_url} 
                      alt="Attachment" 
                      className="max-h-96 w-full object-contain"
                    />
                  </a>
                </div>
              );
            }

            return (
              <a
                href={notice.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-primary hover:bg-accent"
              >
                <FileText className="h-4 w-4" />
                View Attachment
              </a>
            );
          })()}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Notice?"
        description="Are you sure you want to permanently delete this notice? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          deleteMutation.mutate();
        }}
      />
    </div>
  );
}
