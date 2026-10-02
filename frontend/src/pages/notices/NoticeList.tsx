import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { noticesApi } from '@/api/noticesApi';
import { QUERY_KEYS, NOTICE_PAGE_SIZE } from '@/lib/constants';
import { DataTable } from '@/components/shared/DataTable';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Megaphone, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { NoticeResponse } from '@/types/api';
import { useAuth } from '@/context/AuthContext';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

export function NoticeList() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const basePath = role ? `/${role}` : '';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.NOTICES],
    queryFn: () => noticesApi.list({ limit: NOTICE_PAGE_SIZE }),
  });

  const notices = data?.data?.data?.items ?? [];

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (row: NoticeResponse) => (
        <div className="flex items-center gap-2">
          {!row.is_read && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
          )}
          <span className="font-medium text-foreground">{row.title}</span>
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (row: NoticeResponse) =>
        format(new Date(row.created_at), 'MMM d, yyyy'),
    },
    {
      key: 'attachment',
      header: 'Attachment',
      render: (row: NoticeResponse) =>
        row.attachment_url ? (
          <a
            href={row.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <FileText className="h-3.5 w-3.5" />
            View
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  if (error) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Notices</h2>
          <p className="text-sm text-muted-foreground">
            Campus announcements and updates
          </p>
        </div>
        <PermissionGuard permission="notices:create">
          <Button onClick={() => navigate(`${basePath}/notices/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            New Notice
          </Button>
        </PermissionGuard>
      </div>

      <DataTable
        columns={columns}
        data={notices}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`${basePath}/notices/${row.id}`)}
        emptyTitle="No notices yet"
        emptyDescription="There are no announcements to display right now."
        emptyIcon={<Megaphone className="h-6 w-6" />}
      />
    </div>
  );
}
