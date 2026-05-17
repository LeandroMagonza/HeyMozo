import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaBuilding, FaSignOutAlt, FaUser } from 'react-icons/fa';
import authService from '../services/authService';
import './AdminShell.css';

const AdminShell = ({ children }) => {
  const currentUser = authService.getCurrentUser();

  const handleLogout = () => {
    if (window.confirm('¿Está seguro que desea cerrar sesión?')) {
      authService.logout();
    }
  };

  return (
    <div className="admin-shell">
      <aside className="admin-shell__sidebar">
        <div className="admin-shell__brand">
          <span className="admin-shell__brand-name">HeyMozo</span>
          <span className="admin-shell__brand-role">Config</span>
        </div>

        <nav className="admin-shell__nav">
          <NavLink
            to="/config"
            end
            className={({ isActive }) =>
              `admin-shell__nav-item${isActive ? ' admin-shell__nav-item--active' : ''}`
            }
          >
            <FaBuilding className="admin-shell__nav-icon" />
            <span>Empresas</span>
          </NavLink>
        </nav>

        <div className="admin-shell__footer">
          {currentUser && (
            <>
              <div className="admin-shell__user">
                <FaUser className="admin-shell__user-icon" />
                <span className="admin-shell__user-email">{currentUser.email}</span>
              </div>
              <button className="admin-shell__logout" onClick={handleLogout}>
                <FaSignOutAlt />
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </aside>

      <div className="admin-shell__content">
        {children}
      </div>
    </div>
  );
};

export default AdminShell;
