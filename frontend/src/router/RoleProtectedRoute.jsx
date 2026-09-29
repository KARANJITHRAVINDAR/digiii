import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const RoleProtectedRoute = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Validating role permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect user to their appropriate role home page
    const roleRoutes = {
      STUDENT: '/student',
      TEACHER: '/teacher',
      HOD: '/hod',
      ADMIN: '/admin',
    };
    return <Navigate to={roleRoutes[user.role] || '/login'} replace />;
  }

  return children;
};
