import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { notificationsApi } from '@/api/notificationsApi';
import { useTabAttention } from '@/hooks/useTabAttention';
import type { NotificationResponse, NotificationType } from '@/types/api';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function NotificationBellDropdown() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { unreadNotificationsCount, notifications } = useTabAttention();

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

  const handleItemClick = (item: NotificationResponse) => {
    if (!item.is_read) {
      markReadMutation.mutate(item.id);
    }
    if (item.link) {
      setIsOpen(false);
      navigate(item.link);
    }
  };

  const renderTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs animate-pulse">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-lg border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Notifications
            </span>
            {unreadNotificationsCount > 0 && (
              <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">
                {unreadNotificationsCount} unread
              </Badge>
            )}
          </div>

          {unreadNotificationsCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="h-auto p-0 text-[11px] font-medium text-muted-foreground hover:text-primary gap-1"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs">
              No notifications yet. You're all caught up!
            </div>
          ) : (
            notifications.slice(0, 10).map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={cn(
                  "p-3.5 flex items-start gap-3 hover:bg-accent/60 cursor-pointer transition",
                  !item.is_read ? "bg-accent/20" : "opacity-80"
                )}
              >
                {renderTypeIcon(item.type)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4
                      className={cn(
                        "text-xs truncate",
                        !item.is_read ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                      )}
                    >
                      {item.title}
                    </h4>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatTime(item.created_at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                    {item.message}
                  </p>
                </div>

                {!item.is_read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      markReadMutation.mutate(item.id);
                    }}
                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                    title="Mark as read"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer View All Link */}
        <div className="p-2 border-t bg-muted/40 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsOpen(false);
              navigate('/notifications');
            }}
            className="w-full text-xs font-medium text-primary hover:text-primary/80 gap-1.5"
          >
            View all notifications
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
