import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { QueryProvider } from '@/context/QueryProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Onboarding } from '@/pages/auth/Onboarding';
import { StudentDashboard } from '@/pages/StudentDashboard';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { Unauthorized } from '@/pages/Unauthorized';
import { Profile } from '@/pages/Profile';
import { Landing } from '@/pages/Landing';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ROLE_ROUTES } from '@/lib/navigation';
import { Toaster } from 'sonner';
import SystemSettings from '@/pages/admin/SystemSettings';

// Notices
import { NoticeList } from '@/pages/notices/NoticeList';
import { NoticeDetail } from '@/pages/notices/NoticeDetail';
import { NoticeCreate } from '@/pages/notices/NoticeCreate';

// Complaints
import { MyComplaints } from '@/pages/complaints/MyComplaints';
import { ComplaintCreate } from '@/pages/complaints/ComplaintCreate';
import { ComplaintDetail } from '@/pages/complaints/ComplaintDetail';

// Outpasses
import { MyOutpasses } from '@/pages/outpasses/MyOutpasses';
import { OutpassCreate } from '@/pages/outpasses/OutpassCreate';
import { OutpassDetail } from '@/pages/outpasses/OutpassDetail';

// Timetable & Attendance
import { TimetableView } from '@/pages/timetable/TimetableView';
import { AttendanceStats } from '@/pages/attendance/AttendanceStats';

// Mess
import { MessView } from '@/pages/mess/MessView';

// Admin
import { StudentManagement } from '@/pages/admin/StudentManagement';
import { FacultyManagement } from '@/pages/admin/FacultyManagement';
import { ComplaintManagement } from '@/pages/admin/ComplaintManagement';
import { OutpassManagement } from '@/pages/admin/OutpassManagement';
import { MessManagement } from '@/pages/admin/MessManagement';
import { RolesPermissions } from '@/pages/admin/RolesPermissions';

import './App.css';

function RoleRedirect() {
  const { role } = useAuth();
  const target = role ? ROLE_ROUTES[role] : '/login';
  return <Navigate to={target} replace />;
}

export function StudentRoutes() {
  return (
    <Routes>
      <Route index element={<StudentDashboard />} />
      <Route path="notices" element={<NoticeList basePath="/student" />} />
      <Route path="notices/:id" element={<NoticeDetail />} />
      <Route path="complaints" element={<MyComplaints basePath="/student" />} />
      <Route path="complaints/new" element={<ComplaintCreate basePath="/student" />} />
      <Route path="complaints/:id" element={<ComplaintDetail />} />
      <Route path="outpasses" element={<MyOutpasses basePath="/student" />} />
      <Route path="outpasses/new" element={<OutpassCreate basePath="/student" />} />
      <Route path="outpasses/:id" element={<OutpassDetail />} />
      <Route path="timetable" element={<TimetableView />} />
      <Route path="attendance" element={<AttendanceStats />} />
      <Route path="mess" element={<MessView />} />
      <Route path="profile" element={<Profile />} />
    </Routes>
  );
}

export function FacultyRoutes() {
  return (
    <Routes>
      <Route index element={<StudentDashboard basePath="/faculty" />} />
      <Route path="notices" element={<NoticeList basePath="/faculty" canCreate />} />
      <Route path="notices/new" element={<NoticeCreate />} />
      <Route path="notices/:id" element={<NoticeDetail />} />
      <Route path="complaints" element={<MyComplaints basePath="/faculty" />} />
      <Route path="complaints/:id" element={<ComplaintDetail />} />
      <Route path="timetable" element={<TimetableView />} />
      <Route path="attendance" element={<AttendanceStats />} />
      <Route path="profile" element={<Profile />} />
    </Routes>
  );
}

export function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="notices" element={<NoticeList basePath="/admin/notices" canCreate />} />
      <Route path="notices/new" element={<NoticeCreate />} />
      <Route path="notices/:id" element={<NoticeDetail />} />
      <Route path="complaints" element={<ComplaintManagement />} />
      <Route path="complaints/:id" element={<ComplaintDetail />} />
      <Route path="outpasses" element={<OutpassManagement />} />
      <Route path="outpasses/:id" element={<OutpassDetail />} />
      <Route path="timetable" element={<TimetableView />} />
      <Route path="attendance" element={<AttendanceStats />} />
      <Route path="mess" element={<MessManagement />} />
      <Route path="users" element={<StudentManagement />} />
      <Route path="faculty" element={<FacultyManagement />} />
      <Route path="permissions" element={<RolesPermissions />} />
      <Route path="settings" element={<SystemSettings />} />
      <Route path="profile" element={<Profile />} />
    </Routes>
  );
}

function AppRoutes() {
  const { isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<RoleRedirect />} />

          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student/*" element={<StudentRoutes />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
            <Route path="/faculty/*" element={<FacultyRoutes />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/*" element={<AdminRoutes />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
      <Toaster position="bottom-right" richColors closeButton />
    </QueryProvider>
  );
}

export default App;
