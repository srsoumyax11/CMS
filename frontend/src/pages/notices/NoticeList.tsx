import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { noticesApi } from '@/api/noticesApi';
import { QUERY_KEYS, NOTICE_PAGE_SIZE } from '@/lib/constants';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ProTable, type ProColumn } from '@/components/shared/pro-table';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Megaphone } from 'lucide-react';
import { format } from 'date-fns';
import type { NoticeResponse } from '@/types/api';
import { useAuth } from '@/context/AuthContext';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PERMISSIONS } from '@/config/permissions';

export function NoticeList() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const basePath = role ? `/${role}` : '';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [QUERY_KEYS.NOTICES],
    queryFn: () => noticesApi.list({ limit: NOTICE_PAGE_SIZE }),
  });

  const notices = data?.data?.data?.items ?? [];

  const columns: ProColumn<NoticeResponse>[] = [
    {
      id: 'title',
      header: 'Notice Title',
      accessorKey: 'title',
      cell: (val, row) => (
        <div className="flex items-center gap-2.5">
          {!row.is_read ? (
            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" title="Unread notice" />
          ) : (
            <span className="h-2 w-2 shrink-0 rounded-full bg-transparent" />
          )}
          <span className="font-semibold text-foreground">{row.title}</span>
        </div>
      ),
      sortable: true,
    },
    {
      id: 'created_at',
      header: 'Published Date',
      accessorKey: 'created_at',
      cell: (val) => (
        <span className="text-xs text-muted-foreground">
          {val ? format(new Date(val), 'MMM d, yyyy') : '—'}
        </span>
      ),
      sortable: true,
      width: '150px',
    },
    {
      id: 'attachment',
      header: 'Attachment',
      cell: (val, row) =>
        row.attachment_url ? (
          <a
            href={row.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <FileText className="h-3.5 w-3.5" />
            View File
          </a>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
      width: '130px',
      sortable: false,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <PermissionGuard permission={PERMISSIONS.NOTICE.CREATE}>
            <Button onClick={() => navigate(`${basePath}/notices/new`)} className="gap-1.5 shadow-xs">
              <Plus className="h-4 w-4" />
              New Notice
            </Button>
          </PermissionGuard>
        }
      />

      <ProTable
        columns={columns}
        data={notices}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`${basePath}/notices/${row.id}`)}
        searchPlaceholder="Search notices by title..."
        exportFileName="campus-notices"
        emptyTitle="No notices yet"
        emptyDescription="There are no campus announcements published right now."
        emptyIcon={<Megaphone className="h-8 w-8 text-muted-foreground" />}
      />
    </div>
  );
}
export default NoticeList;
