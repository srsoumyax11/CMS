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

// Outpasses
const MyOutpasses = React.lazy(() => import('@/pages/outpasses/MyOutpasses').then(module => ({ default: module.MyOutpasses })));
const OutpassCreate = React.lazy(() => import('@/pages/outpasses/OutpassCreate').then(module => ({ default: module.OutpassCreate })));
const OutpassDetail = React.lazy(() => import('@/pages/outpasses/OutpassDetail').then(module => ({ default: module.OutpassDetail })));

// Timetable & Attendance
const TimetableView = React.lazy(() => import('@/pages/timetable/TimetableView').then(module => ({ default: module.TimetableView })));
const AttendanceStats = React.lazy(() => import('@/pages/attendance/AttendanceStats').then(module => ({ default: module.AttendanceStats })));
const FacultyAttendance = React.lazy(() => import('@/pages/attendance/FacultyAttendance').then(module => ({ default: module.FacultyAttendance })));


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
const AudienceGroupManagement = React.lazy(() => import('@/pages/admin/AudienceGroupManagement').then(module => ({ default: module.AudienceGroupManagement })));
const DocumentProcessing = React.lazy(() => import('@/pages/admin/DocumentProcessing').then(module => ({ default: module.DocumentProcessing })));
const MyDocuments = React.lazy(() => import('@/pages/documents/MyDocuments').then(module => ({ default: module.MyDocuments })));
const GateLogsManagement = React.lazy(() => import('@/pages/admin/GateLogsManagement').then(module => ({ default: module.GateLogsManagement })));
const RoleApplicationsManagement = React.lazy(() => import('@/pages/admin/RoleApplicationsManagement').then(module => ({ default: module.RoleApplicationsManagement })));
const FeeManagement = React.lazy(() => import('@/pages/admin/FeeManagement').then(module => ({ default: module.FeeManagement })));

const MyFees = React.lazy(() => import('@/pages/finance/MyFees').then(module => ({ default: module.MyFees })));

// Gate Pass & Parent Safety Matrix
const GateGuardScanner = React.lazy(() => import('@/pages/GateGuardScanner').then(module => ({ default: module.GateGuardScanner })));
const ParentSafetyDashboard = React.lazy(() => import('@/pages/ParentSafetyDashboard').then(module => ({ default: module.ParentSafetyDashboard })));



import './App.css';

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
      <Route path="complaints" element={<MyComplaints />} />
      <Route path="complaints/new" element={<ComplaintCreate />} />
      <Route path="complaints/:id" element={<ComplaintDetail />} />
      <Route path="outpasses" element={<MyOutpasses />} />
      <Route path="outpasses/new" element={<OutpassCreate />} />
      <Route path="outpasses/:id" element={<OutpassDetail />} />
      <Route path="timetable" element={<TimetableView />} />
      <Route path="attendance" element={<AttendanceStats />} />
      <Route path="mess" element={<MessView />} />
      <Route path="documents" element={<MyDocuments />} />
      <Route path="fees" element={<MyFees />} />
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
      <Route path="attendance" element={<FacultyAttendance />} />
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
      <Route path="audience-groups" element={<AudienceGroupManagement />} />
      <Route path="documents" element={<DocumentProcessing />} />
      <Route path="gate-logs" element={<GateLogsManagement />} />
      <Route path="fees" element={<FeeManagement />} />
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
          <Route path="/parent/safety" element={<ParentSafetyDashboard />} />
          <Route path="/guard/scan" element={<GateGuardScanner />} />

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
