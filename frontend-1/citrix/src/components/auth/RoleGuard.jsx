// src/components/auth/RoleGuard.jsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

// Helper to determine default home dashboard for any role
export function getDashboardForRole(role) {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'coordinator':
    case 'department_coordinator':
      return '/coordinator';
    case 'faculty':
      return '/faculty';
    case 'club':
      return '/club';
    case 'student':
      return '/student';
    default:
      return '/login';
  }
}

const RoleLoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[50vh] bg-[#0B1120]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-slate-700 border-t-cyan-500 animate-spin" />
      <p className="text-slate-400 text-xs tracking-wider uppercase font-semibold">
        Verifying Role Authorizations…
      </p>
    </div>
  </div>
);

/**
 * RoleGuard: Enforces client-side role-based access control.
 *
 * @param {Object} props
 * @param {string[]} props.allowedRoles - Array of roles permitted to view this route.
 * @param {string} [props.redirectTo] - Custom route to redirect unauthorized users.
 * @param {React.ReactNode} [props.children] - Optional child components. If omitted, renders <Outlet />.
 */
export default function RoleGuard({ allowedRoles, redirectTo, children }) {
  const { user, isAuthenticated, loading } = useAuthStore();
  const location = useLocation();

  // 1. Loading state - do not mount protected component before role resolution
  if (loading) {
    return <RoleLoadingSpinner />;
  }

  // 2. Unauthenticated check - redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Normalize role
  const userRole = user.role === 'department_coordinator' ? 'coordinator' : user.role;

  // 4. Role Authorization check
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    const destination = redirectTo || getDashboardForRole(userRole);
    return <Navigate to={destination} replace />;
  }

  // 5. Authorized - render children or outlet
  return children ? children : <Outlet />;
}
