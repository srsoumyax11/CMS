import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { complaintsApi } from '@/api/complaintsApi';
import { adminApi } from '@/api/adminApi';
import { mapApi } from '@/api/mapApi';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { OnboardingWidget } from '@/components/admin/OnboardingWidget';
import {
  Megaphone,
  ClipboardList,
  CheckSquare,
  Users,
  ShieldCheck,
  UtensilsCrossed,
  Activity,
  AlertTriangle,
  Clock,
  LayoutDashboard,
  UserCheck,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const adminModules: {
  icon: LucideIcon;
  label: string;
  desc: string;
  path: string;
}[] = [
  { icon: UserCheck, label: 'Role Requests', desc: 'Approve applications', path: '/admin/role-applications' },
  { icon: Megaphone, label: 'Notices', desc: 'Manage announcements', path: '/admin/notices' },
  { icon: ClipboardList, label: 'Complaints', desc: 'Resolve issues', path: '/admin/complaints' },
  { icon: Users, label: 'Users', desc: 'Manage students', path: '/admin/users' },
  { icon: ShieldCheck, label: 'Permissions', desc: 'Access control', path: '/admin/permissions' },
  { icon: MapPin, label: 'Spatial Studio', desc: 'Buildings & maps', path: '/admin/spatial' },
];


export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: complaintsResp } = useQuery({
    queryKey: ['admin-complaints-stats'],
    queryFn: () => complaintsApi.listAll(),
    enabled: !!user,
  });

  const { data: studentsResp } = useQuery({
    queryKey: ['admin-students-stats'],
    queryFn: () => adminApi.listStudents(),
    enabled: !!user,
  });

  const { data: mapResp } = useQuery({
    queryKey: ['admin-map-stats'],
    queryFn: () => mapApi.listLocations({ limit: 500 }),
    enabled: !!user,
  });

  if (!user) return null;

  const complaints = complaintsResp?.data?.data?.items || [];
  const openComplaints = complaints.filter((c: any) => c.status === 'open' || c.status === 'in_progress').length;
  
  const students = studentsResp?.data?.data || [];
  const pendingStudents = students.filter((s: any) => s.account_status === 'pending').length;

  const totalMapLocations = mapResp?.data?.items?.length ?? 0;

  // Chart data
  const categoryCounts = complaints.reduce((acc: Record<string, number>, c: any) => {
    acc[c.category] = (acc[c.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(categoryCounts).map(([name, count]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    Issues: count,
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PageHeader
        title="Admin Overview"
        description="Real-time campus operational intelligence."
        icon={LayoutDashboard}
      />


      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={AlertTriangle}
          label="Open Complaints"
          value={openComplaints}
          hint="Requires immediate attention"
          className="border-warning/30 bg-warning/10 text-warning-foreground"
        />
        <StatCard
          icon={Clock}
          label="Pending Students"
          value={pendingStudents}
          hint="Awaiting account approval"
          className="border-info/30 bg-info/10 text-info-foreground"
        />
        <StatCard
          icon={MapPin}
          label="Spatial Locations"
          value={totalMapLocations}
          hint="Campus buildings & nodes"
          className="border-primary/30 bg-primary/10 text-primary"
        />
      </div>


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Issues by Category</h3>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--accent))' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="Issues" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col">
          <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
          <div className="flex-1 grid grid-cols-2 gap-3">
            {adminModules.map((mod) => (
              <button
                key={mod.label}
                onClick={() => navigate(mod.path)}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-background p-3 text-center transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <mod.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{mod.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
