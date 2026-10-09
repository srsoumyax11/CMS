import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { QueryProvider } from '@/context/QueryProvider';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { VerifyEmail } from '@/pages/VerifyEmail';
import { Onboarding } from '@/pages/auth/Onboarding';
import { StudentDashboard } from '@/pages/StudentDashboard';
import { UserDashboard } from '@/pages/UserDashboard';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { Unauthorized } from '@/pages/Unauthorized';
import { Profile } from '@/pages/Profile';
import { Landing } from '@/pages/Landing';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ROLE_ROUTES } from '@/lib/navigation';
import { Toaster } from 'sonner';
import SystemSettings from '@/pages/admin/SystemSettings';

// Notices
const NoticeList = React.lazy(() => import('@/pages/notices/NoticeList').then(module => ({ default: module.NoticeList })));
const NoticeDetail = React.lazy(() => import('@/pages/notices/NoticeDetail').then(module => ({ default: module.NoticeDetail })));
const NoticeCreate = React.lazy(() => import('@/pages/notices/NoticeCreate').then(module => ({ default: module.NoticeCreate })));

// Complaints
const MyComplaints = React.lazy(() => import('@/pages/complaints/MyComplaints').then(module => ({ default: module.MyComplaints })));
const ComplaintCreate = React.lazy(() => import('@/pages/complaints/ComplaintCreate').then(module => ({ default: module.ComplaintCreate })));
const ComplaintDetail = React.lazy(() => import('@/pages/complaints/ComplaintDetail').then(module => ({ default: module.ComplaintDetail })));





const UserManagement = React.lazy(() => import('@/pages/admin/UserManagement').then(module => ({ default: module.UserManagement })));
const StudentManagement = React.lazy(() => import('@/pages/admin/StudentManagement').then(module => ({ default: module.StudentManagement })));
const AllUsersManagement = React.lazy(() => import('@/pages/admin/AllUsersManagement').then(module => ({ default: module.AllUsersManagement })));
const FacultyManagement = React.lazy(() => import('@/pages/admin/FacultyManagement').then(module => ({ default: module.FacultyManagement })));
const ComplaintManagement = React.lazy(() => import('@/pages/admin/ComplaintManagement').then(module => ({ default: module.ComplaintManagement })));
const RolesPermissions = React.lazy(() => import('@/pages/admin/RolesPermissions').then(module => ({ default: module.RolesPermissions })));
const DepartmentManagement = React.lazy(() => import('@/pages/admin/DepartmentManagement').then(module => ({ default: module.DepartmentManagement })));
const CourseManagement = React.lazy(() => import('@/pages/admin/CourseManagement').then(module => ({ default: module.CourseManagement })));
const RoleApplicationsManagement = React.lazy(() => import('@/pages/admin/RoleApplicationsManagement').then(module => ({ default: module.RoleApplicationsManagement })));
const AcademicManagement = React.lazy(() => import('@/pages/admin/AcademicManagement').then(module => ({ default: module.AcademicManagement })));

// Timetable
const PersonalTimetable = React.lazy(() => import('@/pages/timetable/PersonalTimetable').then(module => ({ default: module.PersonalTimetable })));
const TimetableManagement = React.lazy(() => import('@/pages/admin/TimetableManagement').then(module => ({ default: module.TimetableManagement })));

function RoleRedirect() {
  const { role } = useAuth();
  const target = role && ROLE_ROUTES[role] ? ROLE_ROUTES[role] : '/login';
  return <Navigate to={target} replace />;
}

export function UserRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route index element={<UserDashboard />} />
        <Route path="profile" element={<Profile />} />
      </Routes>
    </Suspense>
  );
}

export function StudentRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
      <Route index element={<StudentDashboard />} />
      <Route path="notices" element={<NoticeList />} />
      <Route path="notices/:id" element={<NoticeDetail />} />
      <Route path="timetable" element={<PersonalTimetable />} />
      <Route path="complaints" element={<MyComplaints />} />
      <Route path="complaints/new" element={<ComplaintCreate />} />
      <Route path="complaints/:id" element={<ComplaintDetail />} />
      <Route path="profile" element={<Profile />} />
      </Routes>
    </Suspense>
  );
}

export function FacultyRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
      <Route index element={<StudentDashboard />} />
      <Route path="notices" element={<NoticeList />} />
      <Route path="notices/new" element={<NoticeCreate />} />
      <Route path="notices/:id" element={<NoticeDetail />} />
      <Route path="timetable" element={<PersonalTimetable />} />
      <Route path="complaints" element={<MyComplaints />} />
      <Route path="complaints/:id" element={<ComplaintDetail />} />
      <Route path="profile" element={<Profile />} />
      </Routes>
    </Suspense>
  );
}

export function AdminRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
      <Route index element={<AdminDashboard />} />
      <Route path="notices" element={<NoticeList />} />
      <Route path="notices/new" element={<NoticeCreate />} />
      <Route path="notices/:id" element={<NoticeDetail />} />
      <Route path="role-applications" element={<RoleApplicationsManagement />} />
      <Route path="complaints" element={<ComplaintManagement />} />
      <Route path="complaints/:id" element={<ComplaintDetail />} />
      <Route path="students" element={<Navigate to="/admin/users?tab=student" replace />} />
      <Route path="users" element={<UserManagement />} />
      <Route path="all-users" element={<Navigate to="/admin/users?tab=all" replace />} />
      <Route path="faculty" element={<Navigate to="/admin/users?tab=faculty" replace />} />
      <Route path="permissions" element={<RolesPermissions />} />
      <Route path="academic" element={<AcademicManagement />} />
      <Route path="timetable" element={<TimetableManagement />} />
      <Route path="departments" element={<Navigate to="/admin/academic?tab=departments" replace />} />
      <Route path="courses" element={<Navigate to="/admin/academic?tab=courses" replace />} />
      <Route path="terms" element={<Navigate to="/admin/academic?tab=terms" replace />} />
      <Route path="subjects" element={<Navigate to="/admin/academic?tab=subjects" replace />} />
      <Route path="class-groups" element={<Navigate to="/admin/academic?tab=class-groups" replace />} />
      <Route path="holidays" element={<Navigate to="/admin/academic?tab=holidays" replace />} />
      <Route path="settings" element={<SystemSettings />} />
      <Route path="profile" element={<Profile />} />
      </Routes>
    </Suspense>
  );
}

import { ForgotPassword } from '@/pages/ForgotPassword';

function AppRoutes() {
  const { isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<RoleRedirect />} />

          <Route element={<ProtectedRoute allowedRoles={['user', 'parent']} />}>

            <Route path="/user/*" element={<UserRoutes />} />
            <Route path="/parent/*" element={<UserRoutes />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route path="/student/*" element={<StudentRoutes />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
            <Route path="/faculty/*" element={<FacultyRoutes />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin', 'staff']} />}>
            <Route path="/admin/*" element={<AdminRoutes />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { MaintenanceOverlay } from '@/components/shared/MaintenanceOverlay';

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <MaintenanceOverlay />
        </BrowserRouter>
      </AuthProvider>
      <Toaster position="top-right" richColors closeButton />
    </QueryProvider>
  );
}

export default App;


