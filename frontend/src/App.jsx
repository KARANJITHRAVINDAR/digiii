import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './router/ProtectedRoute';
import { RoleProtectedRoute } from './router/RoleProtectedRoute';

// Public Pages
import { Login } from './pages/Login';
import { NotFound } from './pages/NotFound';
import { NotificationsPage } from './pages/NotificationsPage';

// Student Pages
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentAttendance } from './pages/student/StudentAttendance';
import { StudentDisputes } from './pages/student/StudentDisputes';

// Teacher Pages
import { TeacherDashboard } from './pages/TeacherDashboard';
import { TeacherAttendance } from './pages/teacher/TeacherAttendance';
import { TeacherDisputes } from './pages/teacher/TeacherDisputes';

// HOD Pages
import { HodDashboard } from './pages/HodDashboard';
import { HodDisputes } from './pages/hod/HodDisputes';

// Admin Pages
import { AdminDashboard } from './pages/AdminDashboard';
import { UserManager } from './pages/admin/UserManager';
import { CourseManager } from './pages/admin/CourseManager';
import { DepartmentManager } from './pages/admin/DepartmentManager';
import { CorrectionWindowManager } from './pages/admin/CorrectionWindowManager';
import { DisputeMonitor } from './pages/admin/DisputeMonitor';
import { AuditLogViewer } from './pages/admin/AuditLogViewer';
import { EmailOutboxViewer } from './pages/admin/EmailOutboxViewer';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            {/* Common Notification Route */}
            <Route path="/notifications" element={<NotificationsPage />} />

            {/* Student Routes */}
            <Route
              path="/student"
              element={
                <RoleProtectedRoute allowedRoles={['STUDENT']}>
                  <StudentDashboard />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/student/attendance"
              element={
                <RoleProtectedRoute allowedRoles={['STUDENT']}>
                  <StudentAttendance />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/student/disputes"
              element={
                <RoleProtectedRoute allowedRoles={['STUDENT']}>
                  <StudentDisputes />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/student/notifications"
              element={
                <RoleProtectedRoute allowedRoles={['STUDENT']}>
                  <NotificationsPage />
                </RoleProtectedRoute>
              }
            />

            {/* Teacher Routes */}
            <Route
              path="/teacher"
              element={
                <RoleProtectedRoute allowedRoles={['TEACHER']}>
                  <TeacherDashboard />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/teacher/attendance"
              element={
                <RoleProtectedRoute allowedRoles={['TEACHER']}>
                  <TeacherAttendance />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/teacher/disputes"
              element={
                <RoleProtectedRoute allowedRoles={['TEACHER']}>
                  <TeacherDisputes />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/teacher/notifications"
              element={
                <RoleProtectedRoute allowedRoles={['TEACHER']}>
                  <NotificationsPage />
                </RoleProtectedRoute>
              }
            />

            {/* HOD Routes */}
            <Route
              path="/hod"
              element={
                <RoleProtectedRoute allowedRoles={['HOD']}>
                  <HodDashboard />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/hod/disputes"
              element={
                <RoleProtectedRoute allowedRoles={['HOD']}>
                  <HodDisputes />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/hod/notifications"
              element={
                <RoleProtectedRoute allowedRoles={['HOD']}>
                  <NotificationsPage />
                </RoleProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN']}>
                  <UserManager />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/courses"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN']}>
                  <CourseManager />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/departments"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN']}>
                  <DepartmentManager />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/correction-windows"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN']}>
                  <CorrectionWindowManager />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/disputes"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN']}>
                  <DisputeMonitor />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN']}>
                  <AuditLogViewer />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/email-outbox"
              element={
                <RoleProtectedRoute allowedRoles={['ADMIN']}>
                  <EmailOutboxViewer />
                </RoleProtectedRoute>
              }
            />
          </Route>

          {/* Fallback Route Handling */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
