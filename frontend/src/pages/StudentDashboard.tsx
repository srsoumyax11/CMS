import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Megaphone,
  ClipboardList,
  CheckSquare,
  CalendarDays,
  UtensilsCrossed,
  BookOpen,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

const quickLinks: {
  icon: LucideIcon;
  label: string;
  desc: string;
  path: string;
}[] = [
  { icon: Megaphone, label: 'Notices', desc: 'View latest announcements', path: '/student/notices' },
  { icon: ClipboardList, label: 'My Complaints', desc: 'Track and file complaints', path: '/student/complaints' },
  { icon: CheckSquare, label: 'Outpasses', desc: 'Request and manage outpasses', path: '/student/outpasses' },
  { icon: CalendarDays, label: 'Timetable', desc: 'Check your class schedule', path: '/student/timetable' },
  { icon: UtensilsCrossed, label: 'Mess Menu', desc: "Today's mess menu", path: '/student/mess' },
  { icon: BookOpen, label: 'Attendance', desc: 'View your attendance records', path: '/student/attendance' },
];

interface StudentDashboardProps {
  basePath?: string;
}

export function StudentDashboard({ basePath = '/student' }: StudentDashboardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const links = quickLinks.map((link) => ({
    ...link,
    path: link.path.replace('/student', basePath),
  }));

  return (
    <div className="space-y-6">
      {user.account_status === 'pending' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex flex-col">
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">Account Under Review</h3>
            <p className="text-sm mt-1">
              Your account has been created and your basic details are submitted. An administrator must verify and approve your account before you can access all features. You will be notified once approved. You can explore basic features in the meantime.
            </p>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Welcome back, {user.name?.split(' ')[0] || 'Student'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's what's happening on campus today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <button
            key={link.label}
            onClick={() => navigate(link.path)}
            className="flex items-center gap-3 rounded-xl border bg-card p-5 text-left shadow-sm transition-shadow hover:shadow-card"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <link.icon className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {link.label}
              </h3>
              <p className="text-xs text-muted-foreground">{link.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
