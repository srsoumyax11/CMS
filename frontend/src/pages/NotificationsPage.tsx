import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Check,
  Search,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { notificationsApi } from '@/api/notificationsApi';
import { useTabAttention } from '@/hooks/useTabAttention';
import type { NotificationResponse, NotificationType } from '@/types/api';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { notifications, unreadNotificationsCount } = useTabAttention();

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  const renderTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive shrink-0" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-primary shrink-0" />;
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === 'unread' && item.is_read) return false;
    if (
      searchTerm &&
      !item.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !item.message.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Standard System Page Header */}
      <PageHeader
        title="Notification Center"
        description="Stay updated with system alerts, gate pass decisions, notices, and workflow reviews."
        icon={Bell}
        actions={
          unreadNotificationsCount > 0 ? (
            <Button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="gap-1.5 shadow-xs"
            >
              <CheckCheck className="h-4 w-4" />
              Mark All as Read ({unreadNotificationsCount})
            </Button>
          ) : undefined
        }
      />

      {/* Filter Tabs & Search Controls */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('all')}
            className="text-xs font-semibold"
          >
            All ({notifications.length})
          </Button>
          <Button
            variant={activeTab === 'unread' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('unread')}
            className="text-xs font-semibold"
          >
            Unread Only ({unreadNotificationsCount})
          </Button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-2.5" />
          <Input
            type="text"
            placeholder="Search alerts by keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <Card className="border border-border">
            <CardContent className="p-12 text-center text-muted-foreground text-sm">
              No notifications match your current filter.
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((item) => (
            <Card
              key={item.id}
              className={cn(
                "transition border shadow-2xs hover:border-primary/40",
                !item.is_read ? "border-primary/30 bg-accent/15" : "bg-card border-border"
              )}
            >
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5">{renderTypeIcon(item.type)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={cn("text-sm font-semibold", !item.is_read ? "text-foreground font-bold" : "text-foreground/90")}>
                        {item.title}
                      </h3>
                      {!item.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" title="Unread" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {item.link && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!item.is_read) markReadMutation.mutate(item.id);
                        navigate(item.link!);
                      }}
                      className="gap-1.5 text-xs h-8"
                    >
                      View Details
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}

                  {!item.is_read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => markReadMutation.mutate(item.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
