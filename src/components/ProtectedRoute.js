import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import './ProtectedRoute.css';

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessInfo, setAccessInfo] = useState(null);
  const location = useLocation();

  useEffect(() => {
    checkAccess();
  }, [location.pathname]);

  const checkAccess = async () => {
    setLoading(true);

    // First check if user is authenticated
    if (!authService.isAuthenticated()) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    // Routes accessible to any authenticated user without extra permission check.
    const FREE_PATHS = [
      '/admin/config',
      '/admin/company/create',
      '/config',
      '/config/company/create',
      '/profile',
    ];
    if (FREE_PATHS.includes(location.pathname)) {
      setHasAccess(true);
      setAccessInfo({
        hasAccess: true,
        reason: 'Company list and company creation are accessible to all authenticated users'
      });
      setLoading(false);
      return;
    }

    // For other routes, check specific permission with backend
    try {
      // Check specific route permission with backend
      const response = await authService.canAccessRoute(location.pathname);
      setHasAccess(response.hasAccess);
      setAccessInfo(response);
    } catch (error) {
      console.error('Error checking route access:', error);
      setHasAccess(false);
      setAccessInfo({ 
        hasAccess: false, 
        reason: 'Error verificando permisos' 
      });
    }

    setLoading(false);
  };

  const refreshUserData = async () => {
    try {
      await authService.getCurrentUserFromAPI();
      checkAccess(); // Re-check after refreshing data
    } catch (error) {
      console.error('Error refreshing user data:', error);
      // If refresh fails, user might not be authenticated anymore
      authService.logout();
    }
  };

  if (loading) {
    return (
      <div className="protected-route-loading">
        <div className="loading-spinner"></div>
        <p>Verificando permisos...</p>
      </div>
    );
  }

  // If not authenticated, redirect to login form
  if (!authService.isAuthenticated()) {
    return (
      <Navigate 
        to="/admin/login" 
        state={{ from: location }}
        replace 
      />
    );
  }

  // If authenticated but doesn't have permission, show access denied
  if (!hasAccess) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <div className="access-denied-icon">🚫</div>
          <h2>Acceso Denegado</h2>
          <p>
            {accessInfo?.reason || 'No tienes permisos para acceder a esta página.'}
          </p>
          
          <div className="access-denied-actions">
            <button 
              onClick={refreshUserData}
              className="refresh-button"
            >
              Actualizar Permisos
            </button>
            <button 
              onClick={() => window.history.back()}
              className="back-button"
            >
              Volver Atrás
            </button>
            <button 
              onClick={authService.logout}
              className="logout-button"
            >
              Cerrar Sesión
            </button>
          </div>

          {accessInfo?.user && (
            <div className="user-context">
              <p className="user-info">
                Conectado como: <strong>{accessInfo.user.email}</strong>
                {accessInfo.user.isAdmin && <span className="admin-indicator"> (Admin)</span>}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // If authenticated and has permission, render the children
  return children;
};

export default ProtectedRoute; 