import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSignOutAlt, FaUser } from 'react-icons/fa';
import authService from '../services/authService';
import './AdminHeader.css';

const AdminHeader = ({ title, showBackButton = false, backUrl = '/' }) => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  const handleLogout = () => {
    const confirmed = window.confirm('¿Está seguro que desea cerrar sesión?');
    if (confirmed) {
      authService.logout();
      // No need to navigate manually as authService.logout() redirects to '/'
    }
  };

  const handleBackClick = () => {
    navigate(backUrl);
  };

  return (
    <div className="admin-header">
      <div className="admin-header-left">
        {showBackButton && (
          <button 
            className="back-button"
            onClick={handleBackClick}
            title="Volver"
          >
            ← Volver
          </button>
        )}
        <h1 className="admin-header-title">{title}</h1>
      </div>
      
      <div className="admin-header-right">
        {currentUser && (
          <div className="user-info">
            <div className="user-details">
              <FaUser className="user-icon" />
              <div className="user-text">
                <span className="user-email">{currentUser.email}</span>
                {currentUser.isAdmin && (
                  <span className="admin-badge">Administrador</span>
                )}
              </div>
            </div>
            <button 
              className="logout-button"
              onClick={handleLogout}
              title="Cerrar sesión"
            >
              <FaSignOutAlt />
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHeader; 