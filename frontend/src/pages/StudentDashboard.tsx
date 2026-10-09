import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { noticesApi } from '@/api/noticesApi';
import { complaintsApi } from '@/api/complaintsApi';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import {
  Megaphone,
  ClipboardList,
  CheckSquare,
  CalendarDays,
  UtensilsCrossed,
  BookOpen,
  ChevronRight,
  LayoutDashboard,
  Key,
  type LucideIcon,
} from 'lucide-react';
import { StudentHostelCard } from '@/components/StudentHostelCard';

export function StudentDashboard() {

  const { user, role } = useAuth();
  const navigate = useNavigate();
  const basePath = role ? `/${role}` : '';
  
  const quickLinks = [
    { icon: Megaphone, label: 'Notices', desc: 'Announcements', path: `${basePath}/notices` },
    { icon: ClipboardList, label: 'Complaints', desc: 'Track issues', path: `${basePath}/complaints` },
    { icon: CalendarDays, label: 'Timetable', desc: 'Schedule', path: `${basePath}/timetable` },
    { icon: Key, label: 'Gate Passes', desc: 'Leave passes', path: '/gate-passes' },
  ];

  const { data: noticesResp } = useQuery({
    queryKey: ['student-notices-recent'],
    queryFn: () => noticesApi.list(),
    enabled: !!user && user.account_status === 'active',
  });

  const { data: complaintsResp } = useQuery({
    queryKey: ['student-complaints-recent'],
    queryFn: () => complaintsApi.getMine(),
    enabled: !!user && user.account_status === 'active',
  });

  if (!user) return null;

  const links = quickLinks.map((link) => ({
    ...link,
    path: link.path.replace('/student', basePath),
  }));

  const notices = (noticesResp?.data?.data?.items || []).slice(0, 3);
  const activeComplaints = (complaintsResp?.data?.data?.items || []).filter((c: any) => c.status !== 'closed' && c.status !== 'resolved').slice(0, 3);
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {user.account_status === 'pending' && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Registration Status</h3>
          <div className="flex items-center">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">1</div>
              <span className="mt-2 text-xs font-medium">Submitted</span>
            </div>
            <div className="mx-4 h-[2px] flex-1 bg-primary/20"></div>
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground animate-pulse">2</div>
              <span className="mt-2 text-xs font-medium">Under Review</span>
            </div>
            <div className="mx-4 h-[2px] flex-1 bg-border"></div>
            <div className="flex flex-col items-center opacity-50">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground border">3</div>
              <span className="mt-2 text-xs font-medium">Approved</span>
            </div>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Your details have been submitted successfully. An administrator is currently reviewing your account. You will be granted full access once approved.
          </p>
        </div>
      )}

      <PageHeader
        title={`Welcome back, ${user.name?.split(' ')[0] || 'Student'}`}
        description="Here's your campus digest."
        icon={LayoutDashboard}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {links.map((link) => (
          <button
            key={link.label}
            onClick={() => navigate(link.path)}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card p-4 text-center shadow-sm transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-card"
          >
            <link.icon className="h-6 w-6" />
            <span className="text-xs font-medium">{link.label}</span>
          </button>
        ))}
      </div>

      {user.account_status === 'active' && (
        <div className="space-y-6">
          <StudentHostelCard />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* My Requests Column */}
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col h-full">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold">Active Requests</h3>
                <button onClick={() => navigate(basePath + '/complaints')} className="text-xs font-medium text-primary hover:underline">View All</button>
              </div>
              
              <div className="space-y-3 flex-1">
                {activeComplaints.length === 0 ? (
                   <div className="flex h-32 flex-col items-center justify-center text-center text-muted-foreground rounded-lg border border-dashed">
                     <p className="text-sm">No active requests.</p>
                   </div>
                ) : (
                  <>
                    
                    {activeComplaints.map((complaint: any) => (
                      <div key={complaint.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer" onClick={() => navigate(basePath + '/complaints')}>
                        <div>
                          <p className="text-sm font-medium truncate w-40">{complaint.category.toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground truncate w-40">{complaint.description}</p>
                        </div>
                        <StatusBadge status={complaint.status} type="complaint" />
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Notices Column */}
          <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-col h-full">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Recent Notices</h3>
              <button onClick={() => navigate(basePath + '/notices')} className="text-xs font-medium text-primary hover:underline">View All</button>
            </div>
            
            <div className="space-y-3 flex-1">
              {notices.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center text-center text-muted-foreground rounded-lg border border-dashed">
                  <p className="text-sm">No new notices.</p>
                </div>
              ) : (
                notices.map((notice: any) => (
                  <div key={notice.id} className="group flex items-start justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer" onClick={() => navigate(basePath + '/notices')}>
                    <div>
                      <p className="text-sm font-medium leading-none mb-1 group-hover:text-primary transition-colors">{notice.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{notice.content}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
