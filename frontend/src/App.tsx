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

// Outpasses
const MyOutpasses = React.lazy(() => import('@/pages/outpasses/MyOutpasses').then(module => ({ default: module.MyOutpasses })));
const OutpassCreate = React.lazy(() => import('@/pages/outpasses/OutpassCreate').then(module => ({ default: module.OutpassCreate })));
const OutpassDetail = React.lazy(() => import('@/pages/outpasses/OutpassDetail').then(module => ({ default: module.OutpassDetail })));

// Timetable & Attendance
const TimetableView = React.lazy(() => import('@/pages/timetable/TimetableView').then(module => ({ default: module.TimetableView })));
const AttendanceStats = React.lazy(() => import('@/pages/attendance/AttendanceStats').then(module => ({ default: module.AttendanceStats })));

// Mess
const MessView = React.lazy(() => import('@/pages/mess/MessView').then(module => ({ default: module.MessView })));

// Admin
const StudentManagement = React.lazy(() => import('@/pages/admin/StudentManagement').then(module => ({ default: module.StudentManagement })));
const FacultyManagement = React.lazy(() => import('@/pages/admin/FacultyManagement').then(module => ({ default: module.FacultyManagement })));
const ComplaintManagement = React.lazy(() => import('@/pages/admin/ComplaintManagement').then(module => ({ default: module.ComplaintManagement })));
const OutpassManagement = React.lazy(() => import('@/pages/admin/OutpassManagement').then(module => ({ default: module.OutpassManagement })));
const MessManagement = React.lazy(() => import('@/pages/admin/MessManagement').then(module => ({ default: module.MessManagement })));
const RolesPermissions = React.lazy(() => import('@/pages/admin/RolesPermissions').then(module => ({ default: module.RolesPermissions })));
const DepartmentManagement = React.lazy(() => import('@/pages/admin/DepartmentManagement').then(module => ({ default: module.DepartmentManagement })));
const CourseManagement = React.lazy(() => import('@/pages/admin/CourseManagement').then(module => ({ default: module.CourseManagement })));

import './App.css';

function RoleRedirect() {
  const { role } = useAuth();
  const target = role ? ROLE_ROUTES[role] : '/login';
  return <Navigate to={target} replace />;
}

export function StudentRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
      <Route index element={<StudentDashboard />} />
      <Route path="notices" element={<NoticeList />} />
      <Route path="notices/:id" element={<NoticeDetail />} />
      <Route path="complaints" element={<MyComplaints />} />
      <Route path="complaints/new" element={<ComplaintCreate />} />
      <Route path="complaints/:id" element={<ComplaintDetail />} />
      <Route path="outpasses" element={<MyOutpasses />} />
      <Route path="outpasses/new" element={<OutpassCreate />} />
      <Route path="outpasses/:id" element={<OutpassDetail />} />
      <Route path="timetable" element={<TimetableView />} />
      <Route path="attendance" element={<AttendanceStats />} />
      <Route path="mess" element={<MessView />} />
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
      <Route path="complaints" element={<MyComplaints />} />
      <Route path="complaints/:id" element={<ComplaintDetail />} />
      <Route path="timetable" element={<TimetableView />} />
      <Route path="attendance" element={<AttendanceStats />} />
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
      <Route path="complaints" element={<ComplaintManagement />} />
      <Route path="complaints/:id" element={<ComplaintDetail />} />
      <Route path="outpasses" element={<OutpassManagement />} />
      <Route path="outpasses/:id" element={<OutpassDetail />} />
      <Route path="timetable" element={<TimetableView />} />
      <Route path="attendance" element={<AttendanceStats />} />
      <Route path="mess" element={<MessManagement />} />
      <Route path="students" element={<StudentManagement />} />
      <Route path="users" element={<FacultyManagement />} />
      <Route path="permissions" element={<RolesPermissions />} />
      <Route path="departments" element={<DepartmentManagement />} />
      <Route path="courses" element={<CourseManagement />} />
      <Route path="settings" element={<SystemSettings />} />
      <Route path="profile" element={<Profile />} />
      </Routes>
    </Suspense>
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
      <Route path="/verify-email" element={<VerifyEmail />} />
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
      <Toaster position="top-right" richColors closeButton />
    </QueryProvider>
  );
}

export default App;
