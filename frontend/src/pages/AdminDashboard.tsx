import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Megaphone,
  ClipboardList,
  CheckSquare,
  Users,
  ShieldCheck,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';

const adminModules: {
  icon: LucideIcon;
  label: string;
  desc: string;
  path: string;
}[] = [
  { icon: Megaphone, label: 'All Notices', desc: 'Publish and manage announcements', path: '/admin/notices' },
  { icon: ClipboardList, label: 'All Complaints', desc: 'Review and resolve complaints', path: '/admin/complaints' },
  { icon: CheckSquare, label: 'Outpass Requests', desc: 'Approve or reject outpass requests', path: '/admin/outpasses' },
  { icon: Users, label: 'User Management', desc: 'Manage students and faculty', path: '/admin/users' },
  { icon: ShieldCheck, label: 'Permissions', desc: 'Configure role-based access', path: '/admin/permissions' },
  { icon: UtensilsCrossed, label: 'Mess Management', desc: 'Update mess menus and schedules', path: '/admin/mess' },
];

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Admin Overview
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage campus operations from this dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminModules.map((mod) => (
          <button
            key={mod.label}
            onClick={() => navigate(mod.path)}
            className="flex items-center gap-3 rounded-xl border bg-card p-5 text-left shadow-sm transition-shadow hover:shadow-card"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <mod.icon className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {mod.label}
              </h3>
              <p className="text-xs text-muted-foreground">{mod.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
