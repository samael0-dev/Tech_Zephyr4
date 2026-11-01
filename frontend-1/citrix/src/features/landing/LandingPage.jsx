import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { getDashboardForRole } from '@/components/auth/RoleGuard';
import { renderLandingView } from './LandingView';

export default function LandingPage() {
  const mountRef = useRef(null);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Handler for clicking "Explore Workspace"
    window.__citrixOnEnterWorkspace = () => {
      if (isAuthenticated && user?.role) {
        navigate(getDashboardForRole(user.role));
      } else {
        navigate('/login');
      }
    };

    let cleanup = null;
    if (mountRef.current) {
      cleanup = renderLandingView(mountRef.current);
    }

    return () => {
      delete window.__citrixOnEnterWorkspace;
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [navigate, isAuthenticated, user]);

  return <div ref={mountRef} className="w-full min-h-screen" />;
}
