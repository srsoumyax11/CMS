import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notificationsApi';
import { attendanceApi } from '@/api/attendanceApi';
import { useAuth } from '@/context/AuthContext';

export interface TabAttentionItem {
  hasAttention: boolean;
  color: string; // TailWind color class for the dot (e.g. 'bg-purple-500', 'bg-amber-400', 'bg-blue-400', 'bg-rose-500')
}

export function useTabAttention() {
  const { user } = useAuth();

  // 1. Notifications query (polls every 30 seconds)
  const { data: notificationsData } = useQuery({
    queryKey: ['my-notifications'],
    queryFn: async () => {
      const res = await notificationsApi.getMyNotifications();
      return res.data;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // 2. Attendance stats query (for students)
  const { data: attendanceStats } = useQuery({
    queryKey: ['my-attendance-stats'],
    queryFn: async () => {
      const res = await attendanceApi.getMyStats();
      return res.data;
    },
    enabled: !!user && user.user_type === 'student',
    refetchInterval: 60000,
  });

  const unreadItems = notificationsData?.items?.filter((i) => !i.is_read) || [];

  // Helper to test if any unread notification link starts with a path prefix
  const hasUnreadLink = (prefix: string) =>
    unreadItems.some((i) => i.link && i.link.includes(prefix));

  // Compute attention mapping for paths
  const attentionMap: Record<string, TabAttentionItem> = {
    '/notices': {
      hasAttention: hasUnreadLink('notice'),
      color: 'bg-purple-500',
    },
    '/gate-passes': {
      hasAttention: hasUnreadLink('gate-pass') || hasUnreadLink('outpass'),
      color: 'bg-amber-400',
    },
    '/documents': {
      hasAttention: hasUnreadLink('document'),
      color: 'bg-blue-400',
    },
    '/complaints': {
      hasAttention: hasUnreadLink('complaint'),
      color: 'bg-rose-500',
    },
    '/attendance': {
      hasAttention:
        (attendanceStats?.overall_shortage ?? false) || hasUnreadLink('attendance'),
      color: 'bg-rose-500',
    },
    '/student/attendance': {
      hasAttention:
        (attendanceStats?.overall_shortage ?? false) || hasUnreadLink('attendance'),
      color: 'bg-rose-500',
    },
    '/admin/complaints': {
      hasAttention: hasUnreadLink('complaint'),
      color: 'bg-rose-500',
    },
    '/admin/notices': {
      hasAttention: hasUnreadLink('notice'),
      color: 'bg-purple-500',
    },
  };

  return {
    unreadNotificationsCount: notificationsData?.unread_count || 0,
    notifications: notificationsData?.items || [],
    attentionMap,
    getAttentionForPath: (path: string): TabAttentionItem | null => {
      // Direct match
      if (attentionMap[path]) return attentionMap[path];
      // Prefix match
      const matchedKey = Object.keys(attentionMap).find(
        (key) => path.startsWith(key) && key !== '/'
      );
      return matchedKey ? attentionMap[matchedKey] : null;
    },
  };
}
