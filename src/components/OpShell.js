import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { FaStore, FaSignOutAlt, FaUser } from 'react-icons/fa';
import authService from '../services/authService';
import './OpShell.css';

const OpShell = () => {
  const { branchId } = useParams();
  const currentUser = authService.getCurrentUser();

  const handleLogout = () => {
    if (window.confirm('¿Está seguro que desea cerrar sesión?')) {
      authService.logout();
    }
  };

  return (
    <div className="op-shell">
      <aside className="op-shell__sidebar">
        <div className="op-shell__brand">
          <span className="op-shell__brand-name">HeyMozo</span>
          <span className="op-shell__brand-role">Piso</span>
        </div>

        <nav className="op-shell__nav">
          <NavLink
            to={`/piso/${branchId}`}
            end
            className={({ isActive }) =>
              `op-shell__nav-item${isActive ? ' op-shell__nav-item--active' : ''}`
            }
          >
            <FaStore className="op-shell__nav-icon" />
            <span>Panel del piso</span>
          </NavLink>
        </nav>

        <div className="op-shell__footer">
          {currentUser && (
            <>
              <div className="op-shell__user">
                <FaUser className="op-shell__user-icon" />
                <span className="op-shell__user-email">{currentUser.email}</span>
              </div>
              <button className="op-shell__logout" onClick={handleLogout}>
                <FaSignOutAlt />
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </aside>

      <main className="op-shell__main">
        <header className="op-shell__topnav">
          <h1 className="op-shell__topnav-title">Panel del Piso</h1>
        </header>
        <div className="op-shell__content">
          <div className="op-shell__placeholder">
            <p className="op-shell__placeholder-title">Dashboard del mozo</p>
            <p className="op-shell__placeholder-desc">
              Esta pantalla mostrará el panel operativo del piso (sucursal {branchId}).
              Disponible en el próximo sprint.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OpShell;
